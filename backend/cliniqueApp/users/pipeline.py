# backend/cliniqueApp/users/pipeline.py

def set_role_and_profile(backend, user, response, is_new=False, *args, **kwargs):
    """
    Pipeline social-auth :
    - Assigne le rôle PHARMACIEN par défaut aux nouveaux comptes sociaux
    - Remplit nom/prénom depuis les données Google/Microsoft si disponibles
    - Sauvegarde uniquement si nécessaire
    """
    if not is_new:
        return

    changed = False

    # ── Rôle par défaut ────────────────────────────────────────────────────────
    if not user.role:
        user.role = 'PHARMACIEN'
        changed = True

    # ── Nom / Prénom depuis Google ─────────────────────────────────────────────
    if backend.name == 'google-oauth2':
        if not user.prenom and response.get('given_name'):
            user.prenom = response.get('given_name', '')
            changed = True
        if not user.nom and response.get('family_name'):
            user.nom = response.get('family_name', '')
            changed = True

    # ── Nom / Prénom depuis Microsoft ──────────────────────────────────────────
    if backend.name == 'microsoft-oauth2':
        if not user.prenom and response.get('givenName'):
            user.prenom = response.get('givenName', '')
            changed = True
        if not user.nom and response.get('surname'):
            user.nom = response.get('surname', '')
            changed = True
        # Fallback : displayName → "Prénom Nom"
        if (not user.prenom or not user.nom) and response.get('displayName'):
            parts = response.get('displayName', '').split(' ', 1)
            if not user.prenom:
                user.prenom = parts[0]
                changed = True
            if not user.nom and len(parts) > 1:
                user.nom = parts[1]
                changed = True

    # Garantir des valeurs non-vides (requis par le modèle)
    if not user.nom:
        user.nom = 'Utilisateur'
        changed = True
    if not user.prenom:
        user.prenom = user.email.split('@')[0]
        changed = True

    if changed:
        user.save()