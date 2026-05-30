#!/usr/bin/env python
"""Script pour tester l'authentification des utilisateurs"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.contrib.auth import authenticate
from django.db import connection

def check_password_hash():
    """Vérifie les hash des mots de passe"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, email, mot_de_passe, role 
            FROM utilisateur 
            ORDER BY id;
        """)
        
        users = cursor.fetchall()
        print("Mots de passe hachés dans la base de données :")
        print("=" * 80)
        for user in users:
            print(f"Email: {user[1]}")
            print(f"Rôle: {user[3]}")
            print(f"Hash: {user[2][:50]}...")
            print("-" * 80)

def test_authentication():
    """Teste l'authentification avec les mots de passe"""
    print("\n\nTest d'authentification :")
    print("=" * 80)
    
    # Test admin
    print("\n1. Test Administrateur (admin@clinique.com / admin123)")
    admin = authenticate(username='admin@clinique.com', password='admin123')
    if admin:
        print(f"   ✓ Authentification réussie !")
        print(f"   - Nom: {admin.prenom} {admin.nom}")
        print(f"   - Rôle: {admin.role}")
    else:
        print(f"   ✗ Échec de l'authentification")
    
    # Test pharmacien
    print("\n2. Test Pharmacien (jean.dupont@clinique.com / pharma123)")
    pharma = authenticate(username='jean.dupont@clinique.com', password='pharma123')
    if pharma:
        print(f"   ✓ Authentification réussie !")
        print(f"   - Nom: {pharma.prenom} {pharma.nom}")
        print(f"   - Rôle: {pharma.role}")
    else:
        print(f"   ✗ Échec de l'authentification")
    
    # Test avec mauvais mot de passe
    print("\n3. Test avec mauvais mot de passe")
    bad = authenticate(username='admin@clinique.com', password='wrongpassword')
    if bad:
        print(f"   ✗ PROBLÈME : Authentification réussie avec mauvais mot de passe !")
    else:
        print(f"   ✓ Échec attendu - sécurité OK")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    check_password_hash()
    test_authentication()
