"""
contactapi/views.py  ─  Production-Level Payment & Course API
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

from .models import ContactMessage, Course, CourseEnrollment, CourseVideo, Payment, Certificate, CourseProgress
from .serializers import (
    ContactMessageSerializer,
    CourseEnrollmentSerializer,
    CourseSerializer,
    CourseVideoSerializer,
    CertificateSerializer,
    CourseProgressSerializer,
)

logger = logging.getLogger(__name__)

RAZORPAY_KEY_ID = getattr(settings, "RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = getattr(settings, "RAZORPAY_KEY_SECRET", "")
_PLACEHOLDER_PREFIXES = ("rzp_test_placeholder", "rzp_test_YOUR", "placeholder", "YOUR_")


def _is_placeholder(key: str) -> bool:
    return not key or any(key.startswith(p) for p in _PLACEHOLDER_PREFIXES)


def get_razorpay_client():
    if _is_placeholder(RAZORPAY_KEY_ID) or _is_placeholder(RAZORPAY_KEY_SECRET):
        raise ValueError("Razorpay API keys are not configured.")
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
        return Response({"error": "Username, email, and password are required."}, status=400)
    if len(password) < 8:
        return Response({"error": "Password must be at least 8 characters."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists."}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already registered."}, status=400)
    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({"message": "User created successfully.", "id": user.id}, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({"id": request.user.id, "username": request.user.username, "email": request.user.email})


# ── Courses Endpoints ─────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def list_courses(request):
    courses = Course.objects.all().order_by("created_at")
    serializer = CourseSerializer(courses, many=True)
    data = []
    for c in serializer.data:
        topics = c["topics"] if isinstance(c["topics"], list) else ["Topics coming soon"]
        data.append({
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
        })
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
            courses.append({"id": e.course.id_string, "title": e.course.title, "enrolled_at": e.enrolled_at})
    return Response(courses)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_videos(request, course_id_string):
    try:
        course = Course.objects.get(id_string=course_id_string)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    has_access = CourseEnrollment.objects.filter(
        user=request.user, course=course, payment__status="success"
    ).exists()
    if not has_access and not request.user.is_superuser:
        return Response({"error": "You must purchase this course to view its videos."}, status=403)
    videos = CourseVideo.objects.filter(course=course).order_by("order")
    serializer = CourseVideoSerializer(videos, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def course_content(request, course_id_string):
    """
    Returns course content for enrolled students.
    Guest access: pass ?enrollment_id=<id> in query params.
    Authenticated users: access checked via JWT token.
    """
    enrollment_id = request.GET.get("enrollment_id")

    try:
        course = Course.objects.get(id_string=course_id_string)
    except Course.DoesNotExist:
        return Response({"error": "Course not found."}, status=404)

    has_access = False

    # Check guest access via enrollment_id
    if enrollment_id:
        has_access = Payment.objects.filter(
            enrollment_id=enrollment_id,
            enrollment__course=course,
            status="success",
        ).exists()

    # Check authenticated user access
    if not has_access and request.user.is_authenticated:
        has_access = (
            CourseEnrollment.objects.filter(
                user=request.user, course=course, payment__status="success"
            ).exists()
            or request.user.is_superuser
        )

    if not has_access:
        return Response({"error": "Enrollment required to access this course."}, status=403)

    # Return course content
    videos = CourseVideo.objects.filter(course=course).order_by("order")
    video_data = []
    for v in videos:
        video_url = None
        if v.video_file:
            try:
                video_url = request.build_absolute_uri(v.video_file.url)
            except Exception:
                pass
        video_data.append({
            "id": v.id,
            "title": v.title,
            "url": video_url,
            "order": v.order,
        })

    return Response({
        "title": course.title,
        "description": course.description,
        "topics": course.topics if isinstance(course.topics, list) else [],
        "videos": video_data,
        "duration": course.duration,
        "lessons": course.lessons,
        "level": course.level,
        "icon": course.icon,
        "accent": course.accent_color,
    })


# ── Payment Gateway ───────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def create_order(request):
    data = request.data
    course_id_string = data.get("course_id", "").strip()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    payment_method = data.get("method", "upi")

    if not all([course_id_string, name, email, phone]):
        return Response({"error": "name, email, phone, and course_id are all required."}, status=400)

    course = Course.objects.filter(id_string=course_id_string).first()
    if not course:
        return Response({"error": f"Course '{course_id_string}' not found."}, status=404)

    amount_paise = int(course.price) * 100
    user = request.user if request.user.is_authenticated else None

    # All supported methods run as simulated (no real gateway needed)
    try:
        with transaction.atomic():
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
            order_id = "ORD_" + str(uuid.uuid4()).replace("-", "")[:16].upper()
            enrollment.external_order_id = order_id
            enrollment.save(update_fields=["external_order_id"])

            Payment.objects.create(
                enrollment=enrollment,
                order_id=order_id,
                amount=amount_paise,
                method=payment_method,
                status="pending",
            )

    except Exception as e:
        logger.exception("Unexpected error in create_order: %s", e)
        return Response({"error": "An unexpected server error occurred."}, status=500)

    return Response({
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "enrollment_id": enrollment.id,
        "course_id": course_id_string,
    }, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request):
    data = request.data
    enrollment_id = data.get("enrollment_id")

    if not enrollment_id:
        return Response({"error": "enrollment_id is required."}, status=400)

    payment_record = Payment.objects.filter(enrollment_id=enrollment_id).order_by("-paid_at").first()
    if not payment_record:
        return Response({"error": "Payment record not found."}, status=404)

    if payment_record.enrollment.user:
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required to verify this payment."}, status=401)
        if payment_record.enrollment.user != request.user:
            return Response({"error": "You are not authorized to verify this payment."}, status=403)

    if payment_record.status == "success":
        return Response(_build_success_response(payment_record))

    transaction_id = data.get("transaction_id")
    if not transaction_id:
        return Response({"error": "transaction_id is required."}, status=400)

    try:
        payment_record.transaction_id = transaction_id
        payment_record.status = "success"
        payment_record.save(update_fields=["transaction_id", "status"])
        _send_enrollment_email(payment_record)
    except Exception as e:
        logger.exception("Error during payment verification: %s", e)
        return Response({"error": "An unexpected error occurred during verification."}, status=500)

    return Response(_build_success_response(payment_record))


def _build_success_response(payment_record: Payment) -> dict:
    enrollment = payment_record.enrollment
    return {
        "success": True,
        "student": enrollment.name,
        "email": enrollment.email,
        "course": enrollment.course_name,
        "course_id": enrollment.course.id_string if enrollment.course else "",
        "amount": payment_record.amount // 100,
        "payment_id": payment_record.transaction_id,
        "enrollment_id": enrollment.id,
    }


def _send_enrollment_email(payment_record: Payment):
    enrollment = payment_record.enrollment
    subject = f"🎉 Enrollment Confirmed: {enrollment.course_name}"
    message = (
        f"Hi {enrollment.name},\n\n"
        f"Thank you for enrolling in '{enrollment.course_name}'!\n\n"
        f"Your payment of ₹{payment_record.amount // 100} has been received.\n"
        f"Transaction ID: {payment_record.transaction_id}\n"
        f"Enrollment ID: {enrollment.id}\n\n"
        f"You can now access your course content.\n\n"
        f"Best regards,\nSunil BK – Courses"
    )
    try:
        send_mail(subject, message, settings.EMAIL_HOST_USER, [enrollment.email], fail_silently=True)
    except Exception as e:
        logger.error("Failed to send enrollment email: %s", e)


# ── Webhook (backup for future Razorpay) ─────────────────────────────

@csrf_exempt
def razorpay_webhook(request):
    if request.method != "POST":
        from django.http import HttpResponse
        return HttpResponse(status=405)
    from django.http import JsonResponse
    return JsonResponse({"status": "ok"})


# ── Course Progress & Certificates ───────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_video_completion(request):
    """
    Track when a user watches a video.
    Body: { "course_id": 1, "video_id": 1 }
    """
    data = request.data
    course_id = data.get("course_id")
    video_id = data.get("video_id")
    
    if not course_id or not video_id:
        return Response({"error": "course_id and video_id are required."}, status=400)
    
    try:
        course = Course.objects.get(id=course_id)
        video = CourseVideo.objects.get(id=video_id, course=course)
        
        # Check if user has access to this course
        has_access = CourseEnrollment.objects.filter(
            user=request.user, course=course, payment__status="success"
        ).exists() or request.user.is_superuser
        
        if not has_access:
            return Response({"error": "You don't have access to this course."}, status=403)
        
        # Update or create progress record
        progress, created = CourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        
        # Add video to watched list if not already there
        if video_id not in progress.videos_watched:
            progress.videos_watched.append(video_id)
            progress.update_completion()
        
        serializer = CourseProgressSerializer(progress)
        return Response(serializer.data)
    
    except Course.DoesNotExist:
        return Response({"error": "Course not found."}, status=404)
    except CourseVideo.DoesNotExist:
        return Response({"error": "Video not found."}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_course_progress(request, course_id):
    """Get user's progress for a specific course."""
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found."}, status=404)
    
    # Check if user has access
    has_access = CourseEnrollment.objects.filter(
        user=request.user, course=course, payment__status="success"
    ).exists() or request.user.is_superuser
    
    if not has_access:
        return Response({"error": "You don't have access to this course."}, status=403)
    
    progress, created = CourseProgress.objects.get_or_create(
        user=request.user,
        course=course
    )
    
    serializer = CourseProgressSerializer(progress)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_certificate(request):
    """
    Generate a certificate for a completed course.
    Body: { "course_id": 1 }
    """
    data = request.data
    course_id = data.get("course_id")
    
    if not course_id:
        return Response({"error": "course_id is required."}, status=400)
    
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found."}, status=404)
    
    # Check if user has completed the course
    progress = CourseProgress.objects.filter(
        user=request.user,
        course=course
    ).first()
    
    if not progress or progress.completion_percentage < 100:
        return Response({
            "error": "You must complete all course videos before getting a certificate.",
            "completion": progress.completion_percentage if progress else 0
        }, status=400)
    
    # Check if enrollment exists
    enrollment = CourseEnrollment.objects.filter(
        user=request.user,
        course=course,
        payment__status="success"
    ).first()
    
    if not enrollment:
        return Response({"error": "No valid enrollment found for this course."}, status=403)
    
    # Generate or get existing certificate
    cert, created = Certificate.objects.get_or_create(
        user=request.user,
        course=course,
        defaults={
            'enrollment': enrollment,
            'certificate_id': f"CER-{request.user.id}-{course.id}-{uuid.uuid4().hex[:8].upper()}",
            'signed_by': 'Sunil Kumar',
            'instructor_title': 'Founder & Instructor'
        }
    )
    
    serializer = CertificateSerializer(cert)
    return Response({
        "success": True,
        "message": "Certificate generated successfully!",
        "certificate": serializer.data
    }, status=201 if created else 200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_certificates(request):
    """Get all certificates earned by the authenticated user."""
    certificates = Certificate.objects.filter(user=request.user).order_by('-issued_at')
    serializer = CertificateSerializer(certificates, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_certificate(request, certificate_id):
    """Get a specific certificate by ID."""
    try:
        cert = Certificate.objects.get(id=certificate_id)
        
        # Check if user is the certificate owner or admin
        if cert.user != request.user and not request.user.is_staff:
            return Response({"error": "You don't have permission to view this certificate."}, status=403)
        
        serializer = CertificateSerializer(cert)
        return Response(serializer.data)
    
    except Certificate.DoesNotExist:
        return Response({"error": "Certificate not found."}, status=404)

