from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlerteViewSet, SeuilConfigViewSet

router = DefaultRouter()
router.register(r'alertes',        AlerteViewSet,     basename='alerte')
router.register(r'config/seuils',  SeuilConfigViewSet, basename='seuil-config')

urlpatterns = [path('', include(router.urls))]