from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .permissions import EstAdmin, EstPharmacien, EstAdminOuPharmacien
from .serializers import LoginSerializer, RegisterSerializer


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
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            token.blacklist()
            return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"error": "Token invalide."}, status=status.HTTP_400_BAD_REQUEST)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            return Response({"access": str(token.access_token)}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"error": "Token invalide ou expiré."}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id":     user.id,
            "nom":    user.nom,
            "prenom": user.prenom,
            "email":  user.email,
            "role":   user.role,
        }, status=status.HTTP_200_OK)
        
        

class AdminOnlyView(APIView):
    permission_classes = [EstAdmin]

    def get(self, request):
        return Response({
            "message": f"Bonjour Admin {request.user.nom} ! Accès autorisé.",
            "role": request.user.role,
        })


class PharmacienOnlyView(APIView):
    permission_classes = [EstPharmacien]

    def get(self, request):
        return Response({
            "message": f"Bonjour Pharmacien {request.user.nom} ! Accès autorisé.",
            "role": request.user.role,
        })


class AdminOuPharmacienView(APIView):
    permission_classes = [EstAdminOuPharmacien]

    def get(self, request):
        return Response({
            "message": f"Bonjour {request.user.nom} ! Accès autorisé.",
            "role": request.user.role,
        })