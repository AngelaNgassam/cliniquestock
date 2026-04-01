from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Reception, LigneReception, LotStock, MouvementStock, Anomalie


class AnomalieSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Anomalie
        fields = ['id', 'type_anomalie', 'description', 'statut', 'date_signalement']
        read_only_fields = ['id', 'date_signalement']


class LigneReceptionSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(
        source='medicament.nom_commercial', read_only=True
    )
    anomalies = AnomalieSerializer(many=True, read_only=True)

    class Meta:
        model  = LigneReception
        fields = [
            'id', 'medicament', 'medicament_nom',
            'quantite_recue', 'numero_lot', 'date_peremption',
            'prix_achat_reel', 'has_anomalie', 'anomalies',
        ]
        read_only_fields = ['id']


class ReceptionSerializer(serializers.ModelSerializer):
    lignes           = LigneReceptionSerializer(many=True)
    enregistre_par_nom = serializers.CharField(
        source='enregistre_par.nom', read_only=True
    )
    commande_reference = serializers.CharField(
        source='commande.reference', read_only=True
    )
    modifiable = serializers.SerializerMethodField()

    class Meta:
        model  = Reception
        fields = [
            'id', 'date_reception', 'numero_bon_livraison', 'statut',
            'commande', 'commande_reference',
            'enregistre_par', 'enregistre_par_nom',
            'lignes', 'modifiable',
        ]
        read_only_fields = ['id', 'enregistre_par']

    def get_modifiable(self, obj):
        from datetime import timedelta
        return timezone.now() < obj.date_reception + timedelta(hours=24)

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        validated_data['enregistre_par'] = self.context['request'].user

        reception = Reception.objects.create(**validated_data)

        nb_lignes    = len(lignes_data)
        nb_completes = 0

        for ligne_data in lignes_data:
            anomalies_data = ligne_data.pop('anomalies', [])
            ligne = LigneReception.objects.create(
                reception=reception, **ligne_data
            )

            # ── Mettre à jour ou créer le LotStock ───────────────────────────
            lot, created = LotStock.objects.get_or_create(
                medicament=ligne.medicament,
                numero_lot=ligne.numero_lot,
                defaults={
                    'date_peremption':    ligne.date_peremption,
                    'prix_achat':         ligne.prix_achat_reel,
                    'date_reception':     timezone.now().date(),
                    'quantite_disponible': 0,
                    'statut': LotStock.Statut.DISPONIBLE,
                }
            )
            lot.quantite_disponible += ligne.quantite_recue
            lot.save()

            # ── Enregistrer le mouvement d'entrée ─────────────────────────────
            MouvementStock.objects.create(
                lot=lot,
                type_mouvement=MouvementStock.TypeMouvement.ENTREE,
                type_motif='Réception livraison',
                quantite=ligne.quantite_recue,
                operateur=self.context['request'].user,
                numero_ordre=reception.numero_bon_livraison,
            )

            # ── Créer les anomalies si présentes ─────────────────────────────
            for anomalie_data in anomalies_data:
                Anomalie.objects.create(
                    ligne_reception=ligne,
                    signale_par=self.context['request'].user,
                    **anomalie_data
                )

            if not ligne.has_anomalie:
                nb_completes += 1

        # ── Déterminer le statut de la réception ─────────────────────────────
        if nb_completes == nb_lignes:
            reception.statut = Reception.Statut.COMPLETE
        elif nb_completes > 0:
            reception.statut = Reception.Statut.PARTIELLE
        reception.save()

        # ── Mettre à jour le statut de la commande ───────────────────────────
        commande = reception.commande
        if reception.statut == Reception.Statut.COMPLETE:
            commande.statut = 'LIVREE'
        else:
            commande.statut = 'PARTIELLE'
        commande.save()

        return reception

    @transaction.atomic
    def update(self, instance, validated_data):
        from datetime import timedelta
        if timezone.now() >= instance.date_reception + timedelta(hours=24):
            raise serializers.ValidationError(
                "Impossible de modifier une réception de plus de 24h."
            )

        lignes_data = validated_data.pop('lignes', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lignes_data is not None:
            # Annuler les anciens mouvements d'entrée
            for ligne in instance.lignes.all():
                lot = LotStock.objects.filter(
                    medicament=ligne.medicament,
                    numero_lot=ligne.numero_lot
                ).first()
                if lot:
                    lot.quantite_disponible = max(
                        0, lot.quantite_disponible - ligne.quantite_recue
                    )
                    lot.save()
            instance.lignes.all().delete()

            # Recréer avec les nouvelles valeurs
            for ligne_data in lignes_data:
                ligne_data.pop('anomalies', [])
                ligne = LigneReception.objects.create(
                    reception=instance, **ligne_data
                )
                lot, _ = LotStock.objects.get_or_create(
                    medicament=ligne.medicament,
                    numero_lot=ligne.numero_lot,
                    defaults={
                        'date_peremption':     ligne.date_peremption,
                        'prix_achat':          ligne.prix_achat_reel,
                        'date_reception':      timezone.now().date(),
                        'quantite_disponible': 0,
                        'statut': LotStock.Statut.DISPONIBLE,
                    }
                )
                lot.quantite_disponible += ligne.quantite_recue
                lot.save()

                MouvementStock.objects.create(
                    lot=lot,
                    type_mouvement=MouvementStock.TypeMouvement.ENTREE,
                    type_motif='Correction réception',
                    quantite=ligne.quantite_recue,
                    operateur=self.context['request'].user,
                    numero_ordre=instance.numero_bon_livraison,
                )

        instance.save()
        return instance