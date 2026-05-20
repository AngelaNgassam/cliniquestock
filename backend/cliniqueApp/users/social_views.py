# backend/cliniqueApp/users/social_views.py

import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import Utilisateur


def _get_or_create_user(email: str, prenom: str, nom: str) -> Utilisateur:
    """Récupère ou crée un utilisateur à partir de son email social."""
    user, created = Utilisateur.objects.get_or_create(
        email=email,
        defaults={
            'prenom': prenom or email.split('@')[0],
            'nom':    nom or 'Utilisateur',
            'role':   'PHARMACIEN',   # rôle par défaut pour les comptes sociaux
            'est_actif': True,
        },
    )
    # Mise à jour des infos si le compte existait déjà avec des champs vides
    if not created:
        changed = False
        if not user.prenom and prenom:
            user.prenom = prenom
            changed = True
        if not user.nom and nom:
            user.nom = nom
            changed = True
        if changed:
            user.save(update_fields=['prenom', 'nom'])

    # Mettre à jour la date de connexion
    user.dernier_connexion = timezone.now()
    user.save(update_fields=['dernier_connexion'])

    return user


def _make_jwt_response(user: Utilisateur) -> dict:
    """Génère la réponse JWT standard."""
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'role':    user.role,
    }


# ── Google ─────────────────────────────────────────────────────────────────────
class GoogleLoginView(APIView):
    """
    POST /auth/social/google/
    Body : { "access_token": "<google_access_token>" }
    """
    permission_classes = [AllowAny]

    GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'access_token manquant.'}, status=400)

        # Vérifier le token auprès de Google
        try:
            resp = requests.get(
                self.GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            resp.raise_for_status()
            info = resp.json()
        except requests.RequestException as e:
            return Response({'error': f'Token Google invalide : {str(e)}'}, status=401)

        email  = info.get('email')
        if not email or not info.get('email_verified', False):
            return Response({'error': 'Email Google non vérifié.'}, status=401)

        prenom = info.get('given_name', '')
        nom    = info.get('family_name', '')

        user = _get_or_create_user(email, prenom, nom)

        if not user.est_actif:
            return Response({'error': 'Compte désactivé.'}, status=403)

        return Response(_make_jwt_response(user))


# ── Microsoft ──────────────────────────────────────────────────────────────────
class MicrosoftLoginView(APIView):
    """
    POST /auth/social/microsoft/
    Body : { "access_token": "<microsoft_access_token>" }
    """
    permission_classes = [AllowAny]

    MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me'

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'access_token manquant.'}, status=400)

        # Vérifier le token auprès de Microsoft Graph
        try:
            resp = requests.get(
                self.MS_GRAPH_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            resp.raise_for_status()
            info = resp.json()
        except requests.RequestException as e:
            return Response({'error': f'Token Microsoft invalide : {str(e)}'}, status=401)

        email = info.get('mail') or info.get('userPrincipalName', '')
        if not email:
            return Response({'error': 'Email Microsoft introuvable.'}, status=401)

        prenom = info.get('givenName', '')
        nom    = info.get('surname', '')
        if not nom and info.get('displayName'):
            parts = info['displayName'].split(' ', 1)
            prenom = prenom or parts[0]
            nom    = parts[1] if len(parts) > 1 else ''

        user = _get_or_create_user(email, prenom, nom)

        if not user.est_actif:
            return Response({'error': 'Compte désactivé.'}, status=403)

        return Response(_make_jwt_response(user))