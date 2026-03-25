from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Utilisateur",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nom", models.CharField(max_length=100)),
                ("prenom", models.CharField(max_length=100)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("mot_de_passe", models.CharField(max_length=128)),
                ("role", models.CharField(max_length=50)),
                ("est_actif", models.BooleanField(default=True)),
                ("date_creation", models.DateTimeField(auto_now_add=True)),
                ("dernier_connexion", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "utilisateur",
                "ordering": ["-date_creation"],
            },
        ),
    ]
