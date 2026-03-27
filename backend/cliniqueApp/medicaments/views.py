from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Medicament, Categorie
from .serializers import MedicamentSerializer, CategorieSerializer
from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all().order_by('nom')
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EstAdmin()]
        return [EstAdminOuPharmacien()]


class MedicamentViewSet(viewsets.ModelViewSet):
    serializer_class = MedicamentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['est_actif', 'forme_galenique', 'categorie']
    search_fields = ['nom_commercial', 'dci', 'code_barres']
    ordering_fields = ['nom_commercial', 'prix_unitaire', 'seuil_alerte']

    def get_queryset(self):
        return Medicament.objects.select_related('categorie').order_by('nom_commercial')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy',
                           'archiver', 'restaurer']:
            return [EstAdmin()]
        return [EstAdminOuPharmacien()]

    @action(detail=True, methods=['post'], url_path='archiver')
    def archiver(self, request, pk=None):
        medicament = self.get_object()
        medicament.est_actif = False
        medicament.save()
        return Response(
            {'message': f'{medicament.nom_commercial} archivé avec succès.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='restaurer')
    def restaurer(self, request, pk=None):
        medicament = self.get_object()
        medicament.est_actif = True
        medicament.save()
        return Response(
            {'message': f'{medicament.nom_commercial} restauré avec succès.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='actifs')
    def actifs(self, request):
        """Retourne uniquement les médicaments actifs."""
        queryset = self.get_queryset().filter(est_actif=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='stock-critique')
    def stock_critique(self, request):
        """Médicaments dont le stock est en dessous du seuil d'alerte."""
        from cliniqueApp.stock.models import LotStock
        from django.db.models import Sum

        medicaments = self.get_queryset().filter(est_actif=True)
        critiques = []
        for med in medicaments:
            stock_total = LotStock.objects.filter(
                medicament=med, statut='DISPONIBLE'
            ).aggregate(total=Sum('quantite_disponible'))['total'] or 0
            if stock_total <= med.seuil_alerte:
                data = self.get_serializer(med).data
                data['stock_actuel'] = stock_total
                critiques.append(data)
        return Response(critiques)