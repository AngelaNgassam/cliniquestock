import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from cliniqueApp.users.models import Utilisateur, Administrateur, Pharmacien

def create_users():
    print("=== Création des utilisateurs ===\n")
    
    # Créer un administrateur
    try:
        admin_user = Utilisateur.objects.create_user(
            email='admin2@medstock.cm',
            password='Admin@2024',
            nom='Dupont',
            prenom='Jean',
            role='ADMINISTRATEUR'
        )
        
        admin = Administrateur.objects.create(
            utilisateur=admin_user
        )
        
        print(f"✅ Administrateur créé avec succès!")
        print(f"   Email: {admin_user.email}")
        print(f"   Password: Admin@2024")
        print(f"   Nom: {admin_user.prenom} {admin_user.nom}")
        print(f"   Role: {admin_user.role}\n")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'administrateur: {e}\n")
    
    # Créer un pharmacien
    try:
        pharmacien_user = Utilisateur.objects.create_user(
            email='pharmacien2@medstock.cm',
            password='Pharma@2024',
            nom='Martin',
            prenom='Marie',
            role='PHARMACIEN'
        )
        
        pharmacien = Pharmacien.objects.create(
            utilisateur=pharmacien_user,
            matricule='PH-2024-002',
            service_affecte='Pharmacie Centrale'
        )
        
        print(f"✅ Pharmacien créé avec succès!")
        print(f"   Email: {pharmacien_user.email}")
        print(f"   Password: Pharma@2024")
        print(f"   Nom: {pharmacien_user.prenom} {pharmacien_user.nom}")
        print(f"   Matricule: {pharmacien.matricule}")
        print(f"   Service: {pharmacien.service_affecte}\n")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création du pharmacien: {e}\n")
    
    print("=== Résumé des utilisateurs créés ===")
    print("\n📋 ADMINISTRATEUR:")
    print("   Email: admin2@medstock.cm")
    print("   Password: Admin@2024")
    print("\n💊 PHARMACIEN:")
    print("   Email: pharmacien2@medstock.cm")
    print("   Password: Pharma@2024")

if __name__ == '__main__':
    create_users()
