#!/usr/bin/env python
"""Script pour créer un pharmacien et un administrateur"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.db import connection
from cliniqueApp.users.models import Utilisateur, Pharmacien, Administrateur

def check_table_structure():
    """Vérifie la structure de la table utilisateur"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'utilisateur'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print("Structure de la table 'utilisateur':")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")
        return [col[0] for col in columns]

def create_pharmacien(nom, prenom, email, password, matricule, service):
    """Crée un utilisateur pharmacien"""
    try:
        user = Utilisateur.objects.create_user(
            email=email,
            nom=nom,
            prenom=prenom,
            role='PHARMACIEN',
            password=password
        )
        
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
        return True
        
    except Exception as e:
        print(f"\n✗ Erreur création pharmacien : {e}")
        import traceback
        traceback.print_exc()
        return False

def create_admin(nom, prenom, email, password):
    """Crée un utilisateur administrateur"""
    try:
        user = Utilisateur.objects.create_user(
            email=email,
            nom=nom,
            prenom=prenom,
            role='ADMINISTRATEUR',
            password=password
        )
        
        admin = Administrateur.objects.create(
            utilisateur=user
        )
        
        print(f"\n✓ Administrateur créé avec succès !")
        print(f"  - Nom: {user.prenom} {user.nom}")
        print(f"  - Email: {user.email}")
        print(f"  - Rôle: {user.role}")
        return True
        
    except Exception as e:
        print(f"\n✗ Erreur création admin : {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=== Vérification de la structure de la base de données ===\n")
    columns = check_table_structure()
    
    print("\n" + "="*60)
    print("=== Création des utilisateurs ===\n")
    
    # Créer un administrateur
    print("1. Création d'un administrateur...")
    create_admin(
        nom="Admin",
        prenom="Super",
        email="admin@clinique.com",
        password="admin123"
    )
    
    # Créer un pharmacien
    print("\n2. Création d'un pharmacien...")
    create_pharmacien(
        nom="Dupont",
        prenom="Jean",
        email="jean.dupont@clinique.com",
        password="pharma123",
        matricule="PH001",
        service="Pharmacie Centrale"
    )
    
    print("\n" + "="*60)
    print("Terminé !")
