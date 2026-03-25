from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stock", "0002_reception_anomalie_inventaire"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="lotstock",
            index=models.Index(fields=["date_peremption"], name="lot_stock_peremption_idx"),
        ),
        migrations.AddIndex(
            model_name="lotstock",
            index=models.Index(fields=["statut"], name="lot_stock_statut_idx"),
        ),
        migrations.AddConstraint(
            model_name="lotstock",
            constraint=models.CheckConstraint(
                check=models.Q(prix_achat__gte=0),
                name="lot_stock_prix_achat_gte_0",
            ),
        ),
        migrations.AddConstraint(
            model_name="lotstock",
            constraint=models.CheckConstraint(
                check=models.Q(date_peremption__gte=models.F("date_reception")),
                name="lot_stock_peremption_gte_reception",
            ),
        ),
        migrations.AddIndex(
            model_name="mouvementstock",
            index=models.Index(fields=["type_mouvement"], name="mvt_stock_type_idx"),
        ),
        migrations.AddIndex(
            model_name="mouvementstock",
            index=models.Index(fields=["date_operation"], name="mvt_stock_date_idx"),
        ),
        migrations.AddIndex(
            model_name="reception",
            index=models.Index(fields=["statut"], name="reception_statut_idx"),
        ),
        migrations.AddIndex(
            model_name="reception",
            index=models.Index(fields=["date_reception"], name="reception_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="lignereception",
            constraint=models.CheckConstraint(
                check=models.Q(prix_achat_reel__gte=0),
                name="ligne_reception_prix_gte_0",
            ),
        ),
        migrations.AddIndex(
            model_name="anomalie",
            index=models.Index(fields=["statut"], name="anomalie_statut_idx"),
        ),
        migrations.AddIndex(
            model_name="anomalie",
            index=models.Index(fields=["date_signalement"], name="anomalie_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="inventaire",
            constraint=models.CheckConstraint(
                check=models.Q(date_fin__isnull=True) | models.Q(date_fin__gte=models.F("date_debut")),
                name="inventaire_date_fin_gte_date_debut",
            ),
        ),
    ]
