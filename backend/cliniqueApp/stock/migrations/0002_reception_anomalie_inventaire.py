from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("commandes", "0001_initial"),
        ("medicaments", "0001_initial"),
        ("stock", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Inventaire",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_debut", models.DateTimeField()),
                ("date_fin", models.DateTimeField(blank=True, null=True)),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("PLANIFIE", "Planifie"),
                            ("EN_COURS", "En cours"),
                            ("CLOTURE", "Cloture"),
                        ],
                        default="PLANIFIE",
                        max_length=20,
                    ),
                ),
                (
                    "initie_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="inventaires_inities",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "inventaire",
                "ordering": ["-date_debut"],
            },
        ),
        migrations.CreateModel(
            name="Reception",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_reception", models.DateTimeField()),
                ("numero_bon_livraison", models.CharField(max_length=100, unique=True)),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("EN_ATTENTE", "En attente"),
                            ("PARTIELLE", "Partielle"),
                            ("COMPLETE", "Complete"),
                        ],
                        default="EN_ATTENTE",
                        max_length=20,
                    ),
                ),
                (
                    "commande",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="receptions",
                        to="commandes.commande",
                    ),
                ),
                (
                    "enregistre_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="receptions_enregistrees",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "reception",
                "ordering": ["-date_reception"],
            },
        ),
        migrations.CreateModel(
            name="LigneReception",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantite_recue", models.PositiveIntegerField()),
                ("numero_lot", models.CharField(max_length=100)),
                ("date_peremption", models.DateField()),
                ("prix_achat_reel", models.DecimalField(decimal_places=2, max_digits=12)),
                ("has_anomalie", models.BooleanField(default=False)),
                (
                    "medicament",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lignes_reception",
                        to="medicaments.medicament",
                    ),
                ),
                (
                    "reception",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lignes",
                        to="stock.reception",
                    ),
                ),
            ],
            options={
                "db_table": "ligne_reception",
            },
        ),
        migrations.CreateModel(
            name="Anomalie",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type_anomalie", models.CharField(max_length=100)),
                ("description", models.TextField()),
                ("date_signalement", models.DateTimeField(auto_now_add=True)),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("OUVERTE", "Ouverte"),
                            ("EN_COURS", "En cours"),
                            ("RESOLUE", "Resolue"),
                        ],
                        default="OUVERTE",
                        max_length=20,
                    ),
                ),
                (
                    "ligne_reception",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="anomalies",
                        to="stock.lignereception",
                    ),
                ),
                (
                    "signale_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="anomalies_signalees",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "anomalie",
                "ordering": ["-date_signalement"],
            },
        ),
    ]
