from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Contact
    path('contact/', views.contact_form, name='contact_form'),
    path('messages/', views.get_messages, name='get_messages'),

    # Auth
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', views.register_user, name='register'),
    path('auth/me/', views.me, name='me'),

    # Courses
    path('courses/', views.list_courses, name='list_courses'),
    path('courses/my/', views.my_courses, name='my_courses'),
    path('courses/<str:course_id_string>/videos/', views.course_videos, name='course_videos'),

    # Payment Gateway
    path('courses/create-order/', views.create_order, name='create_order'),
    path('courses/verify-payment/', views.verify_payment, name='verify_payment'),

    # Razorpay Webhook (server-side confirmation – configure in Razorpay Dashboard)
    path('courses/webhook/', views.razorpay_webhook, name='razorpay_webhook'),
]
