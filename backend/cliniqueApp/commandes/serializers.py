from rest_framework import serializers
from .models import Fournisseur, Commande


class FournisseurSerializer(serializers.ModelSerializer):
    total_commandes = serializers.SerializerMethodField()
    volume_affaires  = serializers.SerializerMethodField()

    class Meta:
        model  = Fournisseur
        fields = [
            'id', 'nom_societe', 'contact', 'email', 'adresse',
            'est_actif', 'total_commandes', 'volume_affaires',
        ]
        read_only_fields = ['id']

    def get_total_commandes(self, obj):
        return obj.commandes.count()

    def get_volume_affaires(self, obj):
        from django.db.models import Sum
        total = obj.commandes.aggregate(
            total=Sum('montant_total')
        )['total']
        return total or 0

    def validate_email(self, value):
        instance = self.instance
        qs = Fournisseur.objects.filter(email=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Un fournisseur avec cet email existe déjà."
            )
        return value


class CommandeResumeeSerializer(serializers.ModelSerializer):
    """Utilisé dans l'historique d'un fournisseur."""
    class Meta:
        model  = Commande
        fields = [
            'id', 'reference', 'date_creation',
            'date_livraison_prevue', 'statut', 'montant_total',
        ]