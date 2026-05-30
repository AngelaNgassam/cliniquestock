#!/usr/bin/env python
"""Fix missing columns in utilisateur table to match Django AbstractBaseUser expectations."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clinique_projet.settings')
django.setup()

from django.db import connection

def get_columns():
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'utilisateur' ORDER BY ordinal_position;"
        )
        return [r[0] for r in cursor.fetchall()]

def fix_columns():
    columns = get_columns()
    print(f"Current columns: {columns}")
    
    fixes = []
    
    # Django AbstractBaseUser expects 'password', not 'mot_de_passe'
    if 'mot_de_passe' in columns and 'password' not in columns:
        fixes.append("ALTER TABLE utilisateur RENAME COLUMN mot_de_passe TO password;")
    
    # Django AbstractBaseUser expects 'last_login'
    if 'last_login' not in columns:
        fixes.append("ALTER TABLE utilisateur ADD COLUMN last_login TIMESTAMP WITH TIME ZONE NULL;")
    
    # Django PermissionsMixin expects 'is_superuser'
    if 'is_superuser' not in columns:
        fixes.append("ALTER TABLE utilisateur ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT FALSE;")
    
    if not fixes:
        print("All columns are correct! Nothing to fix.")
        return
    
    print(f"\nApplying {len(fixes)} fix(es):")
    with connection.cursor() as cursor:
        for sql in fixes:
            print(f"  -> {sql}")
            cursor.execute(sql)
    
    connection.commit()  # explicit commit outside autocommit
    print("\nDone! Updated columns:", get_columns())

if __name__ == '__main__':
    fix_columns()
