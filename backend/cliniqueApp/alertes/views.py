from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Alerte
from .serializers import AlerteSerializer


class AlerteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AlerteSerializer
    permission_classes = [EstAdminOuPharmacien]

    def get_queryset(self):
        user = self.request.user
        qs   = Alerte.objects.filter(destinataire=user).order_by('est_lue', '-date_creation')
        type_alerte = self.request.query_params.get('type')
        est_lue     = self.request.query_params.get('est_lue')
        if type_alerte: qs = qs.filter(type_alerte=type_alerte)
        if est_lue is not None: qs = qs.filter(est_lue=est_lue.lower() == 'true')
        return qs

    @action(detail=True, methods=['patch'], url_path='resolve')
    def resolve(self, request, pk=None):
        alerte = self.get_object()
        alerte.est_lue = True
        alerte.save()
        return Response({'message': 'Alerte résolue.', 'id': alerte.id, 'est_lue': True})

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        # ✅ Marque seulement les alertes de type SYSTEME/LOGISTIQUE
        # Les alertes critiques doivent être résolues manuellement
        count = Alerte.objects.filter(
            destinataire=request.user,
            est_lue=False,
            niveau_urgence='BAS',
        ).update(est_lue=True)
        return Response({'message': f'{count} alerte(s) logistique(s) marquée(s) comme lues.'})

    @action(detail=False, methods=['get'], url_path='non_lues_count')
    def non_lues_count(self, request):
        count = Alerte.objects.filter(
            destinataire=request.user, est_lue=False
        ).count()
        return Response({'count': count})

    @action(detail=False, methods=['delete'], url_path='nettoyer')
    def nettoyer(self, request):
        """Supprime les alertes traitées et expirées (> 30 jours)."""
        from datetime import timedelta
        limit = timezone.now() - timedelta(days=30)
        deleted, _ = Alerte.objects.filter(
            destinataire=request.user,
            est_lue=True,
            date_creation__lt=limit,
        ).delete()
        return Response({'message': f'{deleted} alerte(s) supprimée(s).'})

    @action(detail=True, methods=['get'], url_path='verifier')
    def verifier(self, request, pk=None):
        """Retourne l'historique de résolution d'une alerte."""
        alerte = self.get_object()
        return Response({
            'id':            alerte.id,
            'est_lue':       alerte.est_lue,
            'type_alerte':   alerte.type_alerte,
            'niveau':        alerte.niveau_urgence,
            'message':       alerte.message,
            'date_creation': alerte.date_creation,
            'resolution':    'Alerte résolue manuellement.' if alerte.est_lue else 'Non résolue.',
        })


# ── Configuration des seuils ──────────────────────────────────────────────────
class SeuilConfigViewSet(viewsets.ViewSet):
    permission_classes = [EstAdmin]

    SEUILS_DEFAUT = {
        'seuil_stock_global':       10,
        'seuil_critique':           5,
        'seuil_peremption_warning': 7,
        'seuil_peremption_critique': 3,
    }

    def _get_seuils(self):
        """Lit depuis la BDD ou retourne les défauts."""
        from django.core.cache import cache
        return cache.get('seuils_alertes', self.SEUILS_DEFAUT)

    def list(self, request):
        return Response(self._get_seuils())

    def create(self, request):
        from django.core.cache import cache
        data = request.data
        seuils = {
            'seuil_stock_global':        int(data.get('seuil_stock_global', 10)),
            'seuil_critique':            int(data.get('seuil_critique', 5)),
            'seuil_peremption_warning':  int(data.get('seuil_peremption_warning', 7)),
            'seuil_peremption_critique': int(data.get('seuil_peremption_critique', 3)),
        }
        cache.set('seuils_alertes', seuils, timeout=None)
        return Response({'message': 'Seuils sauvegardés.', **seuils})