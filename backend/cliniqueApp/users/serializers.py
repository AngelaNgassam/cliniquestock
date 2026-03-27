from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Utilisateur

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Identifiants incorrects.")
        if not user.est_actif:
            raise serializers.ValidationError("Compte désactivé.")
        data['user'] = user
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = Utilisateur
        fields = ['nom', 'prenom', 'email', 'role', 'password']

    def create(self, validated_data):
        return Utilisateur.objects.create_user(**validated_data)