from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rapports", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="rapport",
            constraint=models.CheckConstraint(
                check=models.Q(periode_fin__gte=models.F("periode_debut")),
                name="rapport_periode_fin_gte_periode_debut",
            ),
        ),
    ]
