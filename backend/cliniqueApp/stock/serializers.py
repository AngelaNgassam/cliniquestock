from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from .models import Reception, LigneReception, LotStock, MouvementStock, Anomalie


# ── Serializers Réception (inchangés) ────────────────────────────────────────

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
    lignes             = LigneReceptionSerializer(many=True)
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

        reception    = Reception.objects.create(**validated_data)
        nb_lignes    = len(lignes_data)
        nb_completes = 0

        for ligne_data in lignes_data:
            ligne_data.pop('anomalies', [])
            ligne = LigneReception.objects.create(reception=reception, **ligne_data)

            lot, _ = LotStock.objects.get_or_create(
                medicament=ligne.medicament,
                numero_lot=ligne.numero_lot,
                defaults={
                    'date_peremption':     ligne.date_peremption,
                    'prix_achat':          ligne.prix_achat_reel,
                    'date_reception':      timezone.now().date(),
                    'quantite_disponible': 0,
                    'statut':              LotStock.Statut.DISPONIBLE,
                }
            )
            lot.quantite_disponible += ligne.quantite_recue
            lot.save()

            MouvementStock.objects.create(
                lot=lot,
                type_mouvement=MouvementStock.TypeMouvement.ENTREE,
                type_motif='Réception livraison',
                quantite=ligne.quantite_recue,
                operateur=self.context['request'].user,
                numero_ordre=reception.numero_bon_livraison,
            )

            if not ligne.has_anomalie:
                nb_completes += 1

        if nb_completes == nb_lignes:
            reception.statut = Reception.Statut.COMPLETE
        elif nb_completes > 0:
            reception.statut = Reception.Statut.PARTIELLE
        reception.save()

        commande = reception.commande
        commande.statut = 'LIVREE' if reception.statut == Reception.Statut.COMPLETE else 'PARTIELLE'
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

            for ligne_data in lignes_data:
                ligne_data.pop('anomalies', [])
                ligne = LigneReception.objects.create(reception=instance, **ligne_data)
                lot, _ = LotStock.objects.get_or_create(
                    medicament=ligne.medicament,
                    numero_lot=ligne.numero_lot,
                    defaults={
                        'date_peremption':     ligne.date_peremption,
                        'prix_achat':          ligne.prix_achat_reel,
                        'date_reception':      timezone.now().date(),
                        'quantite_disponible': 0,
                        'statut':              LotStock.Statut.DISPONIBLE,
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


# ── Serializer Sortie/Dispensation ────────────────────────────────────────────

class SortieStockSerializer(serializers.Serializer):
    medicament_id  = serializers.IntegerField()
    lot_id         = serializers.IntegerField(required=False, allow_null=True)
    quantite       = serializers.IntegerField(min_value=1)
    num_ordonnance = serializers.CharField(max_length=100, required=False, allow_blank=True)
    patient_nom    = serializers.CharField(max_length=150, required=False, allow_blank=True)
    prescripteur   = serializers.CharField(max_length=150, required=False, allow_blank=True)
    commentaire    = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        from cliniqueApp.medicaments.models import Medicament

        # Vérifier que le médicament existe et est actif
        try:
            medicament = Medicament.objects.get(pk=data['medicament_id'], est_actif=True)
        except Medicament.DoesNotExist:
            raise serializers.ValidationError(
                {'medicament_id': 'Médicament introuvable ou archivé.'}
            )

        today = timezone.now().date()

        if data.get('lot_id'):
            # Lot spécifié manuellement
            try:
                lot = LotStock.objects.get(
                    pk=data['lot_id'],
                    medicament=medicament,
                    statut=LotStock.Statut.DISPONIBLE,
                )
            except LotStock.DoesNotExist:
                raise serializers.ValidationError(
                    {'lot_id': 'Lot introuvable ou indisponible.'}
                )
            if lot.date_peremption < today:
                raise serializers.ValidationError(
                    {'lot_id': f'Le lot {lot.numero_lot} est périmé ({lot.date_peremption}).'}
                )
        else:
            # Sélection automatique FEFO (First Expired First Out)
            lot = LotStock.objects.filter(
                medicament=medicament,
                statut=LotStock.Statut.DISPONIBLE,
                date_peremption__gte=today,
                quantite_disponible__gt=0,
            ).order_by('date_peremption').first()

            if not lot:
                raise serializers.ValidationError(
                    {'medicament_id': 'Aucun lot disponible et non périmé pour ce médicament.'}
                )

        # Vérifier stock suffisant
        if data['quantite'] > lot.quantite_disponible:
            raise serializers.ValidationError({
                'quantite': (
                    f'Stock insuffisant. Disponible : {lot.quantite_disponible} unité(s) '
                    f'dans le lot {lot.numero_lot}.'
                )
            })

        data['_medicament'] = medicament
        data['_lot']        = lot
        return data

    @transaction.atomic
    def create(self, validated_data):
        medicament = validated_data.pop('_medicament')
        lot        = validated_data.pop('_lot')
        operateur  = self.context['request'].user

        validated_data.pop('medicament_id', None)
        validated_data.pop('lot_id', None)

        quantite = validated_data['quantite']

        # Décrémenter le stock
        lot.quantite_disponible -= quantite
        if lot.quantite_disponible == 0:
            lot.statut = LotStock.Statut.EPUISE
        lot.save()

        # Enregistrer le mouvement
        mouvement = MouvementStock.objects.create(
            lot=lot,
            type_mouvement=MouvementStock.TypeMouvement.SORTIE,
            type_motif='Dispensation',
            quantite=quantite,
            operateur=operateur,
            numero_ordre=validated_data.get('num_ordonnance', ''),
            patient_nom=validated_data.get('patient_nom', ''),
            prescripteur=validated_data.get('prescripteur', ''),
            commentaire=validated_data.get('commentaire', ''),
        )

        # Vérifier et créer alerte si nécessaire
        self._verifier_alerte(medicament, operateur)

        return {
            'mouvement_id':    mouvement.id,
            'medicament':      medicament.nom_commercial,
            'lot':             lot.numero_lot,
            'quantite_sortie': quantite,
            'stock_restant':   lot.quantite_disponible,
            'statut_lot':      lot.statut,
            'en_alerte':       lot.quantite_disponible <= medicament.seuil_alerte,
            'date_operation':  mouvement.date_operation,
        }

    def _verifier_alerte(self, medicament, operateur):
        """Crée une alerte stock si quantité totale sous le seuil."""
        from cliniqueApp.alertes.models import Alerte

        total_restant = LotStock.objects.filter(
            medicament=medicament,
            statut=LotStock.Statut.DISPONIBLE,
        ).aggregate(total=Sum('quantite_disponible'))['total'] or 0

        if total_restant <= medicament.seuil_alerte:

            # Niveau selon criticité
            if total_restant == 0:
                niveau = Alerte.NiveauUrgence.CRITIQUE
            elif total_restant <= medicament.seuil_alerte // 2:
                niveau = Alerte.NiveauUrgence.ELEVE
            else:
                niveau = Alerte.NiveauUrgence.MOYEN

            # Éviter les doublons
            existe = Alerte.objects.filter(
                destinataire=operateur,
                type_alerte=Alerte.TypeAlerte.STOCK_BAS,
                est_lue=False,
                message__contains=medicament.nom_commercial,
            ).exists()

            if not existe:
                Alerte.objects.create(
                    type_alerte=Alerte.TypeAlerte.STOCK_BAS,
                    niveau_urgence=niveau,
                    message=(
                        f'Stock faible pour {medicament.nom_commercial} : '
                        f'{total_restant} unité(s) restante(s) '
                        f'(seuil : {medicament.seuil_alerte}).'
                    ),
                    destinataire=operateur,
                    est_lue=False,
                )