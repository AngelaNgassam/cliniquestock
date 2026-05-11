from rest_framework import serializers
from django.db.models import Sum
from .models import Medicament, Categorie


class CategorieSerializer(serializers.ModelSerializer):
    nb_medicaments = serializers.SerializerMethodField()

    class Meta:
        model  = Categorie
        fields = ['id', 'nom', 'description', 'nb_medicaments']

    def get_nb_medicaments(self, obj):
        return obj.medicaments.filter(est_actif=True).count()


class MedicamentSerializer(serializers.ModelSerializer):
    categorie_nom     = serializers.CharField(source='categorie.nom', read_only=True)
    stock_actuel      = serializers.SerializerMethodField()
    date_peremption   = serializers.SerializerMethodField()
    numero_lot_actuel = serializers.SerializerMethodField()
    fournisseur_id    = serializers.SerializerMethodField()
    fournisseur_nom   = serializers.SerializerMethodField()

    class Meta:
        model  = Medicament
        fields = [
            'id', 'nom_commercial', 'dci', 'forme_galenique',
            'dosage', 'unite_stock',
            # ✅ prix_vente = prix de vente au patient UNIQUEMENT
            # N'est PAS le prix d'achat fournisseur
            'prix_vente',
            'seuil_alerte', 'conditions_stockage',
            'indications_therapeutiques', 'code_barres', 'est_actif',
            'categorie', 'categorie_nom',
            # Champs calculés depuis LotStock
            'stock_actuel', 'date_peremption', 'numero_lot_actuel',
            'fournisseur_id', 'fournisseur_nom',
        ]
        read_only_fields = ['id']

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
        if not value:
            return None
        qs = Medicament.objects.filter(code_barres=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'Ce code-barres est déjà utilisé.'
            )
        return value

    def validate_prix_vente(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                'Le prix de vente ne peut pas être négatif.'
            )
        return value