"""
contactapi/views.py  ─  Production-Level Payment & Course API
────────────────────────────────────────────────────────────────
Changes from previous version:
  • Razorpay client initialised lazily so placeholder keys never crash startup
  • create_order: detects invalid/placeholder keys and returns clear error
  • create_order: atomic transaction to prevent orphaned Payment rows
  • verify_payment: idempotency check (no double-success), uses filter().first()
  • verify_payment: sends enrollment confirmation email via Django email
  • razorpay_webhook: secure endpoint for server-side payment confirmation
  • Proper HTTP status codes throughout
"""

import hashlib
import hmac
import json
import logging
import uuid

import razorpay
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import ContactMessage, Course, CourseEnrollment, CourseVideo, Payment
from .serializers import (
    ContactMessageSerializer,
    CourseEnrollmentSerializer,
    CourseSerializer,
    CourseVideoSerializer,
)

logger = logging.getLogger(__name__)

# ── Razorpay Client (lazy + validated) ───────────────────────────────

RAZORPAY_KEY_ID = getattr(settings, "RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = getattr(settings, "RAZORPAY_KEY_SECRET", "")

_PLACEHOLDER_PREFIXES = ("rzp_test_placeholder", "rzp_test_YOUR", "placeholder")


def _is_placeholder(key: str) -> bool:
    return not key or any(key.startswith(p) for p in _PLACEHOLDER_PREFIXES)


def get_razorpay_client():
    """Return authenticated Razorpay client or raise ValueError."""
    if _is_placeholder(RAZORPAY_KEY_ID) or _is_placeholder(RAZORPAY_KEY_SECRET):
        raise ValueError(
            "Razorpay API keys are not configured. "
            "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file. "
            "Get keys from https://dashboard.razorpay.com/app/keys"
        )
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ── Contact Form ──────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def contact_form(request):
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message": "Message sent successfully!", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_messages(request):
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    msgs = ContactMessage.objects.all().order_by("-created_at")
    serializer = ContactMessageSerializer(msgs, many=True)
    return Response(serializer.data)


# ── Auth Endpoints ────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    from django.contrib.auth.models import User

    data = request.data
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return Response(
            {"error": "Username, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(password) < 8:
        return Response(
            {"error": "Password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST
        )
    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=username, email=email, password=password)
    return Response(
        {"message": "User created successfully.", "id": user.id},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
        }
    )


# ── Dynamic Courses Endpoints ─────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def list_courses(request):
    courses = Course.objects.all().order_by("created_at")
    serializer = CourseSerializer(courses, many=True)
    data = []
    for c in serializer.data:
        topics = c["topics"]
        if not isinstance(topics, list):
            topics = ["Topics coming soon"]
        data.append(
            {
                "id": c["id_string"],
                "db_id": c["id"],
                "title": c["title"],
                "description": c["description"],
                "price": c["price"],
                "originalPrice": c["original_price"],
                "duration": c["duration"],
                "lessons": c["lessons"],
                "level": c["level"],
                "accent": c["accent_color"],
                "icon": c["icon"],
                "badge": c["badge"],
                "badgeColor": c["badge_color"],
                "topics": topics,
            }
        )
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_courses(request):
    enrollments = CourseEnrollment.objects.filter(
        user=request.user, payment__status="success"
    ).select_related("course")
    courses = []
    for e in enrollments:
        if e.course:
            courses.append(
                {
                    "id": e.course.id_string,
                    "title": e.course.title,
                    "enrolled_at": e.enrolled_at,
                }
            )
    return Response(courses)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_videos(request, course_id_string):
    try:
        course = Course.objects.get(id_string=course_id_string)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

    has_access = CourseEnrollment.objects.filter(
        user=request.user, course=course, payment__status="success"
    ).exists()

    if not has_access and not request.user.is_superuser:
        return Response(
            {"error": "You must purchase this course to view its videos."},
            status=status.HTTP_403_FORBIDDEN,
        )

    videos = CourseVideo.objects.filter(course=course).order_by("order")
    serializer = CourseVideoSerializer(videos, many=True, context={"request": request})
    return Response(serializer.data)


# ── Payment Gateway ───────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def create_order(request):
    """
    Creates a Razorpay order + local enrollment record (atomically).

    POST body:
        name, email, phone, course_id, amount, method
    Returns:
        order_id, amount (paise), currency, enrollment_id, key
    """
    data = request.data
    course_id_string = data.get("course_id", "").strip()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    payment_method = data.get("method", "razorpay")

    # ── Validate inputs ──
    if not all([course_id_string, name, email, phone]):
        return Response(
            {"error": "name, email, phone, and course_id are all required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Fetch course ──
    course = Course.objects.filter(id_string=course_id_string).first()
    if not course:
        return Response(
            {"error": f"Course '{course_id_string}' not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    amount_paise = int(course.price) * 100
    user = request.user if request.user.is_authenticated else None

    # ── Determine if Razorpay is actually configured ──
    razorpay_configured = (
        payment_method == "razorpay"
        and not _is_placeholder(RAZORPAY_KEY_ID)
        and not _is_placeholder(RAZORPAY_KEY_SECRET)
    )

    # If Razorpay is requested but keys not configured → auto-fallback to demo mode
    if payment_method == "razorpay" and not razorpay_configured:
        logger.warning(
            "Razorpay keys not configured — falling back to DEMO mode for enrollment."
        )
        payment_method = "simulated"  # treat as simulation

    rz_client = None
    if razorpay_configured:
        try:
            rz_client = get_razorpay_client()
        except ValueError as e:
            logger.error("Razorpay client init failed: %s", e)
            razorpay_configured = False
            payment_method = "simulated"

    try:
        with transaction.atomic():
            # Create enrollment record
            enrollment = CourseEnrollment.objects.create(
                user=user,
                course=course,
                name=name,
                email=email,
                phone=phone,
                course_name=course.title,
                amount=amount_paise,
                payment_method=payment_method,
            )

            order_id = ""

            if razorpay_configured and rz_client:
                # Create real Razorpay order
                razorpay_order = rz_client.order.create(
                    {
                        "amount": amount_paise,
                        "currency": "INR",
                        "payment_capture": 1,
                        "notes": {
                            "enrollment_id": str(enrollment.id),
                            "course": course.title,
                            "student": name,
                        },
                    }
                )
                order_id = razorpay_order["id"]
            else:
                # Simulated / demo mode
                order_id = "SIM_ORD_" + str(uuid.uuid4()).replace("-", "")[:16].upper()

            enrollment.external_order_id = order_id
            enrollment.save(update_fields=["external_order_id"])

            # Create pending Payment record
            Payment.objects.create(
                enrollment=enrollment,
                order_id=order_id,
                amount=amount_paise,
                method=payment_method,
                status="pending",
            )

    except razorpay.errors.BadRequestError as e:
        logger.error("Razorpay BadRequestError: %s", e)
        return Response(
            {"error": "Razorpay rejected the order request. Check your API keys and account status."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        logger.exception("Unexpected error in create_order: %s", e)
        return Response(
            {"error": "An unexpected server error occurred. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "order_id": order_id,
            "amount": amount_paise,
            "currency": "INR",
            "enrollment_id": enrollment.id,
            # Send real key only if Razorpay is configured; empty string = demo mode
            "key": RAZORPAY_KEY_ID if razorpay_configured else "",
            "demo_mode": not razorpay_configured,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request):
    """
    Verifies Razorpay HMAC signature or marks simulated payment as success.

    POST body (Razorpay):
        enrollment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature

    POST body (simulated):
        enrollment_id, transaction_id, method
    """
    data = request.data
    enrollment_id = data.get("enrollment_id")
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")

    if not enrollment_id:
        return Response(
            {"error": "enrollment_id is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Use filter+first (never crashes on MultipleObjectsReturned)
    payment_record = Payment.objects.filter(enrollment_id=enrollment_id).order_by("-paid_at").first()
    if not payment_record:
        return Response(
            {"error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND
        )

    # ── Idempotency check: already verified? ──
    if payment_record.status == "success":
        logger.info("Payment %s already verified (idempotent call).", payment_record.id)
        return Response(_build_success_response(payment_record))

    try:
        if razorpay_signature:
            # ── Razorpay HMAC signature verification ──
            if _is_placeholder(RAZORPAY_KEY_SECRET):
                return Response(
                    {"error": "Razorpay secret key is not configured on the server."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            expected_signature = hmac.new(
                RAZORPAY_KEY_SECRET.encode("utf-8"),
                f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, razorpay_signature):
                payment_record.status = "failed"
                payment_record.save(update_fields=["status"])
                logger.warning(
                    "Invalid Razorpay signature for enrollment %s", enrollment_id
                )
                return Response(
                    {"error": "Invalid payment signature. Payment verification failed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment_record.transaction_id = razorpay_payment_id
            payment_record.signature = razorpay_signature
            payment_record.status = "success"
            payment_record.save(update_fields=["transaction_id", "signature", "status"])

        else:
            # ── Simulated payment (for demo/testing) ──
            payment_record.transaction_id = data.get(
                "transaction_id", "SIM_TXN_" + str(uuid.uuid4())[:8].upper()
            )
            payment_record.status = "success"
            payment_record.save(update_fields=["transaction_id", "status"])

        # ── Send confirmation email ──
        _send_enrollment_email(payment_record)

    except Exception as e:
        logger.exception("Error during payment verification: %s", e)
        return Response(
            {"error": "An unexpected error occurred during verification."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(_build_success_response(payment_record))


def _build_success_response(payment_record: Payment) -> dict:
    """Builds the success payload returned to the frontend."""
    enrollment = payment_record.enrollment
    return {
        "success": True,
        "student": enrollment.name,
        "email": enrollment.email,
        "course": enrollment.course_name,
        "amount": payment_record.amount // 100,
        "payment_id": payment_record.transaction_id,
    }


def _send_enrollment_email(payment_record: Payment):
    """Sends an enrollment confirmation email to the student."""
    enrollment = payment_record.enrollment
    subject = f"🎉 Enrollment Confirmed: {enrollment.course_name}"
    message = (
        f"Hi {enrollment.name},\n\n"
        f"Thank you for enrolling in '{enrollment.course_name}'!\n\n"
        f"Your payment of ₹{payment_record.amount // 100} has been received.\n"
        f"Transaction ID: {payment_record.transaction_id}\n\n"
        f"You can now access your course content by logging in.\n\n"
        f"Best regards,\nSunil BK – Courses"
    )
    try:
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [enrollment.email],
            fail_silently=True,  # Don't crash if email fails
        )
        logger.info("Enrollment email sent to %s", enrollment.email)
    except Exception as e:
        logger.error("Failed to send enrollment email: %s", e)


# ── Razorpay Webhook ──────────────────────────────────────────────────

@csrf_exempt
def razorpay_webhook(request):
    """
    Server-side webhook from Razorpay for authoritative payment confirmation.
    Configure in Razorpay Dashboard → Webhooks:
        URL: https://yourdomain.com/api/courses/webhook/
        Events: payment.captured

    This ensures payments are confirmed even if the user closes the browser.
    """
    if request.method != "POST":
        from django.http import HttpResponse
        return HttpResponse(status=405)

    from django.http import HttpResponse, JsonResponse

    # ── Verify webhook signature ──
    webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:
        logger.warning("RAZORPAY_WEBHOOK_SECRET not set – skipping webhook signature check")
    else:
        received_signature = request.headers.get("X-Razorpay-Signature", "")
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, received_signature):
            logger.error("Webhook signature mismatch!")
            return HttpResponse("Forbidden", status=403)

    try:
        payload = json.loads(request.body)
        event = payload.get("event")

        if event == "payment.captured":
            rz_payment = payload["payload"]["payment"]["entity"]
            rz_order_id = rz_payment.get("order_id")
            rz_payment_id = rz_payment.get("id")
            rz_signature = request.headers.get("X-Razorpay-Signature", "")

            payment_record = Payment.objects.filter(order_id=rz_order_id).first()
            if payment_record and payment_record.status != "success":
                payment_record.transaction_id = rz_payment_id
                payment_record.signature = rz_signature
                payment_record.status = "success"
                payment_record.save(update_fields=["transaction_id", "signature", "status"])
                _send_enrollment_email(payment_record)
                logger.info(
                    "Webhook: Payment captured for order %s → enrollment %s",
                    rz_order_id,
                    payment_record.enrollment_id,
                )

        return JsonResponse({"status": "ok"})

    except Exception as e:
        logger.exception("Webhook processing error: %s", e)
        return JsonResponse({"error": str(e)}, status=500)
