#!/usr/bin/env python
"""Script pour créer un utilisateur pharmacien automatiquement"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from cliniqueApp.users.models import Utilisateur, Pharmacien

def create_pharmacien(nom, prenom, email, password, matricule, service):
    try:
        # Créer l'utilisateur
        user = Utilisateur.objects.create_user(
            email=email,
            nom=nom,
            prenom=prenom,
            role='PHARMACIEN',
            password=password
        )
        
        # Créer le profil pharmacien
        pharmacien = Pharmacien.objects.create(
            utilisateur=user,
            matricule=matricule,
            service_affecte=service
        )
        
        print(f"✓ Pharmacien créé avec succès !")
        print(f"  - Nom: {user.prenom} {user.nom}")
        print(f"  - Email: {user.email}")
        print(f"  - Matricule: {pharmacien.matricule}")
        print(f"  - Service: {pharmacien.service_affecte}")
        return True
        
    except Exception as e:
        print(f"✗ Erreur : {e}")
        return False

if __name__ == '__main__':
    # Exemple d'utilisation
    if len(sys.argv) == 7:
        create_pharmacien(
            nom=sys.argv[1],
            prenom=sys.argv[2],
            email=sys.argv[3],
            password=sys.argv[4],
            matricule=sys.argv[5],
            service=sys.argv[6]
        )
    else:
        # Valeurs par défaut pour test
        create_pharmacien(
            nom="Dupont",
            prenom="Jean",
            email="jean.dupont@clinique.com",
            password="password123",
            matricule="PH001",
            service="Pharmacie Centrale"
        )
