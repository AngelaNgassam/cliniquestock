from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from cliniqueApp.users.permissions import EstAdminOuPharmacien
from .models import Alerte
from .serializers import AlerteSerializer


class AlerteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AlerteSerializer
    permission_classes = [EstAdminOuPharmacien]

    def get_queryset(self):
        user = self.request.user
        # Chaque utilisateur voit ses propres alertes, triées par criticité
        niveau_ordre = {
            'CRITIQUE': 0, 'ELEVE': 1, 'MOYEN': 2, 'BAS': 3
        }
        qs = Alerte.objects.filter(
            destinataire=user
        ).order_by('est_lue', 'date_creation')

        # Filtre optionnel
        type_alerte = self.request.query_params.get('type')
        est_lue     = self.request.query_params.get('est_lue')
        if type_alerte:
            qs = qs.filter(type_alerte=type_alerte)
        if est_lue is not None:
            qs = qs.filter(est_lue=est_lue.lower() == 'true')
        return qs

    # ── PATCH /alertes/{id}/resolve/ ─────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='resolve')
    def resolve(self, request, pk=None):
        alerte = self.get_object()
        alerte.est_lue = True
        alerte.save()
        return Response({
            'message': 'Alerte marquée comme traitée.',
            'id':      alerte.id,
            'est_lue': alerte.est_lue,
        })

    # ── POST /alertes/mark_all_read/ ─────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        count = Alerte.objects.filter(
            destinataire=request.user, est_lue=False
        ).update(est_lue=True)
        return Response({'message': f'{count} alerte(s) marquée(s) comme lues.'})

    # ── GET /alertes/non_lues_count/ ─────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='non_lues_count')
    def non_lues_count(self, request):
        count = Alerte.objects.filter(
            destinataire=request.user, est_lue=False
        ).count()
        return Response({'count': count})