from django.db import models


class JournalAudit(models.Model):
    action = models.CharField(max_length=100)
    entite_concernee = models.CharField(max_length=100)
    ancienne_valeur = models.JSONField(null=True, blank=True)
    nouvelle_valeur = models.JSONField(null=True, blank=True)
    date_action = models.DateTimeField(auto_now_add=True)
    utilisateur = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.SET_NULL,
        null=True,
        related_name="journaux_audit",
    )
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "journal_audit"
        ordering = ["-date_action"]

    def __str__(self):
        return f"{self.action} - {self.entite_concernee}"


class Rapport(models.Model):
    class TypeRapport(models.TextChoices):
        STOCK = "STOCK", "Stock"
        COMMANDES = "COMMANDES", "Commandes"
        RECEPTIONS = "RECEPTIONS", "Receptions"
        ANOMALIES = "ANOMALIES", "Anomalies"

    class FormatRapport(models.TextChoices):
        PDF = "PDF", "PDF"
        XLSX = "XLSX", "XLSX"
        CSV = "CSV", "CSV"

    type = models.CharField(max_length=30, choices=TypeRapport.choices)
    date_generation = models.DateTimeField(auto_now_add=True)
    periode_debut = models.DateField()
    periode_fin = models.DateField()
    genere_par = models.ForeignKey(
        "users.Utilisateur",
        on_delete=models.PROTECT,
        related_name="rapports_generes",
    )
    format = models.CharField(max_length=10, choices=FormatRapport.choices, default=FormatRapport.PDF)

    class Meta:
        db_table = "rapport"
        ordering = ["-date_generation"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(periode_fin__gte=models.F("periode_debut")),
                name="rapport_periode_fin_gte_periode_debut",
            ),
        ]

    def __str__(self):
        return f"{self.type} - {self.date_generation:%Y-%m-%d}"
    

# Ajouter à la fin du fichier existant

class Signature(models.Model):
    nom       = models.CharField(max_length=150)
    fonction  = models.CharField(max_length=150)
    image     = models.ImageField(upload_to='signatures/', null=True, blank=True)
    image_b64 = models.TextField(blank=True, default='')  # stockage base64 alternatif
    created_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'signature'

    def __str__(self):
        return f'{self.nom} — {self.fonction}'
