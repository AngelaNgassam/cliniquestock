from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Fournisseur, Commande
from .serializers import (
    FournisseurSerializer, CommandeResumeeSerializer, CommandeSerializer
)
from django.db.models import Sum


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset         = Fournisseur.objects.all().order_by('nom_societe')
    serializer_class = FournisseurSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'historique']:
            return [EstAdminOuPharmacien()]
        return [EstAdmin()]

    @action(detail=True, methods=['patch'], url_path='toggle_statut')
    def toggle_statut(self, request, pk=None):
        fournisseur = self.get_object()
        fournisseur.est_actif = not fournisseur.est_actif
        fournisseur.save()
        etat = "activé" if fournisseur.est_actif else "désactivé"
        return Response({'message': f'Fournisseur {fournisseur.nom_societe} {etat}.', 'est_actif': fournisseur.est_actif})

    @action(detail=True, methods=['get'], url_path='historique')
    def historique(self, request, pk=None):
        fournisseur = self.get_object()
        commandes   = fournisseur.commandes.all().order_by('-date_creation')
        volume      = commandes.aggregate(total=Sum('montant_total'))['total'] or 0
        return Response({
            'fournisseur':     fournisseur.nom_societe,
            'total_commandes': commandes.count(),
            'volume_affaires': volume,
            'commandes':       CommandeResumeeSerializer(commandes, many=True).data,
        })


class CommandeViewSet(viewsets.ModelViewSet):
    serializer_class = CommandeSerializer

    def get_queryset(self):
        user = self.request.user
        # Admin voit tout, pharmacien voit seulement les siennes
        if hasattr(user, 'role') and user.role == 'ADMINISTRATEUR':
            return Commande.objects.all().prefetch_related('lignes').order_by('-date_creation')
        return Commande.objects.filter(cree_par=user).prefetch_related('lignes').order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [EstAdminOuPharmacien()]
        return [EstAdminOuPharmacien()]  # create aussi autorisé aux deux

    def destroy(self, request, *args, **kwargs):
        commande = self.get_object()
        # Règle 24h
        if timezone.now() >= commande.date_creation + timedelta(hours=24):
            return Response(
                {'error': 'Suppression impossible après 24h.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Seulement si brouillon ou en attente
        if commande.statut not in [Commande.Statut.BROUILLON, Commande.Statut.EN_ATTENTE]:
            return Response(
                {'error': 'Seules les commandes en brouillon peuvent être supprimées.'},
                status=status.HTTP_403_FORBIDDEN
            )
        commande.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── PATCH /commandes/{id}/envoyer/ ────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='envoyer')
    def envoyer(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != Commande.Statut.BROUILLON:
            return Response(
                {'error': 'Seules les commandes en brouillon peuvent être envoyées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = Commande.Statut.EN_ATTENTE
        commande.save()
        return Response({'message': f'Commande {commande.reference} envoyée.', 'statut': commande.statut})

    # ── PATCH /commandes/{id}/annuler/ ────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='annuler')
    def annuler(self, request, pk=None):
        commande = self.get_object()
        if commande.statut in [Commande.Statut.LIVREE, Commande.Statut.ANNULEE]:
            return Response(
                {'error': 'Impossible d\'annuler une commande livrée ou déjà annulée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = Commande.Statut.ANNULEE
        commande.save()
        return Response({'message': f'Commande {commande.reference} annulée.', 'statut': commande.statut})

    # ── PATCH /commandes/{id}/cloture/ ───────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='cloture')
    def cloture(self, request, pk=None):
        commande = self.get_object()
        if commande.statut not in [Commande.Statut.LIVREE, Commande.Statut.PARTIELLE]:
            return Response(
                {'error': 'Seules les commandes reçues peuvent être clôturées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = Commande.Statut.LIVREE
        commande.save()
        return Response({'message': f'Commande {commande.reference} clôturée.', 'statut': commande.statut})