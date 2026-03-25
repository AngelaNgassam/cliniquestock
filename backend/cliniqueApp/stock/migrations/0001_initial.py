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
            name="LotStock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("numero_lot", models.CharField(max_length=100)),
                ("date_peremption", models.DateField()),
                ("quantite_disponible", models.PositiveIntegerField(default=0)),
                ("quantite_quarantaine", models.PositiveIntegerField(default=0)),
                ("prix_achat", models.DecimalField(decimal_places=2, max_digits=12)),
                ("date_reception", models.DateField()),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("DISPONIBLE", "Disponible"),
                            ("QUARANTAINE", "Quarantaine"),
                            ("EPUISE", "Epuise"),
                            ("EXPIRE", "Expire"),
                        ],
                        default="DISPONIBLE",
                        max_length=20,
                    ),
                ),
                (
                    "medicament",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lots",
                        to="medicaments.medicament",
                    ),
                ),
            ],
            options={
                "db_table": "lot_stock",
            },
        ),
        migrations.CreateModel(
            name="MouvementStock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "type_mouvement",
                    models.CharField(
                        choices=[
                            ("ENTREE", "Entree"),
                            ("SORTIE", "Sortie"),
                            ("AJUSTEMENT", "Ajustement"),
                            ("TRANSFERT", "Transfert"),
                        ],
                        max_length=20,
                    ),
                ),
                ("type_motif", models.CharField(max_length=100)),
                ("quantite", models.PositiveIntegerField()),
                ("date_operation", models.DateTimeField(auto_now_add=True)),
                ("numero_ordre", models.CharField(blank=True, max_length=100)),
                ("patient_nom", models.CharField(blank=True, max_length=150)),
                ("prescripteur", models.CharField(blank=True, max_length=150)),
                ("commentaire", models.TextField(blank=True)),
                (
                    "lot",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="mouvements",
                        to="stock.lotstock",
                    ),
                ),
                (
                    "operateur",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="mouvements_stock",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "mouvement_stock",
                "ordering": ["-date_operation"],
            },
        ),
        migrations.AddConstraint(
            model_name="lotstock",
            constraint=models.UniqueConstraint(
                fields=("medicament", "numero_lot"),
                name="unique_lot_par_medicament",
            ),
        ),
    ]
