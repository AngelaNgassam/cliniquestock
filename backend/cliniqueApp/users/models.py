from django.db import models


class Utilisateur(models.Model):
    class Role(models.TextChoices):
        ADMINISTRATEUR = "ADMINISTRATEUR", "Administrateur"
        PHARMACIEN = "PHARMACIEN", "Pharmacien"

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    mot_de_passe = models.CharField(max_length=128)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PHARMACIEN)
    est_actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    dernier_connexion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "utilisateur"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["role"], name="utilisateur_role_idx"),
            models.Index(fields=["est_actif"], name="utilisateur_actif_idx"),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.email})"


class Administrateur(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="administrateur_profile",
    )

    class Meta:
        db_table = "administrateur"

    def __str__(self):
        return f"Administrateur - {self.utilisateur.email}"


class Pharmacien(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="pharmacien_profile",
    )
    matricule = models.CharField(max_length=50, unique=True)
    service_affecte = models.CharField(max_length=100)

    class Meta:
        db_table = "pharmacien"

    def __str__(self):
        return f"Pharmacien - {self.utilisateur.email}"
