from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JournalAuditViewSet

router = DefaultRouter()
router.register(r'journal-audit', JournalAuditViewSet, basename='journal-audit')

urlpatterns = [path('', include(router.urls))]