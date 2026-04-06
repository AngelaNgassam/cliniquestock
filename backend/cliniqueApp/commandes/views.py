# backend/cliniqueApp/commandes/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Fournisseur, Commande
from .serializers import (
    FournisseurSerializer, CommandeResumeeSerializer, CommandeSerializer
)


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
        return Response({
            'message':   f'Fournisseur {fournisseur.nom_societe} {etat}.',
            'est_actif': fournisseur.est_actif,
        })

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
        if hasattr(user, 'role') and user.role == 'ADMINISTRATEUR':
            return Commande.objects.all().prefetch_related('lignes').order_by('-date_creation')
        return Commande.objects.filter(
            cree_par=user
        ).prefetch_related('lignes').order_by('-date_creation')

    def get_permissions(self):
        return [EstAdminOuPharmacien()]

    def destroy(self, request, *args, **kwargs):
        commande = self.get_object()
        if timezone.now() >= commande.date_creation + timedelta(hours=24):
            return Response(
                {'error': 'Suppression impossible après 24h.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if commande.statut not in [Commande.Statut.BROUILLON, Commande.Statut.EN_ATTENTE]:
            return Response(
                {'error': 'Seules les commandes en brouillon ou en attente peuvent être supprimées.'},
                status=status.HTTP_403_FORBIDDEN
            )
        commande.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── PATCH /commandes/{id}/envoyer/ ────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='envoyer')
    def envoyer(self, request, pk=None):
        commande = self.get_object()
        if commande.statut not in [Commande.Statut.BROUILLON, Commande.Statut.EN_ATTENTE]:
            return Response(
                {'error': 'Commande déjà envoyée ou clôturée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = Commande.Statut.EN_ATTENTE
        commande.save()
        self._envoyer_email_fournisseur(commande)
        self._envoyer_sms_fournisseur(commande)
        return Response({
            'message': f'Commande {commande.reference} envoyée. Fournisseur notifié.',
            'statut':  commande.statut,
        })

    # ── PATCH /commandes/{id}/annuler/ ────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='annuler')
    def annuler(self, request, pk=None):
        commande = self.get_object()
        if commande.statut in [Commande.Statut.LIVREE, Commande.Statut.ANNULEE]:
            return Response(
                {'error': "Impossible d'annuler une commande livrée ou déjà annulée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = Commande.Statut.ANNULEE
        commande.save()
        self._envoyer_email_annulation(commande)  # ← email annulation
        return Response({
            'message': f'Commande {commande.reference} annulée.',
            'statut':  commande.statut,
        })

    # ── PATCH /commandes/{id}/cloture/ ────────────────────────────────────────
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
        return Response({
            'message': f'Commande {commande.reference} clôturée.',
            'statut':  commande.statut,
        })

    # ─────────────────────────────────────────────────────────────────────────
    # Méthodes email / SMS privées  (toutes dans la classe)
    # ─────────────────────────────────────────────────────────────────────────

    def _envoyer_email_fournisseur(self, commande):
        """Envoie un email récapitulatif au fournisseur lors de l'envoi d'une commande."""
        try:
            fournisseur = commande.fournisseur
            lignes_text = ""
            for ligne in commande.lignes.all():
                total_ligne = ligne.quantite_commandee * ligne.prix_unitaire_estime
                lignes_text += (
                    f"  - {ligne.medicament.nom_commercial} "
                    f"({ligne.medicament.dci}) | "
                    f"Qte: {ligne.quantite_commandee} | "
                    f"Prix unitaire: {ligne.prix_unitaire_estime} FCFA | "
                    f"Total: {total_ligne} FCFA\n"
                )
            date_livraison = (
                commande.date_livraison_prevue.strftime('%d/%m/%Y')
                if commande.date_livraison_prevue else 'Non precisee'
            )
            sujet = f"[CliniqueStock] Nouvelle commande {commande.reference}"
            message = f"""Bonjour {fournisseur.nom_societe},

Une nouvelle commande vous a ete adressee via CliniqueStock.

RECAPITULATIF DE LA COMMANDE
Reference       : {commande.reference}
Date de commande: {commande.date_creation.strftime('%d/%m/%Y a %H:%M')}
Date livraison  : {date_livraison}

MEDICAMENTS COMMANDES :
{lignes_text}
MONTANT TOTAL : {commande.montant_total} FCFA

Merci de confirmer la reception de cette commande.

Cordialement,
L'equipe CliniqueStock"""
            send_mail(
                subject=sujet,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[fournisseur.email],
                fail_silently=False,
            )
            print(f"[EMAIL] Envoye a {fournisseur.email}")
        except Exception as e:
            print(f"[EMAIL ERROR] {e}")

    def _envoyer_email_annulation(self, commande):
        """Envoie un email d'annulation au fournisseur."""
        try:
            fournisseur = commande.fournisseur
            sujet = f"[CliniqueStock] Annulation commande {commande.reference}"
            message = f"""Bonjour {fournisseur.nom_societe},

Nous vous informons que la commande {commande.reference} passee le {commande.date_creation.strftime('%d/%m/%Y')} a ete annulee.

Si vous avez deja effectue des preparatifs, veuillez nous contacter directement.

Cordialement,
L'equipe CliniqueStock"""
            send_mail(
                subject=sujet,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[fournisseur.email],
                fail_silently=False,
            )
            print(f"[EMAIL ANNULATION] Envoye a {fournisseur.email}")
        except Exception as e:
            print(f"[EMAIL ANNULATION ERROR] {e}")

    def _envoyer_sms_fournisseur(self, commande):
        """Envoie un SMS via Africa's Talking (sandbox)."""
        try:
            import africastalking
            import re

            fournisseur = commande.fournisseur
            print(f"[SMS DEBUG] Contact brut: '{fournisseur.contact}'")

            phone_match = re.search(r'\+?\d[\d\s\-]{8,}', fournisseur.contact)
            if not phone_match:
                print(f"[SMS] Pas de numero pour {fournisseur.nom_societe}")
                return

            phone = re.sub(r'[\s\-]', '', phone_match.group())
            print(f"[SMS DEBUG] Phone extrait: '{phone}'")

            if re.match(r'^6\d{8}$', phone):
                phone = '+237' + phone
            elif re.match(r'^237\d{9}$', phone):
                phone = '+' + phone
            elif not phone.startswith('+'):
                phone = '+237' + phone

            nb_articles    = commande.lignes.count()
            date_livraison = (
                commande.date_livraison_prevue.strftime('%d/%m/%Y')
                if commande.date_livraison_prevue else 'non precisee'
            )
            sms_body = (
                f"[CliniqueStock] Commande {commande.reference}\n"
                f"{nb_articles} article(s) - {commande.montant_total} FCFA\n"
                f"Livraison: {date_livraison}\n"
                f"Details par email."
            )

            africastalking.initialize(
                username=settings.AT_USERNAME,
                api_key=settings.AT_API_KEY,
            )
            sms = africastalking.SMS
            response = sms.send(sms_body, [phone])
            print(f"[SMS] Envoye a {phone} : {response}")

        except ImportError:
            print("[SMS] africastalking non installe.")
        except Exception as e:
            print(f"[SMS ERROR] {e}")