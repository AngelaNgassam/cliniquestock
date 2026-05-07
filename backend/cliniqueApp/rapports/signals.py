# backend/cliniqueApp/rapports/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver


def _journal(action, entite, nouvelle_valeur, utilisateur=None, ancienne_valeur=None, ip=None):
    """Crée une entrée dans le journal d'audit de façon silencieuse."""
    try:
        from cliniqueApp.rapports.models import JournalAudit
        JournalAudit.objects.create(
            action=action,
            entite_concernee=entite,
            ancienne_valeur=ancienne_valeur,
            nouvelle_valeur=nouvelle_valeur,
            utilisateur=utilisateur,
            adresse_ip=ip,
        )
    except Exception as e:
        print(f'[JOURNAL] {e}')


# ── Importer les modèles avec les bons labels ─────────────────────────────────
def connect_signals():
    from cliniqueApp.medicaments.models import Medicament
    from cliniqueApp.commandes.models import Fournisseur, Commande
    from cliniqueApp.stock.models import MouvementStock, Reception
    from cliniqueApp.alertes.models import Alerte

    @receiver(post_save, sender=Medicament, weak=False)
    def journal_medicament(sender, instance, created, **kwargs):
        _journal(
            action='CREATION_MEDICAMENT' if created else 'MODIFICATION_MEDICAMENT',
            entite=f'Médicament : {instance.nom_commercial}',
            nouvelle_valeur={'nom': instance.nom_commercial, 'dci': instance.dci},
            # Pas d'utilisateur ici — viendra de la vue
        )

    @receiver(post_save, sender=Fournisseur, weak=False)
    def journal_fournisseur(sender, instance, created, **kwargs):
        _journal(
            action='CREATION_FOURNISSEUR' if created else 'MODIFICATION_FOURNISSEUR',
            entite=f'Fournisseur : {instance.nom_societe}',
            nouvelle_valeur={'nom': instance.nom_societe, 'email': instance.email},
        )

    @receiver(post_save, sender=Commande, weak=False)
    def journal_commande(sender, instance, created, **kwargs):
        _journal(
            action='CREATION_COMMANDE' if created else 'MISE_A_JOUR_COMMANDE',
            entite=f'Commande : {instance.reference}',
            nouvelle_valeur={'statut': instance.statut, 'reference': instance.reference},
            # Utiliser cree_par comme utilisateur
            utilisateur=instance.cree_par if hasattr(instance, 'cree_par') else None,
        )

    @receiver(post_save, sender=MouvementStock, weak=False)
    def journal_mouvement(sender, instance, created, **kwargs):
        if not created:
            return
        action_map = {
            'ENTREE': 'ENTREE_STOCK', 'SORTIE': 'SORTIE_STOCK',
            'AJUSTEMENT': 'AJUSTEMENT_STOCK', 'TRANSFERT': 'TRANSFERT_STOCK',
        }
        _journal(
            action=action_map.get(instance.type_mouvement, 'MOUVEMENT_STOCK'),
            entite=f'Médicament : {instance.lot.medicament.nom_commercial}',
            nouvelle_valeur={
                'type': instance.type_mouvement, 'quantite': instance.quantite,
                'lot': instance.lot.numero_lot, 'motif': instance.type_motif,
            },
            utilisateur=instance.operateur,  #  opérateur = utilisateur réel
        )

    @receiver(post_save, sender=Reception, weak=False)
    def journal_reception(sender, instance, created, **kwargs):
        if not created:
            return
        _journal(
            action='RECEPTION_LIVRAISON',
            entite=f'Bon : {instance.numero_bon_livraison}',
            nouvelle_valeur={'bon': instance.numero_bon_livraison, 'statut': instance.statut},
            utilisateur=instance.enregistre_par,  #  enregistré par = utilisateur réel
        )

    #  Alerte résolue 
    @receiver(post_save, sender=Alerte, weak=False)
    def journal_alerte(sender, instance, created, **kwargs):
        if created or not instance.est_lue:
            return
        _journal(
            action='RESOLUTION_ALERTE',
            entite=f'Alerte : {instance.type_alerte}',
            nouvelle_valeur={
                'type':    instance.type_alerte,
                'message': instance.message[:80],
                'resolue': True,
            },
            utilisateur=instance.destinataire,
        )