from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Fournisseur
from .serializers import FournisseurSerializer, CommandeResumeeSerializer


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset           = Fournisseur.objects.all().order_by('nom_societe')
    serializer_class   = FournisseurSerializer

    def get_permissions(self):
        """
        Lecture  → Admin ou Pharmacien
        Écriture → Admin uniquement
        """
        if self.action in ['list', 'retrieve', 'historique']:
            return [EstAdminOuPharmacien()]
        return [EstAdmin()]

    # ── PATCH /fournisseurs/{id}/toggle_statut/ ───────────────────────────────
    @action(detail=True, methods=['patch'], url_path='toggle_statut')
    def toggle_statut(self, request, pk=None):
        fournisseur = self.get_object()
        fournisseur.est_actif = not fournisseur.est_actif
        fournisseur.save()
        etat = "activé" if fournisseur.est_actif else "désactivé"
        return Response({
            'message':   f'Fournisseur {fournisseur.nom_societe} {etat} avec succès.',
            'est_actif': fournisseur.est_actif,
        })

    # ── GET /fournisseurs/{id}/historique/ ────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='historique')
    def historique(self, request, pk=None):
        fournisseur = self.get_object()
        commandes   = fournisseur.commandes.all().order_by('-date_creation')
        volume      = commandes.aggregate(
                          total=Sum('montant_total')
                      )['total'] or 0

        return Response({
            'fournisseur':     fournisseur.nom_societe,
            'total_commandes': commandes.count(),
            'volume_affaires': volume,
            'commandes':       CommandeResumeeSerializer(commandes, many=True).data,
        })