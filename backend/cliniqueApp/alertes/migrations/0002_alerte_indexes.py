from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("alertes", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="alerte",
            index=models.Index(fields=["est_lue"], name="alerte_est_lue_idx"),
        ),
        migrations.AddIndex(
            model_name="alerte",
            index=models.Index(fields=["niveau_urgence"], name="alerte_urgence_idx"),
        ),
        migrations.AddIndex(
            model_name="alerte",
            index=models.Index(fields=["date_creation"], name="alerte_date_idx"),
        ),
    ]
