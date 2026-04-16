from rest_framework import serializers
from .models import ContactMessage, Course, CourseVideo, CourseEnrollment, Payment

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
