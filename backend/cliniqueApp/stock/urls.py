from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReceptionViewSet, StockViewSet, MouvementViewSet

router = DefaultRouter()
router.register(r'receptions', ReceptionViewSet, basename='reception')
router.register(r'stock',      StockViewSet,     basename='stock')
router.register(r'mouvements', MouvementViewSet, basename='mouvement')

urlpatterns = [
    path('', include(router.urls)),
]