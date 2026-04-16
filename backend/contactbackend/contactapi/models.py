from django.db import models
from django.contrib.auth.models import User


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.email}"


class Course(models.Model):
    id_string = models.CharField(max_length=50, unique=True, help_text="e.g. 'python', 'fullstack'")
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.PositiveIntegerField(help_text="Price in INR")
    original_price = models.PositiveIntegerField()
    duration = models.CharField(max_length=50)
    lessons = models.IntegerField()
    level = models.CharField(max_length=50)
    accent_color = models.CharField(max_length=20, default="#00d4ff")
    icon = models.CharField(max_length=50, default="bi-easel2")
    badge = models.CharField(max_length=50, blank=True)
    badge_color = models.CharField(max_length=20, default="#00d4ff")
    topics = models.JSONField(default=list, help_text="List of topic strings")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CourseVideo(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="videos")
    title = models.CharField(max_length=200)
    video_file = models.FileField(upload_to="course_videos/")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class CourseEnrollment(models.Model):
    """Stores user details collected before payment."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="enrollments")
    
    # New FK reference
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    course_name = models.CharField(max_length=150)
    amount = models.PositiveIntegerField(help_text='Amount in paise (INR x 100)')
    payment_method = models.CharField(max_length=50, default='razorpay') # razorpay, esewa
    external_order_id = models.CharField(max_length=100, blank=True, null=True) # for esewa/razorpay
    
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.name} → {self.course_name}"


class Payment(models.Model):
    """Records a verified payment."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    enrollment = models.OneToOneField(
        CourseEnrollment, on_delete=models.CASCADE, related_name='payment'
    )
    transaction_id = models.CharField(max_length=100, blank=True, null=True) # razorpay_payment_id or esewa poid
    order_id = models.CharField(max_length=100) # razorpay_order_id or unique gen id
    signature = models.CharField(max_length=255, blank=True, null=True)
    amount = models.PositiveIntegerField(help_text='Amount in paise or cents')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    method = models.CharField(max_length=50, default='razorpay') # razorpay, esewa
    paid_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        return f"{self.transaction_id} – {self.status}"
