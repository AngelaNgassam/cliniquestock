# backend/cliniqueApp/commandes/views.py

import re
import requests

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
        self._envoyer_whatsapp_fournisseur(commande)
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
        self._envoyer_email_annulation(commande)
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
        self._envoyer_email_cloture(commande)
        return Response({
            'message': f'Commande {commande.reference} clôturée.',
            'statut':  commande.statut,
        })

    # =========================================================================
    # Utilitaires Infobip
    # =========================================================================

    def _infobip_headers(self):
        return {
            'Authorization': f'App {settings.INFOBIP_API_KEY}',
            'Content-Type':  'application/json',
            'Accept':        'application/json',
        }

    def _normaliser_telephone(self, contact_brut):
        """Extrait et normalise un numéro camerounais vers le format E.164."""
        match = re.search(r'\+?\d[\d\s\-]{8,}', contact_brut)
        if not match:
            return None
        phone = re.sub(r'[\s\-]', '', match.group())
        if re.match(r'^6\d{8}$', phone):
            phone = '+237' + phone
        elif re.match(r'^237\d{9}$', phone):
            phone = '+' + phone
        elif not phone.startswith('+'):
            phone = '+237' + phone
        return phone

    def _envoyer_sms_fournisseur(self, commande):
        """Envoie un SMS de nouvelle commande via Infobip."""
        fournisseur = commande.fournisseur
        phone = self._normaliser_telephone(fournisseur.contact)
        if not phone:
            print(f"[SMS] Pas de numéro valide pour {fournisseur.nom_societe}")
            return

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

        url     = f"https://{settings.INFOBIP_BASE_URL}/sms/2/text/advanced"
        payload = {
            "messages": [{
                "from":         settings.INFOBIP_SENDER_SMS,
                "destinations": [{"to": phone}],
                "text":         sms_body,
            }]
        }

        try:
            response = requests.post(
                url, json=payload, headers=self._infobip_headers(), timeout=10
            )
            response.raise_for_status()
            print(f"[SMS Infobip] Envoyé à {phone} : {response.json()}")
        except Exception as e:
            print(f"[SMS Infobip ERROR] {e}")

    def _envoyer_whatsapp_fournisseur(self, commande):
        """Envoie un message WhatsApp via Infobip (template pré-approuvé)."""
        fournisseur = commande.fournisseur
        phone = self._normaliser_telephone(fournisseur.contact)
        if not phone:
            print(f"[WA] Pas de numéro valide pour {fournisseur.nom_societe}")
            return

        nb_articles    = commande.lignes.count()
        date_livraison = (
            commande.date_livraison_prevue.strftime('%d/%m/%Y')
            if commande.date_livraison_prevue else 'non precisee'
        )

        url     = f"https://{settings.INFOBIP_BASE_URL}/whatsapp/1/message/template"
        payload = {
            "messages": [{
                "from": settings.INFOBIP_SENDER_WHATSAPP,
                "to":   phone,
                "content": {
                    "templateName": settings.INFOBIP_WA_TEMPLATE_NAME,
                    "templateData": {
                        "body": {
                            # Ordre des placeholders à adapter à ton template Infobip
                            "placeholders": [
                                commande.reference,
                                str(nb_articles),
                                str(commande.montant_total),
                                date_livraison,
                            ]
                        }
                    },
                    "language": settings.INFOBIP_WA_TEMPLATE_LANG,
                }
            }]
        }

        try:
            response = requests.post(
                url, json=payload, headers=self._infobip_headers(), timeout=10
            )
            response.raise_for_status()
            print(f"[WA Infobip] Envoyé à {phone} : {response.json()}")
        except Exception as e:
            print(f"[WA Infobip ERROR] {e}")

    # =========================================================================
    # Méthodes email
    # =========================================================================

    def _construire_recap_lignes(self, commande):
        """Construit le texte récapitulatif des lignes de commande."""
        lignes_text = ""
        for ligne in commande.lignes.all():
            total_ligne = ligne.quantite_commandee * ligne.prix_unitaire_estime
            lignes_text += (
                f"  - {ligne.medicament.nom_commercial} "
                f"({ligne.medicament.dci}) | "
                f"Qte commandee: {ligne.quantite_commandee} | "
                f"Qte recue: {ligne.quantite_recue} | "
                f"Prix unitaire: {ligne.prix_unitaire_estime} FCFA | "
                f"Total: {total_ligne} FCFA\n"
            )
        return lignes_text

    def _envoyer_email_fournisseur(self, commande):
        """Email de nouvelle commande envoyee au fournisseur."""
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
            print(f"[EMAIL COMMANDE] Envoye a {fournisseur.email}")
        except Exception as e:
            print(f"[EMAIL COMMANDE ERROR] {e}")

    def _envoyer_email_annulation(self, commande):
        """Email d'annulation au fournisseur."""
        try:
            fournisseur = commande.fournisseur
            sujet = f"[CliniqueStock] Annulation commande {commande.reference}"
            message = f"""Bonjour {fournisseur.nom_societe},

Nous vous informons que la commande {commande.reference} passee le {commande.date_creation.strftime('%d/%m/%Y')} a ete annulee.

Si vous avez deja effectue des preparatifs pour cette commande, veuillez nous contacter directement afin de convenir d'une solution.

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

    def _envoyer_email_cloture(self, commande):
        """Email de cloture au fournisseur."""
        try:
            fournisseur = commande.fournisseur
            lignes_text = self._construire_recap_lignes(commande)
            sujet = f"[CliniqueStock] Clôture commande {commande.reference}"
            message = f"""Bonjour {fournisseur.nom_societe},

Nous vous informons que la commande {commande.reference} a ete cloturee avec succes dans notre systeme.

RECAP FINAL DE LA COMMANDE
Reference       : {commande.reference}
Date de commande: {commande.date_creation.strftime('%d/%m/%Y')}

MEDICAMENTS :
{lignes_text}
MONTANT TOTAL : {commande.montant_total} FCFA

Merci pour votre collaboration.

Cordialement,
L'equipe CliniqueStock"""
            send_mail(
                subject=sujet,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[fournisseur.email],
                fail_silently=False,
            )
            print(f"[EMAIL CLOTURE] Envoye a {fournisseur.email}")
        except Exception as e:
            print(f"[EMAIL CLOTURE ERROR] {e}")

    def _envoyer_email_reception(self, commande, reception, lignes_data):
        """
        Email de compte rendu de réception au fournisseur.
        Appelé depuis stock/views.py après création d'une réception.
        lignes_data = liste de dicts avec medicament_nom, quantite_commandee,
                      quantite_recue, has_anomalie, type_anomalie, description_anomalie
        """
        try:
            fournisseur = commande.fournisseur
            date_livraison = (
                commande.date_livraison_prevue.strftime('%d/%m/%Y')
                if commande.date_livraison_prevue else 'Non precisee'
            )

            lignes_ok   = ""
            lignes_pb   = ""
            a_anomalies = False

            for l in lignes_data:
                if l.get('has_anomalie'):
                    a_anomalies = True
                    label_anomalie = {
                        'PRODUIT_NON_CONFORME':    'Produit non conforme',
                        'MEDICAMENT_ENDOMMAGE':    'Medicament endommage',
                        'PEREMPTION_INSUFFISANTE': 'Peremption insuffisante (< 6 mois)',
                        'QUANTITE_MANQUANTE':      'Quantite manquante',
                    }.get(l.get('type_anomalie', ''), l.get('type_anomalie', ''))
                    lignes_pb += (
                        f"  ⚠ {l['medicament_nom']} | "
                        f"Qte commandee: {l['quantite_commandee']} | "
                        f"Qte recue: {l['quantite_recue']} | "
                        f"Anomalie: {label_anomalie}"
                    )
                    if l.get('description_anomalie'):
                        lignes_pb += f" — {l['description_anomalie']}"
                    lignes_pb += "\n"
                else:
                    lignes_ok += (
                        f"  ✓ {l['medicament_nom']} | "
                        f"Qte recue: {l['quantite_recue']} / {l['quantite_commandee']} commandes\n"
                    )

            statut_label = {
                'LIVREE':    'COMPLETEMENT LIVREE',
                'PARTIELLE': 'PARTIELLEMENT LIVREE',
            }.get(commande.statut, commande.statut)

            if a_anomalies:
                sujet = f"[CliniqueStock] ⚠ Réception partielle — {commande.reference}"
            else:
                sujet = f"[CliniqueStock] ✓ Réception enregistrée — {commande.reference}"

            message = f"""Bonjour {fournisseur.nom_societe},

Nous avons enregistre la reception de votre livraison pour la commande {commande.reference}.

STATUT DE LA COMMANDE : {statut_label}
Reference       : {commande.reference}
Date livraison  : {date_livraison}
"""
            if lignes_ok:
                message += f"""
MEDICAMENTS RECUS CORRECTEMENT :
{lignes_ok}"""

            if lignes_pb:
                message += f"""
MEDICAMENTS AVEC ANOMALIES :
{lignes_pb}
Actions effectuees selon le type d'anomalie :
  - Produit non conforme  → Bon de retour genere, produit non integre au stock
  - Medicament endommage  → Produit place en stock quarantaine
  - Peremption < 6 mois  → Alerte declenchee, confirmation requise
  - Quantite manquante   → Commande passee en statut "Partielle"

Merci de prendre note de ces anomalies et de nous contacter si necessaire.
"""

            message += """
Cordialement,
L'equipe CliniqueStock"""

            send_mail(
                subject=sujet,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[fournisseur.email],
                fail_silently=False,
            )
            print(f"[EMAIL RECEPTION] Envoye a {fournisseur.email}")
        except Exception as e:
            print(f"[EMAIL RECEPTION ERROR] {e}")