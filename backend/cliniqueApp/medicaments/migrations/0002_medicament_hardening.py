from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medicaments", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="medicament",
            index=models.Index(fields=["nom_commercial"], name="medicament_nom_idx"),
        ),
        migrations.AddIndex(
            model_name="medicament",
            index=models.Index(fields=["est_actif"], name="medicament_actif_idx"),
        ),
        migrations.AddIndex(
            model_name="medicament",
            index=models.Index(fields=["seuil_alerte"], name="medicament_seuil_idx"),
        ),
        migrations.AddConstraint(
            model_name="medicament",
            constraint=models.CheckConstraint(
                check=models.Q(prix_unitaire__gte=0),
                name="medicament_prix_unitaire_gte_0",
            ),
        ),
    ]
