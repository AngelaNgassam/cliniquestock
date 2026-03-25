from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="JournalAudit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=100)),
                ("entite_concernee", models.CharField(max_length=100)),
                ("ancienne_valeur", models.JSONField(blank=True, null=True)),
                ("nouvelle_valeur", models.JSONField(blank=True, null=True)),
                ("date_action", models.DateTimeField(auto_now_add=True)),
                ("adresse_ip", models.GenericIPAddressField(blank=True, null=True)),
                (
                    "utilisateur",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journaux_audit",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "journal_audit",
                "ordering": ["-date_action"],
            },
        ),
        migrations.CreateModel(
            name="Rapport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("STOCK", "Stock"),
                            ("COMMANDES", "Commandes"),
                            ("RECEPTIONS", "Receptions"),
                            ("ANOMALIES", "Anomalies"),
                        ],
                        max_length=30,
                    ),
                ),
                ("date_generation", models.DateTimeField(auto_now_add=True)),
                ("periode_debut", models.DateField()),
                ("periode_fin", models.DateField()),
                ("format", models.CharField(choices=[("PDF", "PDF"), ("XLSX", "XLSX"), ("CSV", "CSV")], default="PDF", max_length=10)),
                (
                    "genere_par",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="rapports_generes",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "rapport",
                "ordering": ["-date_generation"],
            },
        ),
    ]
