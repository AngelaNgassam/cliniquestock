from rest_framework import serializers
from django.db.models import Sum
from .models import Medicament, Categorie


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Categorie
        fields = ['id', 'nom', 'description']


class MedicamentSerializer(serializers.ModelSerializer):
    categorie_nom      = serializers.CharField(source='categorie.nom', read_only=True)
    stock_actuel       = serializers.SerializerMethodField()
    date_peremption    = serializers.SerializerMethodField()
    numero_lot_actuel  = serializers.SerializerMethodField()
    fournisseur_id     = serializers.SerializerMethodField()
    fournisseur_nom    = serializers.SerializerMethodField()

    class Meta:
        model  = Medicament
        fields = [
            'id', 'nom_commercial', 'dci', 'forme_galenique',
            'dosage', 'unite_stock', 'prix_unitaire', 'seuil_alerte',
            'conditions_stockage', 'indications_therapeutiques',
            'code_barres', 'est_actif', 'categorie', 'categorie_nom',
            # champs calculés depuis LotStock
            'stock_actuel', 'date_peremption', 'numero_lot_actuel',
            'fournisseur_id', 'fournisseur_nom',
        ]

    def get_stock_actuel(self, obj):
        try:
            from cliniqueApp.stock.models import LotStock
            return LotStock.objects.filter(
                medicament=obj, statut='DISPONIBLE'
            ).aggregate(total=Sum('quantite_disponible'))['total'] or 0
        except Exception:
            return None

    def get_date_peremption(self, obj):
        """Date de péremption la plus proche parmi les lots disponibles."""
        try:
            from cliniqueApp.stock.models import LotStock
            lot = LotStock.objects.filter(
                medicament=obj, statut='DISPONIBLE'
            ).order_by('date_peremption').first()
            return lot.date_peremption if lot else None
        except Exception:
            return None

    def get_numero_lot_actuel(self, obj):
        """Numéro du lot avec la date de péremption la plus proche."""
        try:
            from cliniqueApp.stock.models import LotStock
            lot = LotStock.objects.filter(
                medicament=obj, statut='DISPONIBLE'
            ).order_by('date_peremption').first()
            return lot.numero_lot if lot else None
        except Exception:
            return None

    def get_fournisseur_id(self, obj):
        """Fournisseur de la dernière réception."""
        try:
            from cliniqueApp.stock.models import Reception
            rec = Reception.objects.filter(
                commande__lignes__medicament=obj
            ).order_by('-date_reception').first()
            return rec.commande.fournisseur_id if rec else None
        except Exception:
            return None

    def get_fournisseur_nom(self, obj):
        try:
            from cliniqueApp.stock.models import Reception
            rec = Reception.objects.filter(
                commande__lignes__medicament=obj
            ).order_by('-date_reception').first()
            return rec.commande.fournisseur.nom_societe if rec else None
        except Exception:
            return None

    def validate_code_barres(self, value):
        instance = self.instance
        qs = Medicament.objects.filter(code_barres=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Un médicament avec ce code-barres existe déjà."
            )
        return value

    def validate_prix_unitaire(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Le prix unitaire ne peut pas être négatif."
            )
        return value