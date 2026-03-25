from django.db import models


class LotStock(models.Model):
    class Statut(models.TextChoices):
        DISPONIBLE = "DISPONIBLE", "Disponible"
        QUARANTAINE = "QUARANTAINE", "Quarantaine"
        EPUISE = "EPUISE", "Epuise"
        EXPIRE = "EXPIRE", "Expire"

    medicament = models.ForeignKey(
        "medicaments.Medicament",
        on_delete=models.PROTECT,
        related_name="lots",
    )
    numero_lot = models.CharField(max_length=100)
    date_peremption = models.DateField()
    quantite_disponible = models.PositiveIntegerField(default=0)
    quantite_quarantaine = models.PositiveIntegerField(default=0)
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2)
    date_reception = models.DateField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.DISPONIBLE)

    class Meta:
        db_table = "lot_stock"
        indexes = [
            models.Index(fields=["date_peremption"], name="lot_stock_peremption_idx"),
            models.Index(fields=["statut"], name="lot_stock_statut_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["medicament", "numero_lot"],
                name="unique_lot_par_medicament",
            ),
            models.CheckConstraint(
                check=models.Q(prix_achat__gte=0),
                name="lot_stock_prix_achat_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(date_peremption__gte=models.F("date_reception")),
                name="lot_stock_peremption_gte_reception",
            ),
        ]

    def __str__(self):
        return f"{self.medicament.nom_commercial} - {self.numero_lot}"


class MouvementStock(models.Model):
    class TypeMouvement(models.TextChoices):
        ENTREE = "ENTREE", "Entree"
        SORTIE = "SORTIE", "Sortie"
        AJUSTEMENT = "AJUSTEMENT", "Ajustement"
        TRANSFERT = "TRANSFERT", "Transfert"

    lot = models.ForeignKey(
        LotStock,
        on_delete=models.PROTECT,
        related_name="mouvements",
    )
    type_mouvement = models.CharField(max_length=20, choices=TypeMouvement.choices)
    type_motif = models.CharField(max_length=100)
    quantite = models.PositiveIntegerField()
    date_operation = models.DateTimeField(auto_now_add=True)
    operateur = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="mouvements_stock",
    )
    numero_ordre = models.CharField(max_length=100, blank=True)
    patient_nom = models.CharField(max_length=150, blank=True)
    prescripteur = models.CharField(max_length=150, blank=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        db_table = "mouvement_stock"
        ordering = ["-date_operation"]
        indexes = [
            models.Index(fields=["type_mouvement"], name="mvt_stock_type_idx"),
            models.Index(fields=["date_operation"], name="mvt_stock_date_idx"),
        ]

    def __str__(self):
        return f"{self.type_mouvement} - {self.quantite} ({self.lot.numero_lot})"


class Reception(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        PARTIELLE = "PARTIELLE", "Partielle"
        COMPLETE = "COMPLETE", "Complete"

    date_reception = models.DateTimeField()
    numero_bon_livraison = models.CharField(max_length=100, unique=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    enregistre_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="receptions_enregistrees",
    )
    commande = models.ForeignKey(
        "commandes.Commande",
        on_delete=models.PROTECT,
        related_name="receptions",
    )

    class Meta:
        db_table = "reception"
        ordering = ["-date_reception"]
        indexes = [
            models.Index(fields=["statut"], name="reception_statut_idx"),
            models.Index(fields=["date_reception"], name="reception_date_idx"),
        ]

    def __str__(self):
        return self.numero_bon_livraison


class LigneReception(models.Model):
    reception = models.ForeignKey(
        Reception,
        on_delete=models.CASCADE,
        related_name="lignes",
    )
    medicament = models.ForeignKey(
        "medicaments.Medicament",
        on_delete=models.PROTECT,
        related_name="lignes_reception",
    )
    quantite_recue = models.PositiveIntegerField()
    numero_lot = models.CharField(max_length=100)
    date_peremption = models.DateField()
    prix_achat_reel = models.DecimalField(max_digits=12, decimal_places=2)
    has_anomalie = models.BooleanField(default=False)

    class Meta:
        db_table = "ligne_reception"
        constraints = [
            models.CheckConstraint(
                check=models.Q(prix_achat_reel__gte=0),
                name="ligne_reception_prix_gte_0",
            ),
        ]

    def __str__(self):
        return f"{self.reception.numero_bon_livraison} - {self.medicament.nom_commercial}"


class Anomalie(models.Model):
    class Statut(models.TextChoices):
        OUVERTE = "OUVERTE", "Ouverte"
        EN_COURS = "EN_COURS", "En cours"
        RESOLUE = "RESOLUE", "Resolue"

    type_anomalie = models.CharField(max_length=100)
    description = models.TextField()
    date_signalement = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.OUVERTE)
    signale_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="anomalies_signalees",
    )
    ligne_reception = models.ForeignKey(
        LigneReception,
        on_delete=models.CASCADE,
        related_name="anomalies",
    )

    class Meta:
        db_table = "anomalie"
        ordering = ["-date_signalement"]
        indexes = [
            models.Index(fields=["statut"], name="anomalie_statut_idx"),
            models.Index(fields=["date_signalement"], name="anomalie_date_idx"),
        ]

    def __str__(self):
        return f"{self.type_anomalie} - {self.statut}"


class Inventaire(models.Model):
    class Statut(models.TextChoices):
        PLANIFIE = "PLANIFIE", "Planifie"
        EN_COURS = "EN_COURS", "En cours"
        CLOTURE = "CLOTURE", "Cloture"

    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIE)
    initie_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="inventaires_inities",
    )

    class Meta:
        db_table = "inventaire"
        ordering = ["-date_debut"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(date_fin__isnull=True) | models.Q(date_fin__gte=models.F("date_debut")),
                name="inventaire_date_fin_gte_date_debut",
            ),
        ]

    def __str__(self):
        return f"Inventaire #{self.id} - {self.statut}"
