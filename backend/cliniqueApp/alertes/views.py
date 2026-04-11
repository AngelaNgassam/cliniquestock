from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from cliniqueApp.users.permissions import EstAdminOuPharmacien
from .models import Alerte
from .serializers import AlerteSerializer


class AlerteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AlerteSerializer
    permission_classes = [EstAdminOuPharmacien]

    def get_queryset(self):
        user = self.request.user
        qs   = Alerte.objects.filter(destinataire=user).order_by('est_lue', '-date_creation')
        if self.request.query_params.get('type'):
            qs = qs.filter(type_alerte=self.request.query_params['type'])
        if self.request.query_params.get('est_lue') is not None:
            qs = qs.filter(est_lue=self.request.query_params['est_lue'].lower() == 'true')
        return qs

    # ── PATCH /alertes/{id}/resolve/ ─────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='resolve')
    def resolve(self, request, pk=None):
        alerte = self.get_object()
        mode   = request.data.get('mode_resolution', 'Résolution manuelle.')

        alerte.est_lue        = True
        alerte.resolu_par     = request.user
        alerte.date_resolution = timezone.now()
        alerte.mode_resolution = mode
        alerte.save()

        # Journal d'audit
        try:
            from cliniqueApp.rapports.models import JournalAudit
            JournalAudit.objects.create(
                action='RESOLUTION_ALERTE',
                entite_concernee=f'Alerte : {alerte.type_alerte}',
                nouvelle_valeur={
                    'alerte_id':  alerte.id,
                    'type':       alerte.type_alerte,
                    'message':    alerte.message[:80],
                    'resolu_par': f'{request.user.prenom} {request.user.nom}',
                    'mode':       mode,
                },
                utilisateur=request.user,
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )
        except Exception as e:
            print(f'[JOURNAL] {e}')

        return Response({
            'message':          'Alerte résolue.',
            'id':               alerte.id,
            'est_lue':          alerte.est_lue,
            'resolu_par':       f'{request.user.prenom} {request.user.nom}',
            'date_resolution':  alerte.date_resolution,
            'mode_resolution':  alerte.mode_resolution,
        })

    # ── POST /alertes/mark_all_read/ ─────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        count = Alerte.objects.filter(
            destinataire=request.user, est_lue=False, niveau_urgence='BAS'
        ).update(est_lue=True)
        return Response({'message': f'{count} alerte(s) logistique(s) marquée(s) comme lues.'})

    # ── GET /alertes/non_lues_count/ ─────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='non_lues_count')
    def non_lues_count(self, request):
        count = Alerte.objects.filter(destinataire=request.user, est_lue=False).count()
        return Response({'count': count})

    # ── DELETE /alertes/nettoyer/ ─────────────────────────────────────────────
    @action(detail=False, methods=['delete'], url_path='nettoyer')
    def nettoyer(self, request):
        from datetime import timedelta
        limit = timezone.now() - timedelta(days=30)
        deleted, _ = Alerte.objects.filter(
            destinataire=request.user, est_lue=True, date_creation__lt=limit
        ).delete()
        return Response({'message': f'{deleted} alerte(s) supprimée(s).'})

    # ── GET /alertes/{id}/verifier/ ───────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='verifier')
    def verifier(self, request, pk=None):
        alerte = self.get_object()
        resolu_par = None
        if alerte.resolu_par:
            resolu_par = f'{alerte.resolu_par.prenom} {alerte.resolu_par.nom}'

        return Response({
            'id':              alerte.id,
            'est_lue':         alerte.est_lue,
            'type_alerte':     alerte.type_alerte,
            'niveau':          alerte.niveau_urgence,
            'message':         alerte.message,
            'date_creation':   alerte.date_creation,
            'resolu_par':      resolu_par,
            'date_resolution': alerte.date_resolution,
            'mode_resolution': alerte.mode_resolution or 'Non précisé',
            'resolution':      f'Résolu par {resolu_par} le {alerte.date_resolution.strftime("%d/%m/%Y à %H:%M")}' if alerte.est_lue and resolu_par else 'Non résolue.',
        })


class SeuilConfigViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    SEUILS_DEFAUT = {
        'seuil_stock_global':        10,
        'seuil_critique':            5,
        'seuil_peremption_warning':  7,
        'seuil_peremption_critique': 3,
    }

    def _get_seuils(self):
        from django.core.cache import cache
        return cache.get('seuils_alertes', self.SEUILS_DEFAUT)

    def list(self, request):
        return Response(self._get_seuils())

    def create(self, request):
        from django.core.cache import cache
        data   = request.data
        seuils = {
            'seuil_stock_global':        int(data.get('seuil_stock_global', 10)),
            'seuil_critique':            int(data.get('seuil_critique', 5)),
            'seuil_peremption_warning':  int(data.get('seuil_peremption_warning', 7)),
            'seuil_peremption_critique': int(data.get('seuil_peremption_critique', 3)),
        }
        cache.set('seuils_alertes', seuils, timeout=None)
        return Response({'message': 'Seuils sauvegardés.', **seuils})