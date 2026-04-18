from django.contrib import admin
from django.utils.html import format_html
from .models import ContactMessage, Course, CourseVideo, CourseEnrollment, Payment


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at')
    search_fields = ('name', 'email', 'message')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


class CourseVideoInline(admin.TabularInline):
    model = CourseVideo
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'id_string', 'price_display', 'original_price_display', 'level', 'created_at')
    search_fields = ('title', 'id_string')
    list_filter = ('level',)
    inlines = [CourseVideoInline]

    def price_display(self, obj):
        return f"₹{obj.price:,}"
    price_display.short_description = 'Price (INR)'

    def original_price_display(self, obj):
        return f"₹{obj.original_price:,}"
    original_price_display.short_description = 'Original Price'


class PaymentInline(admin.TabularInline):
    model = Payment
    fields = ('order_id', 'transaction_id', 'amount_display', 'status', 'method', 'paid_at')
    readonly_fields = ('order_id', 'transaction_id', 'amount_display', 'method', 'paid_at')
    extra = 0
    can_delete = False

    def amount_display(self, obj):
        return f"₹{obj.amount // 100:,}"
    amount_display.short_description = 'Amount'


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'email', 'phone', 'course_name',
        'amount_inr', 'payment_method', 'payment_status_badge', 'enrolled_at'
    )
    search_fields = ('name', 'email', 'course_name', 'external_order_id', 'phone')
    list_filter = ('course', 'payment_method', 'payment__status')
    ordering = ('-enrolled_at',)
    readonly_fields = ('enrolled_at', 'external_order_id')
    inlines = [PaymentInline]

    def amount_inr(self, obj):
        return f"₹{obj.amount // 100:,}"
    amount_inr.short_description = 'Amount'

    def payment_status_badge(self, obj):
        try:
            payment = obj.payment
            color_map = {
                'success': '#16a34a',
                'pending': '#d97706',
                'failed':  '#dc2626',
            }
            color = color_map.get(payment.status, '#6b7280')
            return format_html(
                '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
                color, payment.status.upper()
            )
        except Payment.DoesNotExist:
            return format_html('<span style="color:#9ca3af">No Payment</span>')
    payment_status_badge.short_description = 'Payment Status'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_id', 'order_id', 'enrollment_link',
        'amount_inr', 'method', 'status_badge', 'paid_at'
    )
    search_fields = ('transaction_id', 'order_id', 'enrollment__name', 'enrollment__email')
    list_filter = ('status', 'method')
    ordering = ('-paid_at',)
    readonly_fields = ('paid_at', 'order_id', 'transaction_id', 'signature')

    def amount_inr(self, obj):
        return f"₹{obj.amount // 100:,}"
    amount_inr.short_description = 'Amount'

    def status_badge(self, obj):
        color_map = {
            'success': '#16a34a',
            'pending': '#d97706',
            'failed':  '#dc2626',
        }
        color = color_map.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'

    def enrollment_link(self, obj):
        return format_html(
            '<a href="/admin/contactapi/courseenrollment/{}/change/">{}</a>',
            obj.enrollment.id, obj.enrollment.name
        )
    enrollment_link.short_description = 'Student'
