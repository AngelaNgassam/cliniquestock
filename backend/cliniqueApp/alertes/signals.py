from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta


def creer_alerte(destinataire, type_alerte, niveau_urgence, message):
    """Crée une alerte si elle n'existe pas déjà (évite les doublons)."""
    from .models import Alerte
    existe = Alerte.objects.filter(
        destinataire=destinataire,
        type_alerte=type_alerte,
        est_lue=False,
        message__contains=message[:50],
    ).exists()
    if not existe:
        Alerte.objects.create(
            type_alerte=type_alerte,
            niveau_urgence=niveau_urgence,
            message=message,
            destinataire=destinataire,
            est_lue=False,
        )


def resoudre_alerte_stock(medicament, destinataire):
    """Résout les alertes stock faible quand le stock remonte."""
    from .models import Alerte
    Alerte.objects.filter(
        destinataire=destinataire,
        type_alerte=Alerte.TypeAlerte.STOCK_BAS,
        est_lue=False,
        message__contains=medicament.nom_commercial,
    ).update(est_lue=True)


# ── Signal : Lot de stock créé ou modifié ─────────────────────────────────────
@receiver(post_save, sender='stock.LotStock')
def verifier_peremption_lot(sender, instance, created, **kwargs):
    """Crée une alerte si un lot expire dans moins de 6 mois."""
    from cliniqueApp.users.models import Utilisateur
    from .models import Alerte

    today          = timezone.now().date()
    date_peremption = instance.date_peremption
    delta           = (date_peremption - today).days

    # Récupérer tous les admins pour leur notifier
    admins = Utilisateur.objects.filter(role='ADMINISTRATEUR', est_actif=True)

    if delta <= 0:
        # Lot périmé
        for admin in admins:
            creer_alerte(
                destinataire=admin,
                type_alerte=Alerte.TypeAlerte.PEREMPTION,
                niveau_urgence=Alerte.NiveauUrgence.CRITIQUE,
                message=(
                    f"Lot {instance.numero_lot} du médicament "
                    f"{instance.medicament.nom_commercial} est périmé "
                    f"depuis le {date_peremption.strftime('%d/%m/%Y')}. "
                    f"Stock concerné : {instance.quantite_disponible} unités."
                )
            )
    elif delta <= 30:
        # Expire dans moins de 30 jours → critique
        for admin in admins:
            creer_alerte(
                destinataire=admin,
                type_alerte=Alerte.TypeAlerte.PEREMPTION,
                niveau_urgence=Alerte.NiveauUrgence.CRITIQUE,
                message=(
                    f"Lot {instance.numero_lot} — {instance.medicament.nom_commercial} "
                    f"expire dans {delta} jour(s) (le {date_peremption.strftime('%d/%m/%Y')}). "
                    f"Quantité : {instance.quantite_disponible} unités."
                )
            )
    elif delta <= 180:
        # Expire dans moins de 6 mois → avertissement
        for admin in admins:
            creer_alerte(
                destinataire=admin,
                type_alerte=Alerte.TypeAlerte.PEREMPTION,
                niveau_urgence=Alerte.NiveauUrgence.MOYEN,
                message=(
                    f"Lot {instance.numero_lot} — {instance.medicament.nom_commercial} "
                    f"expire dans {delta} jour(s) (le {date_peremption.strftime('%d/%m/%Y')}). "
                    f"Quantité : {instance.quantite_disponible} unités."
                )
            )