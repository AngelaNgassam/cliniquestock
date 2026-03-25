from django.db import models


class Alerte(models.Model):
    class TypeAlerte(models.TextChoices):
        STOCK_BAS = "STOCK_BAS", "Stock bas"
        PEREMPTION = "PEREMPTION", "Peremption"
        ANOMALIE = "ANOMALIE", "Anomalie"
        SYSTEME = "SYSTEME", "Systeme"

    class NiveauUrgence(models.TextChoices):
        BAS = "BAS", "Bas"
        MOYEN = "MOYEN", "Moyen"
        ELEVE = "ELEVE", "Eleve"
        CRITIQUE = "CRITIQUE", "Critique"

    type_alerte = models.CharField(max_length=30, choices=TypeAlerte.choices)
    niveau_urgence = models.CharField(max_length=20, choices=NiveauUrgence.choices, default=NiveauUrgence.MOYEN)
    message = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    est_lue = models.BooleanField(default=False)
    destinataire = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.CASCADE,
        related_name="alertes",
    )

    class Meta:
        db_table = "alerte"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["est_lue"], name="alerte_est_lue_idx"),
            models.Index(fields=["niveau_urgence"], name="alerte_urgence_idx"),
            models.Index(fields=["date_creation"], name="alerte_date_idx"),
        ]

    def __str__(self):
        return f"{self.type_alerte} - {self.niveau_urgence}"
