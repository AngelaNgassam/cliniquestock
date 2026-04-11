from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .permissions import EstAdmin, EstPharmacien, EstAdminOuPharmacien
from .serializers import LoginSerializer, RegisterSerializer
from .models import Utilisateur


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Compte créé avec succès.",
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
                "role":    user.role,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "role":    user.role,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            token.blacklist()
            return Response({"message": "Déconnexion réussie."})
        except TokenError:
            return Response({"error": "Token invalide."}, status=400)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            return Response({"access": str(token.access_token)})
        except TokenError:
            return Response({"error": "Token invalide."}, status=401)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id":     u.id,
            "nom":    u.nom,
            "prenom": u.prenom,
            "email":  u.email,
            "role":   u.role,
        })


# ── Gestion des utilisateurs (Admin) ─────────────────────────────────────────

class UtilisateurListView(APIView):
    permission_classes = [EstAdmin]

    def get(self, request):
        """GET /auth/utilisateurs/ — liste tous les utilisateurs"""
        search = request.query_params.get('search', '')
        role   = request.query_params.get('role', '')
        statut = request.query_params.get('statut', '')

        qs = Utilisateur.objects.all().order_by('-date_creation')
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(
                prenom__icontains=search) | qs.filter(email__icontains=search)
        if role:
            qs = qs.filter(role=role)
        if statut == 'actif':
            qs = qs.filter(est_actif=True)
        elif statut == 'inactif':
            qs = qs.filter(est_actif=False)

        data = [{
            'id':               u.id,
            'nom':              u.nom,
            'prenom':           u.prenom,
            'email':            u.email,
            'role':             u.role,
            'est_actif':        u.est_actif,
            'date_creation':    u.date_creation,
            'dernier_connexion': u.dernier_connexion,
        } for u in qs]

        # Stats
        total        = Utilisateur.objects.count()
        admins       = Utilisateur.objects.filter(role='ADMINISTRATEUR').count()
        pharmaciens  = Utilisateur.objects.filter(role='PHARMACIEN').count()
        actifs       = Utilisateur.objects.filter(est_actif=True).count()

        return Response({
            'utilisateurs': data,
            'stats': {
                'total':       total,
                'admins':      admins,
                'pharmaciens': pharmaciens,
                'actifs':      actifs,
            }
        })

    def post(self, request):
        """POST /auth/utilisateurs/ — créer un utilisateur"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Journal
            try:
                from cliniqueApp.rapports.models import JournalAudit
                JournalAudit.objects.create(
                    action='CREATION_UTILISATEUR',
                    entite_concernee=f'Utilisateur : {user.prenom} {user.nom}',
                    nouvelle_valeur={'email': user.email, 'role': user.role},
                    utilisateur=request.user,
                    adresse_ip=request.META.get('REMOTE_ADDR'),
                )
            except Exception:
                pass
            return Response({
                'id':      user.id,
                'nom':     user.nom,
                'prenom':  user.prenom,
                'email':   user.email,
                'role':    user.role,
                'est_actif': user.est_actif,
                'message': 'Utilisateur créé avec succès.',
            }, status=201)
        return Response(serializer.errors, status=400)


class UtilisateurDetailView(APIView):
    permission_classes = [EstAdmin]

    def get_user(self, pk):
        try:
            return Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)
        return Response({
            'id':               user.id,
            'nom':              user.nom,
            'prenom':           user.prenom,
            'email':            user.email,
            'role':             user.role,
            'est_actif':        user.est_actif,
            'date_creation':    user.date_creation,
            'dernier_connexion': user.dernier_connexion,
        })

    def patch(self, request, pk):
        """PATCH /auth/utilisateurs/{id}/ — modifier"""
        user = self.get_user(pk)
        if not user:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)

        # Ne pas modifier son propre compte via cet endpoint
        allowed_fields = ['nom', 'prenom', 'role', 'est_actif']
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])

        # Mot de passe optionnel
        if request.data.get('password'):
            user.set_password(request.data['password'])

        user.save()

        try:
            from cliniqueApp.rapports.models import JournalAudit
            JournalAudit.objects.create(
                action='MODIFICATION_UTILISATEUR',
                entite_concernee=f'Utilisateur : {user.prenom} {user.nom}',
                nouvelle_valeur={field: request.data.get(field) for field in allowed_fields if field in request.data},
                utilisateur=request.user,
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass

        return Response({'message': 'Utilisateur modifié.', 'id': user.id})

    def delete(self, request, pk):
        """DELETE /auth/utilisateurs/{id}/ — désactiver (soft delete)"""
        user = self.get_user(pk)
        if not user:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)
        if user.id == request.user.id:
            return Response({'error': 'Impossible de supprimer votre propre compte.'}, status=400)

        user.est_actif = False
        user.save()

        try:
            from cliniqueApp.rapports.models import JournalAudit
            JournalAudit.objects.create(
                action='DESACTIVATION_UTILISATEUR',
                entite_concernee=f'Utilisateur : {user.prenom} {user.nom}',
                nouvelle_valeur={'est_actif': False},
                utilisateur=request.user,
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass

        return Response({'message': f'Utilisateur {user.nom} désactivé.'})


class ToggleStatutView(APIView):
    permission_classes = [EstAdmin]

    def patch(self, request, pk):
        """PATCH /auth/utilisateurs/{id}/toggle/ — activer/désactiver"""
        try:
            user = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)

        if user.id == request.user.id:
            return Response({'error': 'Impossible de modifier votre propre statut.'}, status=400)

        user.est_actif = not user.est_actif
        user.save()
        etat = 'activé' if user.est_actif else 'désactivé'
        return Response({'message': f'Utilisateur {user.nom} {etat}.', 'est_actif': user.est_actif})


class AdminOnlyView(APIView):
    permission_classes = [EstAdmin]
    def get(self, request):
        return Response({"message": f"Bonjour Admin {request.user.nom} !"})


class PharmacienOnlyView(APIView):
    permission_classes = [EstPharmacien]
    def get(self, request):
        return Response({"message": f"Bonjour Pharmacien {request.user.nom} !"})


class AdminOuPharmacienView(APIView):
    permission_classes = [EstAdminOuPharmacien]
    def get(self, request):
        return Response({"message": f"Bonjour {request.user.nom} !"})