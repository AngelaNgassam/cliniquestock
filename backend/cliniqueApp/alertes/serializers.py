from rest_framework import serializers
from .models import Alerte


class AlerteSerializer(serializers.ModelSerializer):
    destinataire_nom = serializers.CharField(
        source='destinataire.nom', read_only=True
    )

    class Meta:
        model  = Alerte
        fields = [
            'id', 'type_alerte', 'niveau_urgence', 'message',
            'date_creation', 'est_lue', 'destinataire', 'destinataire_nom',
        ]
        read_only_fields = ['id', 'date_creation']