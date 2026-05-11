from django.db import models


class Categorie(models.Model):
    nom         = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'categorie'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Medicament(models.Model):
    class FormeGalenique(models.TextChoices):
        COMPRIMES  = 'Comprimé',   'Comprimé'
        GELULE     = 'Gélule',     'Gélule'
        SIROP      = 'Sirop',      'Sirop'
        INJECTABLE = 'Injectable', 'Injectable'
        POMMADE    = 'Pommade',    'Pommade'
        CAPSULE    = 'Capsule',    'Capsule'
        SUPPOSITOIRE = 'Suppositoire', 'Suppositoire'
        AUTRE      = 'Autre',      'Autre'

    nom_commercial             = models.CharField(max_length=150)
    dci                        = models.CharField(max_length=150, blank=True)
    forme_galenique            = models.CharField(max_length=50, choices=FormeGalenique.choices)
    dosage                     = models.CharField(max_length=50)
    unite_stock                = models.CharField(max_length=50, default='unité')
    categorie                  = models.ForeignKey(
                                     Categorie, on_delete=models.PROTECT,
                                     related_name='medicaments'
                                 )
    # ✅ RENOMMÉ : prix_unitaire → prix_vente (prix de vente au patient)
    prix_vente                 = models.DecimalField(
                                     max_digits=12, decimal_places=2, default=0,
                                     help_text='Prix de vente au patient (FCFA). '
                                               'N\'est PAS le prix d\'achat fournisseur.'
                                 )
    seuil_alerte               = models.PositiveIntegerField(default=10)
    conditions_stockage        = models.CharField(max_length=200, blank=True)
    indications_therapeutiques = models.TextField(blank=True)
    code_barres                = models.CharField(max_length=100, blank=True, unique=True, null=True)
    est_actif                  = models.BooleanField(default=True)

    class Meta:
        db_table = 'medicament'
        ordering = ['nom_commercial']
        indexes  = [
            models.Index(fields=['nom_commercial'], name='med_nom_idx'),
            models.Index(fields=['est_actif'],      name='med_actif_idx'),
        ]

    def __str__(self):
        return f'{self.nom_commercial} ({self.dosage})'