from rest_framework import serializers
from .models import Medicament, Categorie


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description']


class MedicamentSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = Medicament
        fields = [
            'id', 'nom_commercial', 'dci', 'forme_galenique',
            'dosage', 'unite_stock', 'prix_unitaire', 'seuil_alerte',
            'conditions_stockage', 'indications_therapeutiques',
            'code_barres', 'est_actif', 'categorie', 'categorie_nom',
        ]

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