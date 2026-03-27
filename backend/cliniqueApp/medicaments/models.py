from django.db import models


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "categorie"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Medicament(models.Model):
    nom_commercial = models.CharField(max_length=150)
    dci = models.CharField(max_length=150)
    forme_galenique = models.CharField(max_length=100)
    dosage = models.CharField(max_length=100)
    unite_stock = models.CharField(max_length=50)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2)
    seuil_alerte = models.PositiveIntegerField(default=0)
    conditions_stockage = models.TextField(blank=True)
    indications_therapeutiques = models.TextField(blank=True)
    code_barres = models.CharField(max_length=100, unique=True)
    est_actif = models.BooleanField(default=True)
    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.PROTECT,
        related_name="medicaments",
    )

    class Meta:
        db_table = "medicament"
        ordering = ["nom_commercial"]
        indexes = [
            models.Index(fields=["nom_commercial"], name="medicament_nom_idx"),
            models.Index(fields=["est_actif"], name="medicament_actif_idx"),
            models.Index(fields=["seuil_alerte"], name="medicament_seuil_idx"),
        ]
        constraints = [
            models.CheckConstraint(
            condition=models.Q(prix_unitaire__gte=0),  # ← 'condition' au lieu de 'check'
            name="medicament_prix_unitaire_gte_0",
    ),
        ]

    def __str__(self):
        return f"{self.nom_commercial} ({self.dosage})"
