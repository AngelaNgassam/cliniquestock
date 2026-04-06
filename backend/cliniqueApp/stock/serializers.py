from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from .models import Reception, LigneReception, LotStock, MouvementStock, Anomalie


# ── Générateur BL sans collision ──────────────────────────────────────────────

def _generer_numero_bl():
    """
    Génère BL-AAAA-NNN unique. Utilise select_for_update pour éviter
    les collisions si deux réceptions sont créées en même temps.
    Repart à 001 chaque nouvelle année.
    """
    from django.db import connection
    annee = timezone.now().year

    # Compter en base avec verrou pour éviter doublons
    nb = Reception.objects.select_for_update().filter(
        numero_bon_livraison__startswith=f'BL-{annee}-'
    ).count()

    candidat = f'BL-{annee}-{str(nb + 1).zfill(3)}'

    # Vérifier unicité (sécurité supplémentaire)
    while Reception.objects.filter(numero_bon_livraison=candidat).exists():
        nb += 1
        candidat = f'BL-{annee}-{str(nb + 1).zfill(3)}'

    return candidat


# ── Serializers ───────────────────────────────────────────────────────────────

class AnomalieSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Anomalie
        fields = ['id', 'type_anomalie', 'description', 'statut', 'date_signalement']
        read_only_fields = ['id', 'date_signalement']


class LigneReceptionSerializer(serializers.ModelSerializer):
    medicament_nom       = serializers.CharField(source='medicament.nom_commercial', read_only=True)
    anomalies            = AnomalieSerializer(many=True, read_only=True)
    type_anomalie        = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    description_anomalie = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model  = LigneReception
        fields = [
            'id', 'medicament', 'medicament_nom',
            'quantite_recue', 'numero_lot', 'date_peremption',
            'prix_achat_reel', 'has_anomalie', 'anomalies',
            'type_anomalie', 'description_anomalie',
        ]
        read_only_fields = ['id']


class ReceptionResumeeSerializer(serializers.ModelSerializer):
    """Serializer léger pour l'historique des réceptions d'une commande."""
    lignes = LigneReceptionSerializer(many=True, read_only=True)

    class Meta:
        model  = Reception
        fields = ['id', 'numero_bon_livraison', 'date_reception', 'statut', 'lignes']


class ReceptionSerializer(serializers.ModelSerializer):
    lignes             = LigneReceptionSerializer(many=True)
    enregistre_par_nom = serializers.CharField(source='enregistre_par.nom', read_only=True)
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    modifiable         = serializers.SerializerMethodField()

    class Meta:
        model  = Reception
        fields = [
            'id', 'date_reception', 'numero_bon_livraison', 'statut',
            'commande', 'commande_reference',
            'enregistre_par', 'enregistre_par_nom',
            'lignes', 'modifiable',
        ]
        read_only_fields = ['id', 'enregistre_par', 'numero_bon_livraison']

    def get_modifiable(self, obj):
        from datetime import timedelta
        return timezone.now() < obj.date_reception + timedelta(hours=24)

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        validated_data['enregistre_par'] = self.context['request'].user
        validated_data['numero_bon_livraison'] = _generer_numero_bl()

        reception    = Reception.objects.create(**validated_data)
        nb_lignes    = len(lignes_data)
        nb_completes = 0
        lignes_pour_email = []

        for ligne_data in lignes_data:
            type_anomalie        = ligne_data.pop('type_anomalie', '') or ''
            description_anomalie = ligne_data.pop('description_anomalie', '') or ''
            ligne_data.pop('anomalies', None)

            has_anomalie             = ligne_data.get('has_anomalie', False)
            quantite_recue_originale = ligne_data.get('quantite_recue', 0)

            # Quantité intégrée au stock selon le type d'anomalie
            if has_anomalie and type_anomalie in ['PRODUIT_NON_CONFORME', 'MEDICAMENT_ENDOMMAGE']:
                quantite_integree_stock = 0
            else:
                quantite_integree_stock = quantite_recue_originale

            ligne = LigneReception.objects.create(reception=reception, **ligne_data)

            # Nom médicament pour email
            try:
                from cliniqueApp.medicaments.models import Medicament
                med_nom = Medicament.objects.get(pk=ligne.medicament_id).nom_commercial
            except Exception:
                med_nom = f'Médicament #{ligne.medicament_id}'

            commande  = reception.commande
            ligne_cmd = commande.lignes.filter(medicament=ligne.medicament).first()
            qte_commandee = ligne_cmd.quantite_commandee if ligne_cmd else quantite_recue_originale

            lignes_pour_email.append({
                'medicament_nom':      med_nom,
                'quantite_commandee':  qte_commandee,
                'quantite_recue':      quantite_recue_originale,
                'has_anomalie':        has_anomalie,
                'type_anomalie':       type_anomalie,
                'description_anomalie': description_anomalie,
            })

            # Créer l'anomalie
            if has_anomalie and type_anomalie:
                Anomalie.objects.create(
                    type_anomalie=type_anomalie,
                    description=description_anomalie or type_anomalie,
                    signale_par=self.context['request'].user,
                    ligne_reception=ligne,
                )

            # Mise à jour stock
            if has_anomalie and type_anomalie == 'MEDICAMENT_ENDOMMAGE':
                lot, _ = LotStock.objects.get_or_create(
                    medicament=ligne.medicament,
                    numero_lot=ligne.numero_lot,
                    defaults={
                        'date_peremption':      ligne.date_peremption,
                        'prix_achat':           ligne.prix_achat_reel,
                        'date_reception':       timezone.now().date(),
                        'quantite_disponible':  0,
                        'quantite_quarantaine': 0,
                        'statut':               LotStock.Statut.QUARANTAINE,
                    }
                )
                lot.quantite_quarantaine = (lot.quantite_quarantaine or 0) + quantite_recue_originale
                lot.statut = LotStock.Statut.QUARANTAINE
                lot.save()

                MouvementStock.objects.create(
                    lot=lot,
                    type_mouvement=MouvementStock.TypeMouvement.ENTREE,
                    type_motif='Réception — Médicament endommagé (quarantaine)',
                    quantite=quantite_recue_originale,
                    operateur=self.context['request'].user,
                    numero_ordre=reception.numero_bon_livraison,
                    commentaire=description_anomalie,
                )

            elif has_anomalie and type_anomalie == 'PRODUIT_NON_CONFORME':
                print(f'[STOCK] Produit non conforme : {med_nom} — non intégré au stock')

            else:
                if quantite_integree_stock > 0:
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
                    lot.quantite_disponible += quantite_integree_stock
                    lot.save()

                    MouvementStock.objects.create(
                        lot=lot,
                        type_mouvement=MouvementStock.TypeMouvement.ENTREE,
                        type_motif='Réception livraison',
                        quantite=quantite_integree_stock,
                        operateur=self.context['request'].user,
                        numero_ordre=reception.numero_bon_livraison,
                        commentaire=description_anomalie if has_anomalie else '',
                    )

            # Mettre à jour quantite_recue sur la ligne de commande
            if ligne_cmd and quantite_integree_stock > 0:
                ligne_cmd.quantite_recue = (ligne_cmd.quantite_recue or 0) + quantite_integree_stock
                ligne_cmd.save()

            if not has_anomalie:
                nb_completes += 1

        # Statut réception
        if nb_completes == nb_lignes:
            reception.statut = Reception.Statut.COMPLETE
        else:
            reception.statut = Reception.Statut.PARTIELLE
        reception.save()

        # Statut commande
        commande = reception.commande
        if reception.statut == Reception.Statut.COMPLETE:
            # Vérifier si toutes les lignes de la commande sont complètes
            toutes_recues = all(
                (l.quantite_recue or 0) >= l.quantite_commandee
                for l in commande.lignes.all()
            )
            commande.statut = 'LIVREE' if toutes_recues else 'PARTIELLE'
        else:
            commande.statut = 'PARTIELLE'
        commande.save()

        # Email compte rendu
        self._envoyer_email_reception(commande, reception, lignes_pour_email)

        return reception

    def _envoyer_email_reception(self, commande, reception, lignes_data):
        try:
            from cliniqueApp.commandes.views import CommandeViewSet
            vue = CommandeViewSet()
            vue._envoyer_email_reception(commande, reception, lignes_data)
        except Exception as e:
            print(f'[EMAIL RECEPTION DELEGATE ERROR] {e}')

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
                    lot.quantite_disponible = max(0, lot.quantite_disponible - ligne.quantite_recue)
                    lot.save()
            instance.lignes.all().delete()

            for ligne_data in lignes_data:
                ligne_data.pop('type_anomalie', '')
                ligne_data.pop('description_anomalie', '')
                ligne_data.pop('anomalies', None)
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


# ── Sortie Stock ──────────────────────────────────────────────────────────────

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
        try:
            medicament = Medicament.objects.get(pk=data['medicament_id'], est_actif=True)
        except Medicament.DoesNotExist:
            raise serializers.ValidationError({'medicament_id': 'Médicament introuvable ou archivé.'})

        today = timezone.now().date()

        if data.get('lot_id'):
            try:
                lot = LotStock.objects.get(pk=data['lot_id'], medicament=medicament, statut=LotStock.Statut.DISPONIBLE)
            except LotStock.DoesNotExist:
                raise serializers.ValidationError({'lot_id': 'Lot introuvable ou indisponible.'})
            if lot.date_peremption < today:
                raise serializers.ValidationError({'lot_id': f'Le lot {lot.numero_lot} est périmé.'})
        else:
            lot = LotStock.objects.filter(
                medicament=medicament,
                statut=LotStock.Statut.DISPONIBLE,
                date_peremption__gte=today,
                quantite_disponible__gt=0,
            ).order_by('date_peremption').first()

            if not lot:
                raise serializers.ValidationError({'medicament_id': 'Aucun lot disponible pour ce médicament.'})

        if data['quantite'] > lot.quantite_disponible:
            raise serializers.ValidationError({'quantite': f'Stock insuffisant. Disponible : {lot.quantite_disponible}.'})

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
        lot.quantite_disponible -= quantite
        if lot.quantite_disponible == 0:
            lot.statut = LotStock.Statut.EPUISE
        lot.save()

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
        from cliniqueApp.alertes.models import Alerte
        total_restant = LotStock.objects.filter(
            medicament=medicament, statut=LotStock.Statut.DISPONIBLE,
        ).aggregate(total=Sum('quantite_disponible'))['total'] or 0

        if total_restant <= medicament.seuil_alerte:
            niveau = (
                Alerte.NiveauUrgence.CRITIQUE if total_restant == 0
                else Alerte.NiveauUrgence.ELEVE if total_restant <= medicament.seuil_alerte // 2
                else Alerte.NiveauUrgence.MOYEN
            )
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