from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Alerte",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "type_alerte",
                    models.CharField(
                        choices=[
                            ("STOCK_BAS", "Stock bas"),
                            ("PEREMPTION", "Peremption"),
                            ("ANOMALIE", "Anomalie"),
                            ("SYSTEME", "Systeme"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "niveau_urgence",
                    models.CharField(
                        choices=[
                            ("BAS", "Bas"),
                            ("MOYEN", "Moyen"),
                            ("ELEVE", "Eleve"),
                            ("CRITIQUE", "Critique"),
                        ],
                        default="MOYEN",
                        max_length=20,
                    ),
                ),
                ("message", models.TextField()),
                ("date_creation", models.DateTimeField(auto_now_add=True)),
                ("est_lue", models.BooleanField(default=False)),
                (
                    "destinataire",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alertes",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "alerte",
                "ordering": ["-date_creation"],
            },
        ),
    ]
