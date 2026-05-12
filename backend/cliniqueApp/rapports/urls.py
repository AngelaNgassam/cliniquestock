from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JournalAuditViewSet, SignatureView, LogoView

router = DefaultRouter()
router.register(r'journal-audit', JournalAuditViewSet, basename='journal-audit')

urlpatterns = [
    path('', include(router.urls)),
    path('signature/', SignatureView.as_view(), name='signature'),
    path('logo/',      LogoView.as_view(),      name='logo'),
]