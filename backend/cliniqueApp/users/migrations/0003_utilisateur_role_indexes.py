from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_administrateur_pharmacien"),
    ]

    operations = [
        migrations.AlterField(
            model_name="utilisateur",
            name="role",
            field=models.CharField(
                choices=[
                    ("ADMINISTRATEUR", "Administrateur"),
                    ("PHARMACIEN", "Pharmacien"),
                ],
                default="PHARMACIEN",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="utilisateur",
            index=models.Index(fields=["role"], name="utilisateur_role_idx"),
        ),
        migrations.AddIndex(
            model_name="utilisateur",
            index=models.Index(fields=["est_actif"], name="utilisateur_actif_idx"),
        ),
    ]
