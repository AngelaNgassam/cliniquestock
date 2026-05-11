from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('commandes', '0001_initial'),  # ← adapter à ta vraie dernière migration
    ]

    operations = [
        # Supprimer l'ancienne contrainte
        migrations.RemoveConstraint(
            model_name='lignecommande',
            name='ligne_commande_prix_gte_0',
        ),
        # Renommer le champ sans toucher aux données
        migrations.RenameField(
            model_name='lignecommande',
            old_name='prix_unitaire_estime',
            new_name='prix_achat_fournisseur',
        ),
        # Recréer la contrainte avec le nouveau nom de champ
        migrations.AddConstraint(
            model_name='lignecommande',
            constraint=models.CheckConstraint(
                condition=models.Q(prix_achat_fournisseur__gte=0),
                name='ligne_commande_prix_achat_gte_0',
            ),
        ),
    ]