import re
import base64
import uuid
from io import BytesIO

import requests

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import timedelta
from django.utils import timezone
from django.core.mail import EmailMessage
from django.conf import settings
from django.db.models import Sum

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Fournisseur, Commande
from .serializers import (
    FournisseurSerializer, CommandeResumeeSerializer, CommandeSerializer
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers HTML email
# ─────────────────────────────────────────────────────────────────────────────

def _style_email() -> str:
    return """
    <style>
      body { font-family: Arial, sans-serif; color: #333; background: #f4f7fb; margin: 0; padding: 0; }
      .wrapper { max-width: 640px; margin: 32px auto; background: white;
                 border-radius: 8px; overflow: hidden;
                 box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .header { background: #0D47A1; padding: 24px 32px; }
      .header h1 { color: white; margin: 0; font-size: 22px; letter-spacing: 1px; }
      .header p  { color: #BBDEFB; margin: 4px 0 0; font-size: 13px; }
      .body { padding: 32px; }
      .body h2 { color: #0D47A1; font-size: 16px; border-bottom: 2px solid #E3F2FD;
                 padding-bottom: 8px; margin-bottom: 16px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; }
      .info-item { background: #F8FBFF; border-radius: 6px; padding: 10px 14px; }
      .info-item .label { font-size: 11px; color: #90A4AE; text-transform: uppercase;
                          letter-spacing: 0.5px; margin-bottom: 4px; }
      .info-item .value { font-size: 14px; font-weight: 600; color: #212121; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { background: #0D47A1; color: white; padding: 10px 12px;
           text-align: left; font-size: 12px; }
      td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #E3F2FD; }
      tr:nth-child(even) td { background: #F8FBFF; }
      .total-row td { font-weight: 700; font-size: 15px; color: #0D47A1;
                      border-top: 2px solid #0D47A1; border-bottom: none; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px;
               font-size: 12px; font-weight: 600; }
      .badge-ok  { background: #E8F5E9; color: #2E7D32; }
      .badge-err { background: #FFEBEE; color: #C62828; }
      .footer { background: #F0F7FF; padding: 20px 32px; text-align: center;
                font-size: 12px; color: #90A4AE; border-top: 1px solid #E3F2FD; }
      .footer strong { color: #0D47A1; }
    </style>
    """


def _html_header(titre: str, sous_titre: str = '') -> str:
    return f"""
    <div class="header">
      <h1>📦 CliniqueStock</h1>
      <p>{sous_titre or titre}</p>
    </div>
    <div class="body">
    """


def _html_footer() -> str:
    return """
    </div>
    <div class="footer">
      Ce message a été généré automatiquement par <strong>CliniqueStock</strong>.<br>
      Merci de ne pas répondre directement à cet email.
    </div>
    """


def _html_info_grid(items: list) -> str:
    html = '<div class="info-grid">'
    for label, value in items:
        html += f"""
        <div class="info-item">
          <div class="label">{label}</div>
          <div class="value">{value}</div>
        </div>"""
    html += '</div>'
    return html


def _html_tableau_lignes(commande) -> str:
    """Tableau HTML des lignes de commande — utilise prix_achat_fournisseur."""
    html = """
    <table>
      <thead>
        <tr>
          <th>Médicament</th>
          <th>DCI</th>
          <th>Qté commandée</th>
          <th>Qté reçue</th>
          <th>Prix achat (FCFA)</th>
          <th>Total (FCFA)</th>
        </tr>
      </thead>
      <tbody>
    """
    for ligne in commande.lignes.all():
        # ✅ CORRECTION BUG CRITIQUE : prix_achat_fournisseur (pas prix_unitaire_estime)
        prix  = ligne.prix_achat_fournisseur
        total = ligne.quantite_commandee * prix
        recue = ligne.quantite_recue or 0
        ok    = recue >= ligne.quantite_commandee

        badge_recue = (
            f'<span class="badge badge-ok">{recue} ✓</span>' if ok
            else f'<span class="badge badge-err">{recue}</span>'
        )

        html += f"""
        <tr>
          <td><strong>{ligne.medicament.nom_commercial}</strong></td>
          <td>{ligne.medicament.dci or '—'}</td>
          <td style="text-align:center">{ligne.quantite_commandee}</td>
          <td style="text-align:center">{badge_recue}</td>
          <td style="text-align:right">{prix:,.0f}</td>
          <td style="text-align:right"><strong>{total:,.0f}</strong></td>
        </tr>"""

    html += f"""
        <tr class="total-row">
          <td colspan="5" style="text-align:right">MONTANT TOTAL</td>
          <td style="text-align:right">{commande.montant_total:,.0f} FCFA</td>
        </tr>
      </tbody>
    </table>
    """
    return html


# ─────────────────────────────────────────────────────────────────────────────
# Génération PDF ReportLab
# ─────────────────────────────────────────────────────────────────────────────

def _generer_pdf_commande(commande, type_doc: str = 'BON DE COMMANDE') -> BytesIO:
    """
    Génère un PDF professionnel pour la commande.
    Intègre le logo (LogoClinique) et la signature (Signature) si disponibles.
    Retourne un BytesIO prêt à être joint à un email.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable,
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    except ImportError:
        # ReportLab non installé → retourner un PDF vide
        print('[PDF] ReportLab non installé. pip install reportlab --break-system-packages')
        return BytesIO()

    BLEU      = colors.HexColor('#0D47A1')
    BLEU_CLAR = colors.HexColor('#E3F2FD')
    GRIS      = colors.HexColor('#607D8B')
    BLANC     = colors.white

    buffer = BytesIO()
    doc    = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=f'{type_doc} — {commande.reference}',
    )

    styles  = getSampleStyleSheet()
    story   = []

    # ── Style custom ──────────────────────────────────────────────────────────
    style_titre = ParagraphStyle(
        'Titre', parent=styles['Title'],
        fontSize=20, textColor=BLEU, spaceAfter=4,
    )
    style_sous  = ParagraphStyle(
        'SousTitre', parent=styles['Normal'],
        fontSize=10, textColor=GRIS, spaceAfter=12,
    )
    style_label = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=8, textColor=GRIS, spaceAfter=2,
    )
    style_val = ParagraphStyle(
        'Valeur', parent=styles['Normal'],
        fontSize=11, textColor=colors.HexColor('#212121'), spaceAfter=8,
    )
    style_section = ParagraphStyle(
        'Section', parent=styles['Normal'],
        fontSize=11, textColor=BLEU, fontName='Helvetica-Bold', spaceAfter=6,
    )

    # ── En-tête : Logo + Titre ────────────────────────────────────────────────
    header_data = []

    # Logo à gauche
    logo_cell = ''
    try:
        from cliniqueApp.rapports.models import LogoClinique
        logo = LogoClinique.objects.first()
        if logo and logo.image_b64:
            raw = logo.image_b64
            if ',' in raw:
                _, raw = raw.split(',', 1)
            img_bytes  = base64.b64decode(raw)
            img_stream = BytesIO(img_bytes)
            logo_img   = Image(img_stream, width=40 * mm, height=20 * mm)
            logo_img.hAlign = 'LEFT'
            nom_clinique = logo.nom_clinique
        else:
            logo_img     = Paragraph('<b>CliniqueStock</b>', ParagraphStyle(
                'Logo', fontSize=16, textColor=BLEU, fontName='Helvetica-Bold'
            ))
            nom_clinique = 'CliniqueStock'
    except Exception:
        logo_img     = Paragraph('<b>CliniqueStock</b>', ParagraphStyle(
            'Logo', fontSize=16, textColor=BLEU, fontName='Helvetica-Bold'
        ))
        nom_clinique = 'CliniqueStock'

    titre_cell = [
        Paragraph(type_doc, ParagraphStyle(
            'TitreDoc', fontSize=18, textColor=BLEU,
            fontName='Helvetica-Bold', alignment=TA_RIGHT,
        )),
        Paragraph(commande.reference, ParagraphStyle(
            'Ref', fontSize=12, textColor=GRIS, alignment=TA_RIGHT,
        )),
    ]

    header_table = Table([[logo_img, titre_cell]], colWidths=[80 * mm, None])
    header_table.setStyle(TableStyle([
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',     (1, 0), (1, 0),   'RIGHT'),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width='100%', thickness=2, color=BLEU, spaceAfter=10))

    # ── Informations de la commande ───────────────────────────────────────────
    story.append(Paragraph('Informations de la commande', style_section))
    fournisseur   = commande.fournisseur
    date_creation = commande.date_creation.strftime('%d/%m/%Y à %H:%M')
    date_livraison = (
        commande.date_livraison_prevue.strftime('%d/%m/%Y')
        if commande.date_livraison_prevue else 'Non précisée'
    )

    info_data = [
        ['Référence',          'Date de commande',   'Date livraison',   'Statut'],
        [
            commande.reference,
            date_creation,
            date_livraison,
            commande.get_statut_display(),
        ],
    ]
    info_table = Table(info_data, colWidths=[45 * mm, 50 * mm, 45 * mm, 35 * mm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  BLEU),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  BLANC),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0),  9),
        ('FONTSIZE',      (0, 1), (-1, 1),  10),
        ('BACKGROUND',    (0, 1), (-1, 1),  BLEU_CLAR),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#CFD8DC')),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [BLEU_CLAR]),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8))

    # ── Fournisseur ───────────────────────────────────────────────────────────
    story.append(Paragraph('Fournisseur', style_section))
    four_data = [
        ['Société', 'Email', 'Adresse'],
        [fournisseur.nom_societe, fournisseur.email, fournisseur.adresse or '—'],
    ]
    four_table = Table(four_data, colWidths=[55 * mm, 65 * mm, None])
    four_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  BLEU),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  BLANC),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('BACKGROUND',    (0, 1), (-1, 1),  BLEU_CLAR),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#CFD8DC')),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(four_table)
    story.append(Spacer(1, 12))

    # ── Tableau des médicaments ───────────────────────────────────────────────
    story.append(Paragraph('Détail des articles commandés', style_section))

    med_header = ['Médicament', 'DCI', 'Qté\ncommandée', 'Qté\nreçue',
                  'Prix achat\n(FCFA)', 'Total\n(FCFA)']
    med_rows   = [med_header]

    for ligne in commande.lignes.all():
        # ✅ CORRECTION : prix_achat_fournisseur
        prix  = ligne.prix_achat_fournisseur
        total = ligne.quantite_commandee * prix
        med_rows.append([
            ligne.medicament.nom_commercial,
            ligne.medicament.dci or '—',
            str(ligne.quantite_commandee),
            str(ligne.quantite_recue or 0),
            f'{prix:,.0f}',
            f'{total:,.0f}',
        ])

    # Ligne total
    med_rows.append([
        '', '', '', '',
        Paragraph('<b>MONTANT TOTAL</b>', ParagraphStyle(
            'Tot', fontSize=10, textColor=BLEU, alignment=TA_RIGHT
        )),
        Paragraph(f'<b>{commande.montant_total:,.0f} FCFA</b>', ParagraphStyle(
            'TotVal', fontSize=10, textColor=BLEU, alignment=TA_RIGHT
        )),
    ])

    med_table = Table(
        med_rows,
        colWidths=[55 * mm, 30 * mm, 22 * mm, 20 * mm, 28 * mm, 28 * mm],
    )
    med_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  BLEU),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  BLANC),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('ALIGN',         (2, 0), (-1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS',(0, 1), (-1, -2), [BLANC, BLEU_CLAR]),
        ('GRID',          (0, 0), (-1, -2), 0.5, colors.HexColor('#CFD8DC')),
        ('LINEABOVE',     (0, -1), (-1, -1), 1.5, BLEU),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 20))

    # ── Signature ─────────────────────────────────────────────────────────────
    try:
        from cliniqueApp.rapports.models import Signature
        sig = Signature.objects.first()
        if sig and sig.image_b64:
            raw = sig.image_b64
            if ',' in raw:
                _, raw = raw.split(',', 1)
            sig_bytes  = base64.b64decode(raw)
            sig_stream = BytesIO(sig_bytes)
            sig_img    = Image(sig_stream, width=50 * mm, height=20 * mm)

            sig_data = [[
                Paragraph(
                    f'Document généré le {timezone.now().strftime("%d/%m/%Y à %H:%M")}',
                    ParagraphStyle('GenPar', fontSize=8, textColor=GRIS)
                ),
                [
                    sig_img,
                    Paragraph(f'<b>{sig.nom}</b>', ParagraphStyle(
                        'SigNom', fontSize=9, textColor=BLEU, alignment=TA_CENTER
                    )),
                    Paragraph(sig.fonction, ParagraphStyle(
                        'SigFonc', fontSize=8, textColor=GRIS, alignment=TA_CENTER
                    )),
                ],
            ]]
            sig_table = Table(sig_data, colWidths=[None, 60 * mm])
            sig_table.setStyle(TableStyle([
                ('VALIGN',  (0, 0), (-1, -1), 'BOTTOM'),
                ('ALIGN',   (1, 0), (1, 0),   'RIGHT'),
                ('TOPPADDING',    (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(HRFlowable(width='100%', thickness=1, color=BLEU_CLAR))
            story.append(Spacer(1, 6))
            story.append(sig_table)
    except Exception as e:
        print(f'[PDF SIGNATURE] {e}')

    doc.build(story)
    buffer.seek(0)
    return buffer


# ─────────────────────────────────────────────────────────────────────────────
# Envoi email avec PDF joint
# ─────────────────────────────────────────────────────────────────────────────

def _envoyer_email_avec_pdf(
    sujet: str,
    corps_html: str,
    destinataire: str,
    pdf_buffer: BytesIO | None = None,
    nom_pdf: str = 'document.pdf',
):
    """Envoie un email HTML avec optionnellement un PDF joint."""
    try:
        msg = EmailMessage(
            subject=sujet,
            body=corps_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[destinataire],
        )
        msg.content_subtype = 'html'  # Corps en HTML

        if pdf_buffer is not None:
            pdf_buffer.seek(0)
            msg.attach(nom_pdf, pdf_buffer.read(), 'application/pdf')

        msg.send(fail_silently=False)
        print(f'[EMAIL] Envoyé à {destinataire} — sujet : {sujet}')
    except Exception as e:
        print(f'[EMAIL ERROR] {e}')


# ─────────────────────────────────────────────────────────────────────────────
# ViewSets
# ─────────────────────────────────────────────────────────────────────────────

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
        etat = 'activé' if fournisseur.est_actif else 'désactivé'
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
        if commande.statut in ['LIVREE', 'ANNULEE']:
            try:
                ref = commande.reference
                commande.delete()
                try:
                    from cliniqueApp.rapports.models import JournalAudit
                    JournalAudit.objects.create(
                        action='SUPPRESSION_COMMANDE',
                        entite_concernee=f'Commande : {ref}',
                        nouvelle_valeur={'statut': 'SUPPRIMEE'},
                        utilisateur=request.user,
                        adresse_ip=request.META.get('REMOTE_ADDR'),
                    )
                except Exception:
                    pass
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response(
                    {'error': f'Erreur lors de la suppression : {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if timezone.now() >= commande.date_creation + timedelta(hours=24):
            return Response(
                {'error': 'Suppression impossible après 24h.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if commande.statut not in [Commande.Statut.BROUILLON, Commande.Statut.EN_ATTENTE]:
            return Response(
                {'error': 'Commande non supprimable dans ce statut.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            commande.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'], url_path='supprimer_plusieurs')
    def supprimer_plusieurs(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=400)
        try:
            commandes = Commande.objects.filter(id__in=ids, statut__in=['LIVREE', 'ANNULEE'])
            count     = commandes.count()
            if count == 0:
                return Response({'error': 'Aucune commande éligible trouvée.'}, status=400)
            for cmd in commandes:
                ref = cmd.reference
                cmd.delete()
                try:
                    from cliniqueApp.rapports.models import JournalAudit
                    JournalAudit.objects.create(
                        action='SUPPRESSION_COMMANDE',
                        entite_concernee=f'Commande : {ref}',
                        nouvelle_valeur={'statut': 'SUPPRIMEE', 'groupee': True},
                        utilisateur=request.user,
                        adresse_ip=request.META.get('REMOTE_ADDR'),
                    )
                except Exception:
                    pass
            return Response({'message': f'{count} commande(s) supprimée(s).'})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    # ── PATCH /commandes/{id}/envoyer/ ────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='envoyer')
    def envoyer(self, request, pk=None):
        commande = self.get_object()
        if commande.statut not in [Commande.Statut.BROUILLON, Commande.Statut.EN_ATTENTE]:
            return Response(
                {'error': 'Commande déjà envoyée ou clôturée.'},
                status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
            )
        commande.statut = Commande.Statut.LIVREE
        commande.save()
        self._envoyer_email_cloture(commande)
        return Response({
            'message': f'Commande {commande.reference} clôturée.',
            'statut':  commande.statut,
        })

    # =========================================================================
    # Utilitaires Infobip (inchangés)
    # =========================================================================

    def _infobip_headers(self):
        return {
            'Authorization': f'App {settings.INFOBIP_API_KEY}',
            'Content-Type':  'application/json',
            'Accept':        'application/json',
        }

    def _normaliser_telephone(self, contact_brut):
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
        fournisseur = commande.fournisseur
        phone       = self._normaliser_telephone(fournisseur.contact)
        if not phone:
            print(f'[SMS] Pas de numéro valide pour {fournisseur.nom_societe}')
            return

        nb_articles    = commande.lignes.count()
        date_livraison = (
            commande.date_livraison_prevue.strftime('%d/%m/%Y')
            if commande.date_livraison_prevue else 'non precisee'
        )
        sms_body = (
            f'[CliniqueStock] Commande {commande.reference}\n'
            f'{nb_articles} article(s) - {commande.montant_total} FCFA\n'
            f'Livraison: {date_livraison}\n'
            f'Details par email.'
        )
        url     = f'https://{settings.INFOBIP_BASE_URL}/sms/2/text/advanced'
        payload = {
            'messages': [{
                'from':         settings.INFOBIP_SENDER_SMS,
                'destinations': [{'to': phone}],
                'text':         sms_body,
            }]
        }
        try:
            response = requests.post(url, json=payload, headers=self._infobip_headers(), timeout=10)
            response.raise_for_status()
            print(f'[SMS Infobip] Envoyé à {phone}')
        except Exception as e:
            print(f'[SMS Infobip ERROR] {e}')

    def _envoyer_whatsapp_fournisseur(self, commande):
        fournisseur = commande.fournisseur
        phone       = self._normaliser_telephone(fournisseur.contact)
        if not phone:
            return

        nb_articles    = commande.lignes.count()
        date_livraison = (
            commande.date_livraison_prevue.strftime('%d/%m/%Y')
            if commande.date_livraison_prevue else 'non precisee'
        )
        url     = f'https://{settings.INFOBIP_BASE_URL}/whatsapp/1/message/template'
        payload = {
            'messages': [{
                'from': settings.INFOBIP_SENDER_WHATSAPP,
                'to':   phone,
                'content': {
                    'templateName': settings.INFOBIP_WA_TEMPLATE_NAME,
                    'templateData': {
                        'body': {
                            'placeholders': [
                                commande.reference,
                                str(nb_articles),
                                str(commande.montant_total),
                                date_livraison,
                            ]
                        }
                    },
                    'language': settings.INFOBIP_WA_TEMPLATE_LANG,
                }
            }]
        }
        try:
            response = requests.post(url, json=payload, headers=self._infobip_headers(), timeout=10)
            response.raise_for_status()
            print(f'[WA Infobip] Envoyé à {phone}')
        except Exception as e:
            print(f'[WA Infobip ERROR] {e}')

    # =========================================================================
    # Emails HTML — ✅ prix_unitaire_estime → prix_achat_fournisseur
    # =========================================================================

    def _envoyer_email_fournisseur(self, commande):
        """Email HTML de nouvelle commande + PDF joint."""
        try:
            fournisseur    = commande.fournisseur
            date_livraison = (
                commande.date_livraison_prevue.strftime('%d/%m/%Y')
                if commande.date_livraison_prevue else 'Non précisée'
            )

            corps = f"""<!DOCTYPE html><html><head>{_style_email()}</head><body>
            <div class="wrapper">
            {_html_header('Nouvelle commande', f'Commande {commande.reference}')}
            <p>Bonjour <strong>{fournisseur.nom_societe}</strong>,</p>
            <p>Une nouvelle commande vous a été adressée via <strong>CliniqueStock</strong>.</p>
            <h2>Récapitulatif</h2>
            {_html_info_grid([
                ('Référence',        commande.reference),
                ('Date de commande', commande.date_creation.strftime('%d/%m/%Y à %H:%M')),
                ('Date de livraison prévue', date_livraison),
                ('Montant total',    f'{commande.montant_total:,.0f} FCFA'),
            ])}
            <h2>Médicaments commandés</h2>
            {_html_tableau_lignes(commande)}
            <p>Merci de confirmer la réception de cette commande.</p>
            {_html_footer()}
            </div></body></html>"""

            pdf = _generer_pdf_commande(commande, 'BON DE COMMANDE')
            _envoyer_email_avec_pdf(
                sujet=f'[CliniqueStock] Nouvelle commande {commande.reference}',
                corps_html=corps,
                destinataire=fournisseur.email,
                pdf_buffer=pdf,
                nom_pdf=f'commande-{commande.reference}.pdf',
            )
        except Exception as e:
            print(f'[EMAIL COMMANDE ERROR] {e}')

    def _envoyer_email_annulation(self, commande):
        """Email HTML d'annulation."""
        try:
            fournisseur = commande.fournisseur
            corps = f"""<!DOCTYPE html><html><head>{_style_email()}</head><body>
            <div class="wrapper">
            {_html_header('Annulation de commande', f'Commande {commande.reference}')}
            <p>Bonjour <strong>{fournisseur.nom_societe}</strong>,</p>
            <p>Nous vous informons que la commande <strong>{commande.reference}</strong>
               passée le <strong>{commande.date_creation.strftime('%d/%m/%Y')}</strong>
               a été <span style="color:#C62828;font-weight:700">annulée</span>.</p>
            {_html_info_grid([
                ('Référence',  commande.reference),
                ('Statut',     'ANNULÉE'),
                ('Date',       commande.date_creation.strftime('%d/%m/%Y')),
                ('Montant',    f'{commande.montant_total:,.0f} FCFA'),
            ])}
            <p>Si vous avez déjà effectué des préparatifs pour cette commande,
               veuillez nous contacter directement afin de convenir d'une solution.</p>
            {_html_footer()}
            </div></body></html>"""

            _envoyer_email_avec_pdf(
                sujet=f'[CliniqueStock] Annulation commande {commande.reference}',
                corps_html=corps,
                destinataire=fournisseur.email,
            )
        except Exception as e:
            print(f'[EMAIL ANNULATION ERROR] {e}')

    def _envoyer_email_cloture(self, commande):
        """Email HTML de clôture + PDF joint."""
        try:
            fournisseur = commande.fournisseur
            corps = f"""<!DOCTYPE html><html><head>{_style_email()}</head><body>
            <div class="wrapper">
            {_html_header('Clôture de commande', f'Commande {commande.reference}')}
            <p>Bonjour <strong>{fournisseur.nom_societe}</strong>,</p>
            <p>La commande <strong>{commande.reference}</strong> a été
               <span style="color:#2E7D32;font-weight:700">clôturée avec succès</span>
               dans notre système.</p>
            {_html_info_grid([
                ('Référence',  commande.reference),
                ('Statut',     'CLÔTURÉE'),
                ('Date',       commande.date_creation.strftime('%d/%m/%Y')),
                ('Montant total', f'{commande.montant_total:,.0f} FCFA'),
            ])}
            <h2>Récapitulatif final</h2>
            {_html_tableau_lignes(commande)}
            <p>Merci pour votre collaboration.</p>
            {_html_footer()}
            </div></body></html>"""

            pdf = _generer_pdf_commande(commande, 'DOCUMENT DE CLÔTURE')
            _envoyer_email_avec_pdf(
                sujet=f'[CliniqueStock] Clôture commande {commande.reference}',
                corps_html=corps,
                destinataire=fournisseur.email,
                pdf_buffer=pdf,
                nom_pdf=f'cloture-{commande.reference}.pdf',
            )
        except Exception as e:
            print(f'[EMAIL CLOTURE ERROR] {e}')

    def _construire_recap_lignes(self, commande) -> str:
        """Texte brut récapitulatif (utilisé uniquement en fallback)."""
        lignes_text = ''
        for ligne in commande.lignes.all():
            # ✅ CORRECTION : prix_achat_fournisseur
            total_ligne = ligne.quantite_commandee * ligne.prix_achat_fournisseur
            lignes_text += (
                f'  - {ligne.medicament.nom_commercial} '
                f'({ligne.medicament.dci}) | '
                f'Qte commandee: {ligne.quantite_commandee} | '
                f'Qte recue: {ligne.quantite_recue} | '
                f'Prix achat: {ligne.prix_achat_fournisseur} FCFA | '
                f'Total: {total_ligne} FCFA\n'
            )
        return lignes_text

    def _envoyer_email_reception(self, commande, reception, lignes_data):
        """
        Email HTML de compte rendu de réception.
        Appelé depuis stock/views.py.
        """
        try:
            fournisseur    = commande.fournisseur
            date_livraison = (
                commande.date_livraison_prevue.strftime('%d/%m/%Y')
                if commande.date_livraison_prevue else 'Non précisée'
            )

            TYPES_ANOMALIE = {
                'PRODUIT_NON_CONFORME':    'Produit non conforme',
                'MEDICAMENT_ENDOMMAGE':    'Médicament endommagé',
                'PEREMPTION_INSUFFISANTE': 'Péremption insuffisante (< 6 mois)',
                'QUANTITE_MANQUANTE':      'Quantité manquante',
            }

            a_anomalies  = any(l.get('has_anomalie') for l in lignes_data)
            statut_label = {
                'LIVREE':    'COMPLÈTEMENT LIVRÉE',
                'PARTIELLE': 'PARTIELLEMENT LIVRÉE',
            }.get(commande.statut, commande.statut)

            # Tableau réception HTML
            tableau_html = """
            <table>
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Qté commandée</th>
                  <th>Qté reçue</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
            """
            for l in lignes_data:
                if l.get('has_anomalie'):
                    label = TYPES_ANOMALIE.get(l.get('type_anomalie', ''), 'Anomalie')
                    desc  = l.get('description_anomalie', '')
                    badge = f'<span class="badge badge-err">⚠ {label}{" — " + desc if desc else ""}</span>'
                else:
                    badge = '<span class="badge badge-ok">✓ OK</span>'

                tableau_html += f"""
                <tr>
                  <td><strong>{l['medicament_nom']}</strong></td>
                  <td style="text-align:center">{l['quantite_commandee']}</td>
                  <td style="text-align:center">{l['quantite_recue']}</td>
                  <td>{badge}</td>
                </tr>"""

            tableau_html += '</tbody></table>'

            sujet = (
                f'[CliniqueStock] ⚠ Réception partielle — {commande.reference}'
                if a_anomalies
                else f'[CliniqueStock] ✓ Réception enregistrée — {commande.reference}'
            )

            corps = f"""<!DOCTYPE html><html><head>{_style_email()}</head><body>
            <div class="wrapper">
            {_html_header('Réception enregistrée', f'Commande {commande.reference}')}
            <p>Bonjour <strong>{fournisseur.nom_societe}</strong>,</p>
            <p>Nous avons enregistré la réception de votre livraison.</p>
            {_html_info_grid([
                ('Statut de la commande', statut_label),
                ('Référence',             commande.reference),
                ('Date de livraison',     date_livraison),
                ('Bon de livraison',      reception.numero_bon_livraison if hasattr(reception, 'numero_bon_livraison') else '—'),
            ])}
            <h2>Détail de la réception</h2>
            {tableau_html}
            {'<p style="color:#C62828"><strong>⚠ Des anomalies ont été détectées.</strong> Merci de prendre contact si nécessaire.</p>' if a_anomalies else ''}
            {_html_footer()}
            </div></body></html>"""

            _envoyer_email_avec_pdf(
                sujet=sujet,
                corps_html=corps,
                destinataire=fournisseur.email,
            )
        except Exception as e:
            print(f'[EMAIL RECEPTION ERROR] {e}')