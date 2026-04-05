from rest_framework import serializers
from django.utils import timezone
from .models import Commande, LigneCommande, Fournisseur


class FournisseurSerializer(serializers.ModelSerializer):
    total_commandes = serializers.SerializerMethodField()
    volume_affaires = serializers.SerializerMethodField()

    class Meta:
        model  = Fournisseur
        fields = ['id', 'nom_societe', 'contact', 'email', 'adresse',
                  'est_actif', 'total_commandes', 'volume_affaires']
        read_only_fields = ['id']

    def get_total_commandes(self, obj):
        return obj.commandes.count()

    def get_volume_affaires(self, obj):
        from django.db.models import Sum
        return obj.commandes.aggregate(total=Sum('montant_total'))['total'] or 0

    def validate_email(self, value):
        instance = self.instance
        qs = Fournisseur.objects.filter(email=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Un fournisseur avec cet email existe déjà.")
        return value


class CommandeResumeeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Commande
        fields = ['id', 'reference', 'date_creation',
                  'date_livraison_prevue', 'statut', 'montant_total']


# ── Nouveaux serializers pour l'issue #11 ─────────────────────────────────────

class LigneCommandeSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(
        source='medicament.nom_commercial', read_only=True
    )
    total_ligne = serializers.SerializerMethodField()

    class Meta:
        model  = LigneCommande
        fields = [
            'id', 'medicament', 'medicament_nom',
            'quantite_commandee', 'quantite_recue',
            'prix_unitaire_estime', 'total_ligne',
        ]

    def get_total_ligne(self, obj):
        return obj.quantite_commandee * obj.prix_unitaire_estime


class CommandeSerializer(serializers.ModelSerializer):
    lignes         = LigneCommandeSerializer(many=True)
    cree_par_nom   = serializers.CharField(
        source='cree_par.get_full_name', read_only=True
    )
    fournisseur_nom = serializers.CharField(
        source='fournisseur.nom_societe', read_only=True
    )
    modifiable     = serializers.SerializerMethodField()

    class Meta:
        model  = Commande
        fields = [
            'id', 'reference', 'date_creation', 'date_livraison_prevue',
            'statut', 'montant_total', 'fournisseur', 'fournisseur_nom',
            'cree_par', 'cree_par_nom', 'lignes', 'modifiable',
        ]
        read_only_fields = ['id', 'reference', 'date_creation', 'montant_total', 'cree_par']


    def get_modifiable(self, obj):
        """True si la commande a moins de 24h."""
        from datetime import timedelta
        return timezone.now() < obj.date_creation + timedelta(hours=24)

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        # Générer une référence unique automatiquement
        import uuid
        validated_data['reference'] = f"CMD-{uuid.uuid4().hex[:8].upper()}"
        validated_data['cree_par']  = self.context['request'].user

        commande = Commande.objects.create(**validated_data)

        montant = 0
        for ligne_data in lignes_data:
            ligne = LigneCommande.objects.create(commande=commande, **ligne_data)
            montant += ligne.quantite_commandee * ligne.prix_unitaire_estime

        commande.montant_total = montant
        commande.save()
        return commande

    def update(self, instance, validated_data):
        from datetime import timedelta
        # Règle 24h
        if timezone.now() >= instance.date_creation + timedelta(hours=24):
            raise serializers.ValidationError(
                "Impossible de modifier une commande de plus de 24h."
            )

        lignes_data = validated_data.pop('lignes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lignes_data is not None:
            instance.lignes.all().delete()
            montant = 0
            for ligne_data in lignes_data:
                ligne = LigneCommande.objects.create(commande=instance, **ligne_data)
                montant += ligne.quantite_commandee * ligne.prix_unitaire_estime
            instance.montant_total = montant

        instance.save()
        return instance