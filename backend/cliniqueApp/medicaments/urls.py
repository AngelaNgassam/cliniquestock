from rest_framework.routers import DefaultRouter
from .views import MedicamentViewSet, CategorieViewSet

router = DefaultRouter()
router.register('medicaments', MedicamentViewSet, basename='medicament')
router.register('categories', CategorieViewSet, basename='categorie')

urlpatterns = router.urls