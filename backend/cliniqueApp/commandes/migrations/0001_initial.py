from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("medicaments", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Fournisseur",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nom_societe", models.CharField(max_length=150)),
                ("contact", models.CharField(max_length=150)),
                ("email", models.EmailField(max_length=254)),
                ("adresse", models.TextField()),
                ("est_actif", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "fournisseur",
                "ordering": ["nom_societe"],
            },
        ),
        migrations.CreateModel(
            name="Commande",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=80, unique=True)),
                ("date_creation", models.DateTimeField(auto_now_add=True)),
                ("date_livraison_prevue", models.DateField(blank=True, null=True)),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("BROUILLON", "Brouillon"),
                            ("EN_ATTENTE", "En attente"),
                            ("PARTIELLE", "Partielle"),
                            ("LIVREE", "Livree"),
                            ("ANNULEE", "Annulee"),
                        ],
                        default="EN_ATTENTE",
                        max_length=20,
                    ),
                ),
                ("montant_total", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                (
                    "cree_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="commandes_creees",
                        to="users.utilisateur",
                    ),
                ),
                (
                    "fournisseur",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="commandes",
                        to="commandes.fournisseur",
                    ),
                ),
            ],
            options={
                "db_table": "commande",
                "ordering": ["-date_creation"],
            },
        ),
        migrations.CreateModel(
            name="LigneCommande",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantite_commandee", models.PositiveIntegerField()),
                ("quantite_recue", models.PositiveIntegerField(default=0)),
                ("prix_unitaire_estime", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "commande",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lignes",
                        to="commandes.commande",
                    ),
                ),
                (
                    "medicament",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lignes_commande",
                        to="medicaments.medicament",
                    ),
                ),
            ],
            options={
                "db_table": "ligne_commande",
            },
        ),
        migrations.AddConstraint(
            model_name="lignecommande",
            constraint=models.UniqueConstraint(
                fields=("commande", "medicament"),
                name="unique_ligne_commande_par_medicament",
            ),
        ),
    ]
