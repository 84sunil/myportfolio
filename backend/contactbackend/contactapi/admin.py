from django.contrib import admin
from .models import ContactMessage, Course, CourseVideo, CourseEnrollment, Payment


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at')
    search_fields = ('name', 'email')
    ordering = ('-created_at',)


class CourseVideoInline(admin.TabularInline):
    model = CourseVideo
    extra = 1

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'id_string', 'price', 'level', 'created_at')
    search_fields = ('title', 'id_string')
    inlines = [CourseVideoInline]


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'course_name', 'amount_inr', 'external_order_id', 'payment_method', 'enrolled_at')
    search_fields = ('name', 'email', 'course_name', 'external_order_id')
    list_filter = ('course', 'payment_method')
    ordering = ('-enrolled_at',)
    readonly_fields = ('enrolled_at',)

    def amount_inr(self, obj):
        return f"₹{obj.amount // 100}"
    amount_inr.short_description = 'Amount (INR)'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'order_id', 'amount_inr', 'method', 'status', 'paid_at')
    search_fields = ('transaction_id', 'order_id')
    list_filter = ('status', 'method')
    ordering = ('-paid_at',)
    readonly_fields = ('paid_at',)

    def amount_inr(self, obj):
        return f"₹{obj.amount // 100}"
    amount_inr.short_description = 'Amount (INR)'
