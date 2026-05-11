from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medicaments', '0002_medicament_hardening'),
    ]

    operations = [
        # ✅ Ajouter prix_vente avec une valeur par défaut
        migrations.AddField(
            model_name='medicament',
            name='prix_vente',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Prix de vente au patient (FCFA). N'est PAS le prix d'achat fournisseur.",
                max_digits=12,
            ),
        ),
        # ✅ Supprimer l'ancien champ prix_unitaire
        migrations.RemoveField(
            model_name='medicament',
            name='prix_unitaire',
        ),
    ]