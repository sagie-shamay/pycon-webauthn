from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("", include("apps.webauthnit.urls")),
    path("admin/", admin.site.urls),
]