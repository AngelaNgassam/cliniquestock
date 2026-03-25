from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commandes", "0002_bonretourfournisseur"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="commande",
            index=models.Index(fields=["statut"], name="commande_statut_idx"),
        ),
        migrations.AddIndex(
            model_name="commande",
            index=models.Index(fields=["date_creation"], name="commande_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="commande",
            constraint=models.CheckConstraint(
                check=models.Q(montant_total__gte=0),
                name="commande_montant_total_gte_0",
            ),
        ),
        migrations.AddConstraint(
            model_name="lignecommande",
            constraint=models.CheckConstraint(
                check=models.Q(prix_unitaire_estime__gte=0),
                name="ligne_commande_prix_gte_0",
            ),
        ),
        migrations.AddConstraint(
            model_name="lignecommande",
            constraint=models.CheckConstraint(
                check=models.Q(quantite_recue__lte=models.F("quantite_commandee")),
                name="ligne_commande_recue_lte_commandee",
            ),
        ),
        migrations.AddIndex(
            model_name="bonretourfournisseur",
            index=models.Index(fields=["statut"], name="bon_retour_statut_idx"),
        ),
        migrations.AddIndex(
            model_name="bonretourfournisseur",
            index=models.Index(fields=["date_creation"], name="bon_retour_date_idx"),
        ),
    ]
