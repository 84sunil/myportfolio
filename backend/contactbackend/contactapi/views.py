import razorpay
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import ContactMessage, Course, CourseEnrollment, Payment, CourseVideo
from .serializers import (
    ContactMessageSerializer, CourseSerializer, 
    CourseVideoSerializer, CourseEnrollmentSerializer
)
import uuid

# Initialize Razorpay client
# Keys should be in settings.py or .env
RAZORPAY_KEY_ID = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_placeholder')
RAZORPAY_KEY_SECRET = getattr(settings, 'RAZORPAY_KEY_SECRET', 'placeholder_secret')

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@api_view(['POST'])
@permission_classes([AllowAny])
def contact_form(request):
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Message sent successfully!', 'data': serializer.data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_messages(request):
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    msgs = ContactMessage.objects.all().order_by('-created_at')
    serializer = ContactMessageSerializer(msgs, many=True)
    return Response(serializer.data)


# ── Auth Endpoints ───────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    from django.contrib.auth.models import User
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return Response({'error': 'Username, email, and password required.'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({'message': 'User created successfully.', 'id': user.id}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email
    })

# ── Dynamic Courses Endpoints ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def list_courses(request):
    courses = Course.objects.all().order_by('created_at')
    serializer = CourseSerializer(courses, many=True)
    # Map backend names to frontend expected names if they differ
    data = []
    for c in serializer.data:
        data.append({
            'id': c['id_string'],
            'db_id': c['id'],
            'title': c['title'],
            'description': c['description'],
            'price': c['price'],
            'originalPrice': c['original_price'],
            'duration': c['duration'],
            'lessons': c['lessons'],
            'level': c['level'],
            'accent': c['accent_color'],
            'icon': c['icon'],
            'badge': c['badge'],
            'badgeColor': c['badge_color'],
            'topics': c['topics'] if isinstance(c['topics'], list) else ["Topics coming soon"]
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_courses(request):
    # Only return courses with successful payment
    enrollments = CourseEnrollment.objects.filter(
        user=request.user, payment__status='success'
    ).select_related('course')
    
    courses = []
    for e in enrollments:
        if e.course:
            courses.append({
                'id': e.course.id_string,
                'title': e.course.title,
                'enrolled_at': e.enrolled_at,
            })
    return Response(courses)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_videos(request, course_id_string):
    try:
        course = Course.objects.get(id_string=course_id_string)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404)

    # Check access
    has_access = CourseEnrollment.objects.filter(
        user=request.user, 
        course=course, 
        payment__status='success'
    ).exists()

    if not has_access and not request.user.is_superuser:
        return Response({'error': 'You must purchase this course to view its videos.'}, status=403)

    videos = CourseVideo.objects.filter(course=course).order_by('order')
    serializer = CourseVideoSerializer(videos, many=True, context={'request': request})
    return Response(serializer.data)


# ── Payment Gateway (Razorpay Integration) ───────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny]) # Allow guest to start order, user checked inside
def create_order(request):
    """Creates a real Razorpay order or a pending enrollment."""
    data = request.data
    course_id_string = data.get('course_id')
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    payment_method = data.get('method', 'razorpay')
    
    course = Course.objects.filter(id_string=course_id_string).first()
    if not course:
        return Response({'error': 'Course not found'}, status=404)
        
    amount_paise = int(course.price) * 100
    user = request.user if request.user.is_authenticated else None

    # Step 1: Create local enrollment record
    enrollment = CourseEnrollment.objects.create(
        user=user,
        course=course,
        name=name,
        email=email,
        phone=phone,
        course_name=course.title,
        amount=amount_paise,
        payment_method=payment_method
    )

    order_id = ""
    # Step 2: Create Razorpay Order if method is razorpay
    if payment_method == 'razorpay':
        try:
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": "1"
            })
            order_id = razorpay_order['id']
        except Exception as e:
            # Fallback to UUID if Razorpay fails or keys are missing (for dev)
            order_id = "ORD_" + str(uuid.uuid4())[:8]
    else:
        order_id = "ORD_" + str(uuid.uuid4())[:8]

    enrollment.external_order_id = order_id
    enrollment.save()

    Payment.objects.create(
        enrollment=enrollment,
        order_id=order_id,
        amount=amount_paise,
        method=payment_method
    )

    return Response({
        'order_id': order_id,
        'amount': amount_paise, # Send in paise to frontend for Razorpay
        'currency': 'INR',
        'enrollment_id': enrollment.id,
        'key': RAZORPAY_KEY_ID
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_payment(request):
    """Verifies Razorpay signature or simulated payment."""
    data = request.data
    enrollment_id = data.get('enrollment_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')
    
    try:
        payment_record = Payment.objects.get(enrollment_id=enrollment_id)
        
        # Verify Razorpay Signature
        if razorpay_signature:
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            try:
                client.utility.verify_payment_signature(params_dict)
                payment_record.status = 'success'
                payment_record.transaction_id = razorpay_payment_id
                payment_record.signature = razorpay_signature
                payment_record.save()
            except Exception:
                return Response({'error': 'Invalid payment signature'}, status=400)
        else:
            # Simulated or manual success (for testing)
            payment_record.status = 'success'
            payment_record.transaction_id = data.get('transaction_id', 'SIM_TXN_' + str(uuid.uuid4())[:8])
            payment_record.save()

        return Response({
            'success': True,
            'student': payment_record.enrollment.name,
            'email': payment_record.enrollment.email,
            'course': payment_record.enrollment.course_name,
            'amount': payment_record.amount // 100,
            'payment_id': payment_record.transaction_id
        })

    except Payment.DoesNotExist:
        return Response({'error': 'Payment record not found.'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
