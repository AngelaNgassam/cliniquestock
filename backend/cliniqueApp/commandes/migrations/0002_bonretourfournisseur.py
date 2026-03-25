from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("commandes", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BonRetourFournisseur",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=80, unique=True)),
                ("date_creation", models.DateTimeField(auto_now_add=True)),
                ("motif", models.TextField()),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("BROUILLON", "Brouillon"),
                            ("ENVOYE", "Envoye"),
                            ("TRAITE", "Traite"),
                            ("ANNULE", "Annule"),
                        ],
                        default="BROUILLON",
                        max_length=20,
                    ),
                ),
                (
                    "cree_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bons_retour_crees",
                        to="users.utilisateur",
                    ),
                ),
                (
                    "fournisseur",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bons_retour",
                        to="commandes.fournisseur",
                    ),
                ),
            ],
            options={
                "db_table": "bon_retour_fournisseur",
                "ordering": ["-date_creation"],
            },
        ),
    ]
