#!/usr/bin/env python
"""Script pour vérifier les utilisateurs créés"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.db import connection

def verify_users():
    """Vérifie les utilisateurs dans la base de données"""
    with connection.cursor() as cursor:
        # Compter les utilisateurs
        cursor.execute("SELECT COUNT(*) FROM utilisateur;")
        count = cursor.fetchone()[0]
        print(f"Nombre total d'utilisateurs : {count}\n")
        
        # Lister tous les utilisateurs
        cursor.execute("""
            SELECT id, nom, prenom, email, role, est_actif 
            FROM utilisateur 
            ORDER BY id;
        """)
        
        users = cursor.fetchall()
        
        if users:
            print("Liste des utilisateurs :")
            print("-" * 80)
            for user in users:
                print(f"ID: {user[0]}")
                print(f"  Nom: {user[2]} {user[1]}")
                print(f"  Email: {user[3]}")
                print(f"  Rôle: {user[4]}")
                print(f"  Actif: {'Oui' if user[5] else 'Non'}")
                print("-" * 80)
        else:
            print("Aucun utilisateur trouvé dans la base de données.")
        
        # Vérifier les profils
        cursor.execute("SELECT COUNT(*) FROM administrateur;")
        admin_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM pharmacien;")
        pharma_count = cursor.fetchone()[0]
        
        print(f"\nNombre d'administrateurs : {admin_count}")
        print(f"Nombre de pharmaciens : {pharma_count}")

if __name__ == '__main__':
    verify_users()
