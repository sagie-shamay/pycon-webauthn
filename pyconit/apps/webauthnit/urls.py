from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("register", views.Register.as_view(), name="register"),
    path("authenticate", views.Authenticate.as_view(), name="authenticate")
]