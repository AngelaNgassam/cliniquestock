from django.contrib import admin
from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ("id", "nom", "prenom", "email", "role", "est_actif", "date_creation")
    list_filter = ("role", "est_actif", "date_creation")
    search_fields = ("nom", "prenom", "email")
