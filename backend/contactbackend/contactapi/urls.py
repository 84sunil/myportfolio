from django.urls import path
from . import views

urlpatterns = [
    path('contact/', views.contact_form, name='contact_form'),
    path('messages/', views.get_messages, name='get_messages'),
]
