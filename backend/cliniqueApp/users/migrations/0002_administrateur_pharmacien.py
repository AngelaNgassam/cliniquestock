from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Administrateur",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "utilisateur",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="administrateur_profile",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "administrateur",
            },
        ),
        migrations.CreateModel(
            name="Pharmacien",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("matricule", models.CharField(max_length=50, unique=True)),
                ("service_affecte", models.CharField(max_length=100)),
                (
                    "utilisateur",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pharmacien_profile",
                        to="users.utilisateur",
                    ),
                ),
            ],
            options={
                "db_table": "pharmacien",
            },
        ),
    ]
