#!/usr/bin/env python
"""Script pour vérifier les utilisateurs créés"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.db import connection

def check_users():
    """Vérifie les utilisateurs dans la base de données"""
    with connection.cursor() as cursor:
        # Vérifier les utilisateurs
        cursor.execute("""
            SELECT id, nom, prenom, email, role, est_actif, date_creation
            FROM utilisateur
            ORDER BY id;
        """)
        
        users = cursor.fetchall()
        
        if not users:
            print("✗ Aucun utilisateur trouvé dans la base de données.")
            return
        
        print(f"✓ {len(users)} utilisateur(s) trouvé(s) :\n")
        
        for user in users:
            user_id, nom, prenom, email, role, est_actif, date_creation = user
            print(f"ID: {user_id}")
            print(f"  - Nom: {prenom} {nom}")
            print(f"  - Email: {email}")
            print(f"  - Rôle: {role}")
            print(f"  - Actif: {est_actif}")
            print(f"  - Créé le: {date_creation}")
            
            # Vérifier le profil associé
            if role == 'ADMINISTRATEUR':
                cursor.execute("SELECT id FROM administrateur WHERE utilisateur_id = %s", [user_id])
                admin = cursor.fetchone()
                if admin:
                    print(f"  - Profil Admin ID: {admin[0]}")
                else:
                    print(f"  - ⚠ Pas de profil administrateur associé")
            
            elif role == 'PHARMACIEN':
                cursor.execute("SELECT id, matricule, service_affecte FROM pharmacien WHERE utilisateur_id = %s", [user_id])
                pharma = cursor.fetchone()
                if pharma:
                    print(f"  - Profil Pharmacien ID: {pharma[0]}")
                    print(f"  - Matricule: {pharma[1]}")
                    print(f"  - Service: {pharma[2]}")
                else:
                    print(f"  - ⚠ Pas de profil pharmacien associé")
            
            print()

if __name__ == '__main__':
    print("="*60)
    print("=== Vérification des utilisateurs ===\n")
    check_users()
    print("="*60)
