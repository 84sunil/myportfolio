from rest_framework import serializers
from .models import ContactMessage, Course, CourseVideo, CourseEnrollment, Payment, Certificate, CourseProgress

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'created_at']

class CourseVideoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = CourseVideo
        fields = ['id', 'title', 'url', 'order']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.video_file and request:
            return request.build_absolute_uri(obj.video_file.url)
        return None

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'id', 'id_string', 'title', 'description', 'price', 'original_price',
            'duration', 'lessons', 'level', 'accent_color', 'icon', 'badge',
            'badge_color', 'topics', 'created_at'
        ]

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseEnrollment
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class CourseProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = CourseProgress
        fields = ['id', 'user', 'course', 'course_title', 'videos_watched', 'completion_percentage', 'last_watched_at']

class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Certificate
        fields = [
            'id', 'certificate_id', 'user', 'username', 'course', 'course_title',
            'issued_at', 'completion_date', 'signed_by', 'instructor_title'
        ]
        read_only_fields = ['issued_at']

