from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/',   admin.site.urls),
    path('api/v1/auth/',  include('cliniqueApp.users.urls')),
    path('api/v1/',       include('cliniqueApp.medicaments.urls')),
    path('api/v1/',       include('cliniqueApp.commandes.urls')),
    path('api/v1/',       include('cliniqueApp.stock.urls')),
    path('api/v1/',       include('cliniqueApp.alertes.urls')),
    path('api/v1/',       include('cliniqueApp.rapports.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)