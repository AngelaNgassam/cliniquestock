from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReceptionViewSet, StockViewSet, MouvementViewSet, SortieStockViewSet, DashboardViewSet

router = DefaultRouter()
router.register(r'receptions', ReceptionViewSet,   basename='reception')
router.register(r'stock',      StockViewSet,        basename='stock')
router.register(r'mouvements', MouvementViewSet,    basename='mouvement')
router.register(r'sorties',    SortieStockViewSet,  basename='sortie')
router.register(r'dashboard',  DashboardViewSet,    basename='dashboard')

urlpatterns = [path('', include(router.urls))]