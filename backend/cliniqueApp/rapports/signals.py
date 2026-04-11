# backend/cliniqueApp/rapports/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


def enregistrer_action(action: str, entite: str, nouvelle_valeur: dict,
                        utilisateur=None, ancienne_valeur: dict = None, ip: str = None):
    """Utilitaire pour créer une entrée dans le journal d'audit."""
    try:
        from .models import JournalAudit
        JournalAudit.objects.create(
            action=action,
            entite_concernee=entite,
            ancienne_valeur=ancienne_valeur,
            nouvelle_valeur=nouvelle_valeur,
            utilisateur=utilisateur,
            adresse_ip=ip,
        )
    except Exception as e:
        print(f'[JOURNAL SIGNAL] Erreur : {e}')


# ── Signal : Médicament créé ou modifié ──────────────────────────────────────
@receiver(post_save, sender='medicaments.Medicament')
def journal_medicament(sender, instance, created, **kwargs):
    action = 'CREATION_MEDICAMENT' if created else 'MODIFICATION_MEDICAMENT'
    enregistrer_action(
        action=action,
        entite=f'Médicament : {instance.nom_commercial}',
        nouvelle_valeur={
            'nom':      instance.nom_commercial,
            'dci':      instance.dci,
            'stock':    instance.seuil_alerte,
            'est_actif': instance.est_actif,
        },
    )


# ── Signal : Fournisseur créé ou modifié ─────────────────────────────────────
@receiver(post_save, sender='commandes.Fournisseur')
def journal_fournisseur(sender, instance, created, **kwargs):
    action = 'CREATION_FOURNISSEUR' if created else 'MODIFICATION_FOURNISSEUR'
    enregistrer_action(
        action=action,
        entite=f'Fournisseur : {instance.nom_societe}',
        nouvelle_valeur={
            'nom':      instance.nom_societe,
            'email':    instance.email,
            'contact':  instance.contact,
            'est_actif': instance.est_actif,
        },
    )


# ── Signal : Commande créée ───────────────────────────────────────────────────
@receiver(post_save, sender='commandes.Commande')
def journal_commande(sender, instance, created, **kwargs):
    if created:
        enregistrer_action(
            action='CREATION_COMMANDE',
            entite=f'Commande : {instance.reference}',
            nouvelle_valeur={
                'reference':    instance.reference,
                'fournisseur':  instance.fournisseur.nom_societe if instance.fournisseur else '—',
                'montant':      float(instance.montant_total),
                'statut':       instance.statut,
            },
        )
    else:
        enregistrer_action(
            action=f'MISE_A_JOUR_COMMANDE_{instance.statut}',
            entite=f'Commande : {instance.reference}',
            nouvelle_valeur={'statut': instance.statut},
        )


# ── Signal : Mouvement de stock ───────────────────────────────────────────────
@receiver(post_save, sender='stock.MouvementStock')
def journal_mouvement(sender, instance, created, **kwargs):
    if not created:
        return
    action = {
        'ENTREE':     'ENTREE_STOCK',
        'SORTIE':     'SORTIE_STOCK',
        'AJUSTEMENT': 'AJUSTEMENT_STOCK',
        'TRANSFERT':  'TRANSFERT_STOCK',
    }.get(instance.type_mouvement, 'MOUVEMENT_STOCK')

    enregistrer_action(
        action=action,
        entite=f'Médicament : {instance.lot.medicament.nom_commercial}',
        nouvelle_valeur={
            'type':      instance.type_mouvement,
            'quantite':  instance.quantite,
            'lot':       instance.lot.numero_lot,
            'motif':     instance.type_motif,
            'operateur': instance.operateur.nom if instance.operateur else '—',
            'patient':   instance.patient_nom or '—',
        },
        utilisateur=instance.operateur,
    )


# ── Signal : Réception créée ──────────────────────────────────────────────────
@receiver(post_save, sender='stock.Reception')
def journal_reception(sender, instance, created, **kwargs):
    if not created:
        return
    enregistrer_action(
        action='RECEPTION_LIVRAISON',
        entite=f'Bon : {instance.numero_bon_livraison}',
        nouvelle_valeur={
            'bon_livraison': instance.numero_bon_livraison,
            'statut':        instance.statut,
            'commande':      instance.commande.reference if instance.commande else '—',
        },
        utilisateur=instance.enregistre_par,
    )


# ── Signal : Alerte résolue ───────────────────────────────────────────────────
@receiver(post_save, sender='alertes.Alerte')
def journal_alerte(sender, instance, created, **kwargs):
    if created:
        return  # On ne logue pas la création
    # Logguer seulement quand est_lue passe à True
    if instance.est_lue:
        enregistrer_action(
            action='RESOLUTION_ALERTE',
            entite=f'Alerte : {instance.type_alerte}',
            nouvelle_valeur={
                'type':    instance.type_alerte,
                'message': instance.message[:80],
                'resolue': True,
            },
            utilisateur=instance.destinataire,
        )