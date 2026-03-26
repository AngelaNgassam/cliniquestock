from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


#  MANAGER 
class UtilisateurManager(BaseUserManager):

    def create_user(self, email, nom, prenom, role, password=None):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        if not nom:
            raise ValueError("Le nom est obligatoire")

        user = self.model(
            email=self.normalize_email(email),
            nom=nom,
            prenom=prenom,
            role=role,
        )
        user.set_password(password)   # hache le mot de passe automatiquement
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nom, prenom='', role='ADMINISTRATEUR', password=None):
        user = self.create_user(
            email=email,
            nom=nom,
            prenom=prenom,
            role=role,
            password=password,
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


# ─── MODÈLE PRINCIPAL ─────────────────────────────────────────────────────────
class Utilisateur(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        ADMINISTRATEUR = "ADMINISTRATEUR", "Administrateur"
        PHARMACIEN     = "PHARMACIEN",     "Pharmacien"

    nom               = models.CharField(max_length=100)
    prenom            = models.CharField(max_length=100)
    email             = models.EmailField(unique=True)
    role              = models.CharField(
                            max_length=20,
                            choices=Role.choices,
                            default=Role.PHARMACIEN
                        )
    est_actif         = models.BooleanField(default=True)
    is_staff          = models.BooleanField(default=False)   # requis par Django admin
    date_creation     = models.DateTimeField(auto_now_add=True)
    dernier_connexion = models.DateTimeField(null=True, blank=True)

    # ── Gestionnaire personnalisé ──────────────────────────────────────────────
    objects = UtilisateurManager()

    # ── Champs requis par Django Auth ──────────────────────────────────────────
    USERNAME_FIELD  = 'email'                  # on se connecte avec l'email
    REQUIRED_FIELDS = ['nom', 'prenom', 'role'] # champs demandés par createsuperuser

    class Meta:
        db_table = "utilisateur"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["role"],      name="utilisateur_role_idx"),
            models.Index(fields=["est_actif"], name="utilisateur_actif_idx"),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.email})"

    # ── Propriétés utiles ──────────────────────────────────────────────────────
    @property
    def est_admin(self):
        return self.role == self.Role.ADMINISTRATEUR

    @property
    def est_pharmacien(self):
        return self.role == self.Role.PHARMACIEN


# ─── PROFIL ADMINISTRATEUR ────────────────────────────────────────────────────
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


# ─── PROFIL PHARMACIEN ────────────────────────────────────────────────────────
class Pharmacien(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="pharmacien_profile",
    )
    matricule        = models.CharField(max_length=50, unique=True)
    service_affecte  = models.CharField(max_length=100)

    class Meta:
        db_table = "pharmacien"

    def __str__(self):
        return f"Pharmacien - {self.utilisateur.email}"