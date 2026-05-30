#!/usr/bin/env python
"""Script pour créer un pharmacien et un administrateur - version finale"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.db import connection
from django.contrib.auth.hashers import make_password

def create_admin_sql(nom, prenom, email, password):
    """Crée un administrateur avec SQL direct"""
    hashed_password = make_password(password)
    
    with connection.cursor() as cursor:
        try:
            # Insérer l'utilisateur
            cursor.execute("""
                INSERT INTO utilisateur 
                (nom, prenom, email, password, role, est_actif, date_creation)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING id;
            """, [nom, prenom, email, hashed_password, 'ADMINISTRATEUR', True])
            
            user_id = cursor.fetchone()[0]
            
            # Créer le profil administrateur
            cursor.execute("""
                INSERT INTO administrateur (utilisateur_id)
                VALUES (%s);
            """, [user_id])
            
            print(f"✓ Administrateur créé avec succès !")
            print(f"  - ID: {user_id}")
            print(f"  - Nom: {prenom} {nom}")
            print(f"  - Email: {email}")
            print(f"  - Mot de passe: {password}")
            return True
            
        except Exception as e:
            print(f"✗ Erreur création admin : {e}")
            return False

def create_pharmacien_sql(nom, prenom, email, password, matricule, service):
    """Crée un pharmacien avec SQL direct"""
    hashed_password = make_password(password)
    
    with connection.cursor() as cursor:
        try:
            # Insérer l'utilisateur
            cursor.execute("""
                INSERT INTO utilisateur 
                (nom, prenom, email, password, role, est_actif, date_creation)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING id;
            """, [nom, prenom, email, hashed_password, 'PHARMACIEN', True])
            
            user_id = cursor.fetchone()[0]
            
            # Créer le profil pharmacien
            cursor.execute("""
                INSERT INTO pharmacien (utilisateur_id, matricule, service_affecte)
                VALUES (%s, %s, %s);
            """, [user_id, matricule, service])
            
            print(f"✓ Pharmacien créé avec succès !")
            print(f"  - ID: {user_id}")
            print(f"  - Nom: {prenom} {nom}")
            print(f"  - Email: {email}")
            print(f"  - Mot de passe: {password}")
            print(f"  - Matricule: {matricule}")
            print(f"  - Service: {service}")
            return True
            
        except Exception as e:
            print(f"✗ Erreur création pharmacien : {e}")
            return False

if __name__ == '__main__':
    print("="*60)
    print("=== Création des utilisateurs ===\n")
    
    # Créer un administrateur
    print("1. Création d'un administrateur...")
    create_admin_sql(
        nom="Admin",
        prenom="Super",
        email="admin@gmail.com",
        password="admin124"
    )
    
    # Créer un pharmacien
    # print("\n2. Création d'un pharmacien...")
    # create_pharmacien_sql(
    #     nom="Dupont",
    #     prenom="Jean",
    #     email="jean.dupont@clinique.com",
    #     password="pharma123",
    #     matricule="PH001",
    #     service="Pharmacie Centrale"
    # )
    
    # print("\n" + "="*60)
    # print("✓ Terminé ! Vous pouvez maintenant vous connecter avec ces comptes.")
