from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Categorie",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nom", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
            ],
            options={
                "db_table": "categorie",
                "ordering": ["nom"],
            },
        ),
        migrations.CreateModel(
            name="Medicament",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nom_commercial", models.CharField(max_length=150)),
                ("dci", models.CharField(max_length=150)),
                ("forme_galenique", models.CharField(max_length=100)),
                ("dosage", models.CharField(max_length=100)),
                ("unite_stock", models.CharField(max_length=50)),
                ("prix_unitaire", models.DecimalField(decimal_places=2, max_digits=12)),
                ("seuil_alerte", models.PositiveIntegerField(default=0)),
                ("conditions_stockage", models.TextField(blank=True)),
                ("indications_therapeutiques", models.TextField(blank=True)),
                ("code_barres", models.CharField(max_length=100, unique=True)),
                ("est_actif", models.BooleanField(default=True)),
                (
                    "categorie",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="medicaments",
                        to="medicaments.categorie",
                    ),
                ),
            ],
            options={
                "db_table": "medicament",
                "ordering": ["nom_commercial"],
            },
        ),
    ]
