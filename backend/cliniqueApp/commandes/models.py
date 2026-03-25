from django.db import models


class Fournisseur(models.Model):
    nom_societe = models.CharField(max_length=150)
    contact = models.CharField(max_length=150)
    email = models.EmailField()
    adresse = models.TextField()
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = "fournisseur"
        ordering = ["nom_societe"]

    def __str__(self):
        return self.nom_societe


class Commande(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        PARTIELLE = "PARTIELLE", "Partielle"
        LIVREE = "LIVREE", "Livree"
        ANNULEE = "ANNULEE", "Annulee"

    reference = models.CharField(max_length=80, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_livraison_prevue = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cree_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="commandes_creees",
    )
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.PROTECT,
        related_name="commandes",
    )

    class Meta:
        db_table = "commande"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["statut"], name="commande_statut_idx"),
            models.Index(fields=["date_creation"], name="commande_date_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant_total__gte=0),
                name="commande_montant_total_gte_0",
            ),
        ]

    def __str__(self):
        return self.reference


class LigneCommande(models.Model):
    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name="lignes",
    )
    medicament = models.ForeignKey(
        "medicaments.Medicament",
        on_delete=models.PROTECT,
        related_name="lignes_commande",
    )
    quantite_commandee = models.PositiveIntegerField()
    quantite_recue = models.PositiveIntegerField(default=0)
    prix_unitaire_estime = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "ligne_commande"
        constraints = [
            models.UniqueConstraint(
                fields=["commande", "medicament"],
                name="unique_ligne_commande_par_medicament",
            ),
            models.CheckConstraint(
                check=models.Q(prix_unitaire_estime__gte=0),
                name="ligne_commande_prix_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(quantite_recue__lte=models.F("quantite_commandee")),
                name="ligne_commande_recue_lte_commandee",
            ),
        ]

    def __str__(self):
        return f"{self.commande.reference} - {self.medicament.nom_commercial}"


class BonRetourFournisseur(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        ENVOYE = "ENVOYE", "Envoye"
        TRAITE = "TRAITE", "Traite"
        ANNULE = "ANNULE", "Annule"

    reference = models.CharField(max_length=80, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    motif = models.TextField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    cree_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="bons_retour_crees",
    )
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.PROTECT,
        related_name="bons_retour",
    )

    class Meta:
        db_table = "bon_retour_fournisseur"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["statut"], name="bon_retour_statut_idx"),
            models.Index(fields=["date_creation"], name="bon_retour_date_idx"),
        ]

    def __str__(self):
        return self.reference
