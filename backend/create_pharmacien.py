#!/usr/bin/env python
"""Script pour créer un utilisateur pharmacien"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from cliniqueApp.users.models import Utilisateur, Pharmacien

def create_pharmacien():
    print("=== Création d'un utilisateur Pharmacien ===\n")
    
    nom = input("Nom : ")
    prenom = input("Prénom : ")
    email = input("Email : ")
    password = input("Mot de passe : ")
    matricule = input("Matricule : ")
    service = input("Service affecté : ")
    
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
        
        print(f"\n✓ Pharmacien créé avec succès !")
        print(f"  - Nom: {user.prenom} {user.nom}")
        print(f"  - Email: {user.email}")
        print(f"  - Matricule: {pharmacien.matricule}")
        print(f"  - Service: {pharmacien.service_affecte}")
        
    except Exception as e:
        print(f"\n✗ Erreur lors de la création : {e}")

if __name__ == '__main__':
    create_pharmacien()
