from django.utils import timezone  # ✅ CORRECTION ICI
from django.db import transaction
from django.db.models import Sum, F

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Inventaire, Reception, LotStock, MouvementStock
from .serializers import ReceptionSerializer, SortieStockSerializer


class ReceptionViewSet(viewsets.ModelViewSet):
    serializer_class = ReceptionSerializer

    def get_queryset(self):
        qs = Reception.objects.all()\
            .prefetch_related('lignes', 'lignes__anomalies')\
            .select_related('enregistre_par', 'commande')\
            .order_by('-date_reception')
        commande_id = self.request.query_params.get('commande')
        if commande_id:
            qs = qs.filter(commande_id=commande_id)
        return qs

    def get_permissions(self):
        return [EstAdminOuPharmacien()]

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': "La suppression d'une réception n'est pas autorisée."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=False, methods=['get'], url_path='numeros_lot')
    def numeros_lot(self, request):
        medicament_id = request.query_params.get('medicament_id')
        if not medicament_id:
            return Response({'error': 'medicament_id requis.'}, status=400)

        annee = timezone.now().year

        lots_existants = LotStock.objects.filter(
            medicament_id=medicament_id,
            numero_lot__startswith=f'LOT-{annee}',
        ).values_list('numero_lot', flat=True)

        lettres_utilisees = set()
        for lot in lots_existants:
            suffixe = lot.replace(f'LOT-{annee}', '')
            if suffixe:
                lettres_utilisees.add(suffixe.upper())

        import string
        alphabet = string.ascii_uppercase
        prochain = None

        for lettre in alphabet:
            if lettre not in lettres_utilisees:
                prochain = f'LOT-{annee}{lettre}'
                break

        if not prochain:
            for l1 in alphabet:
                for l2 in alphabet:
                    combo = l1 + l2
                    if combo not in lettres_utilisees:
                        prochain = f'LOT-{annee}{combo}'
                        break
                if prochain:
                    break

        tous_lots = list(LotStock.objects.filter(
            medicament_id=medicament_id,
        ).values('numero_lot', 'date_peremption', 'quantite_disponible', 'statut'))

        return Response({
            'prochain_numero': prochain or f'LOT-{annee}A',
            'lots_existants':  tous_lots,
        })


class StockViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def list(self, request):
        from cliniqueApp.medicaments.models import Medicament
        medicaments = Medicament.objects.filter(est_actif=True)

        stock_data = []
        for med in medicaments:
            lots = med.lots.filter(statut=LotStock.Statut.DISPONIBLE)
            quantite_totale = lots.aggregate(total=Sum('quantite_disponible'))['total'] or 0
            valeur = lots.aggregate(val=Sum(F('quantite_disponible') * F('prix_achat')))['val'] or 0
            stock_data.append({
                'medicament_id':   med.id,
                'nom_commercial':  med.nom_commercial,
                'dci':             med.dci,
                'forme_galenique': med.forme_galenique,
                'quantite_totale': quantite_totale,
                'seuil_alerte':    med.seuil_alerte,
                'en_alerte':       quantite_totale <= med.seuil_alerte,
                'valeur_stock':    float(valeur),
                'nb_lots':         lots.count(),
            })
        return Response(stock_data)

    def retrieve(self, request, pk=None):
        from cliniqueApp.medicaments.models import Medicament

        try:
            med = Medicament.objects.get(pk=pk)
        except Medicament.DoesNotExist:
            return Response({'error': 'Médicament introuvable.'}, status=404)

        lots = med.lots.all().order_by('date_peremption')
        lots_data = [{
            'id':                  lot.id,
            'numero_lot':          lot.numero_lot,
            'date_peremption':     lot.date_peremption,
            'quantite_disponible': lot.quantite_disponible,
            'prix_achat':          float(lot.prix_achat),
            'statut':              lot.statut,
            'expire':              lot.date_peremption < timezone.now().date(),
            'proche_peremption':   (lot.date_peremption - timezone.now().date()).days <= 90,
        } for lot in lots]

        return Response({
            'medicament_id':  med.id,
            'nom_commercial': med.nom_commercial,
            'dci':            med.dci,
            'lots':           lots_data,
        })


class MouvementViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def list(self, request):
        qs = MouvementStock.objects.select_related(
            'lot__medicament', 'operateur'
        ).order_by('-date_operation')

        if request.query_params.get('type'):
            qs = qs.filter(type_mouvement=request.query_params['type'])
        if request.query_params.get('medicament_id'):
            qs = qs.filter(lot__medicament_id=request.query_params['medicament_id'])
        if request.query_params.get('date_debut'):
            qs = qs.filter(date_operation__date__gte=request.query_params['date_debut'])
        if request.query_params.get('date_fin'):
            qs = qs.filter(date_operation__date__lte=request.query_params['date_fin'])

        data = [{
            'id':             m.id,
            'type_mouvement': m.type_mouvement,
            'motif':          m.type_motif,
            'quantite':       m.quantite,
            'date_operation': m.date_operation,
            'operateur':      m.operateur.nom,
            'medicament':     m.lot.medicament.nom_commercial,
            'numero_lot':     m.lot.numero_lot,
            'numero_ordre':   m.numero_ordre,
            'patient_nom':    m.patient_nom,
            'prescripteur':   m.prescripteur,
        } for m in qs[:200]]
        return Response(data)


class SortieStockViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def create(self, request):
        serializer = SortieStockSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)

    def list(self, request):
        qs = MouvementStock.objects.filter(
            type_mouvement=MouvementStock.TypeMouvement.SORTIE
        ).select_related('lot__medicament', 'operateur').order_by('-date_operation')

        if request.query_params.get('medicament_id'):
            qs = qs.filter(lot__medicament_id=request.query_params['medicament_id'])
        if request.query_params.get('date_debut'):
            qs = qs.filter(date_operation__date__gte=request.query_params['date_debut'])
        if request.query_params.get('date_fin'):
            qs = qs.filter(date_operation__date__lte=request.query_params['date_fin'])

        data = [{
            'id':             m.id,
            'medicament':     m.lot.medicament.nom_commercial,
            'dci':            m.lot.medicament.dci,
            'numero_lot':     m.lot.numero_lot,
            'quantite':       m.quantite,
            'date_operation': m.date_operation,
            'operateur':      m.operateur.nom,
            'num_ordonnance': m.numero_ordre,
            'patient_nom':    m.patient_nom,
            'prescripteur':   m.prescripteur,
        } for m in qs[:200]]
        return Response(data)


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def list(self, request):
        from cliniqueApp.medicaments.models import Medicament, Categorie
        from cliniqueApp.commandes.models import Commande
        from cliniqueApp.alertes.models import Alerte
        from datetime import timedelta

        today = timezone.now().date()
        user  = request.user

        total_medicaments = Medicament.objects.filter(est_actif=True).count()

        ruptures = 0
        stock_faible = 0
        for med in Medicament.objects.filter(est_actif=True):
            stock = LotStock.objects.filter(
                medicament=med, statut='DISPONIBLE'
            ).aggregate(total=Sum('quantite_disponible'))['total'] or 0
            if stock == 0:
                ruptures += 1
            elif stock <= med.seuil_alerte:
                stock_faible += 1

        lots_expirant_30j = LotStock.objects.filter(
            statut='DISPONIBLE',
            date_peremption__lte=today + timedelta(days=30),
            date_peremption__gte=today,
        ).count()

        commandes_en_cours = Commande.objects.filter(
            statut__in=['EN_ATTENTE', 'PARTIELLE']
        ).count()

        valeur_stock = LotStock.objects.filter(statut='DISPONIBLE').aggregate(
            val=Sum(F('quantite_disponible') * F('prix_achat'))
        )['val'] or 0

        alertes_actives = Alerte.objects.filter(destinataire=user, est_lue=False).count()

        mouvements_data = []
        mois_noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                     'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        for i in range(5, -1, -1):
            mois_debut = today.replace(day=1) - timedelta(days=i * 28)
            if mois_debut.month < 12:
                mois_fin = mois_debut.replace(month=mois_debut.month + 1, day=1)
            else:
                mois_fin = mois_debut.replace(year=mois_debut.year + 1, month=1, day=1)

            entrees = MouvementStock.objects.filter(
                type_mouvement='ENTREE',
                date_operation__date__gte=mois_debut,
                date_operation__date__lt=mois_fin,
            ).aggregate(total=Sum('quantite'))['total'] or 0

            sorties = MouvementStock.objects.filter(
                type_mouvement='SORTIE',
                date_operation__date__gte=mois_debut,
                date_operation__date__lt=mois_fin,
            ).aggregate(total=Sum('quantite'))['total'] or 0

            mouvements_data.append({
                'mois':    mois_noms[mois_debut.month - 1],
                'entrees': entrees,
                'sorties': sorties,
            })

        valeur_par_categorie = []
        for cat in Categorie.objects.all():
            valeur = 0
            for med in Medicament.objects.filter(categorie=cat, est_actif=True):
                lots = LotStock.objects.filter(medicament=med, statut='DISPONIBLE')
                valeur += lots.aggregate(val=Sum(F('quantite_disponible') * F('prix_achat')))['val'] or 0
            if valeur > 0:
                valeur_par_categorie.append({'categorie': cat.nom, 'valeur': float(valeur)})

        analyse_alertes = [
            {'type': 'Rupture',         'count': ruptures},
            {'type': 'Seuil Critique',  'count': stock_faible},
            {'type': 'Péremption < 30', 'count': lots_expirant_30j},
            {'type': 'Péremption < 90', 'count': LotStock.objects.filter(
                statut='DISPONIBLE',
                date_peremption__lte=today + timedelta(days=90),
                date_peremption__gte=today,
            ).count()},
        ]

        alertes_recentes = list(
            Alerte.objects.filter(destinataire=user, est_lue=False)
            .order_by('-date_creation')[:5]
            .values('id', 'type_alerte', 'niveau_urgence', 'message', 'date_creation',
                    'destinataire__nom', 'destinataire__prenom')
        )
        # Ajouter destinataire_nom
        for a in alertes_recentes:
            a['destinataire_nom'] = f"{a.pop('destinataire__prenom', '')} {a.pop('destinataire__nom', '')}".strip() or 'Système'

        return Response({
            'kpis': {
                'total_medicaments':  total_medicaments,
                'ruptures_stock':     ruptures,
                'stock_faible':       stock_faible,
                'lots_expirant_30j':  lots_expirant_30j,
                'commandes_en_cours': commandes_en_cours,
                'valeur_stock':       float(valeur_stock),
                'alertes_actives':    alertes_actives,
            },
            'graphiques': {
                'mouvements_6_mois':    mouvements_data,
                'valeur_par_categorie': valeur_par_categorie,
                'analyse_alertes':      analyse_alertes,
            },
            'alertes_recentes': alertes_recentes,
        })


class InventaireViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def create(self, request):
        """POST /inventaires/ — initier"""
        if request.user.role != 'ADMINISTRATEUR':
            return Response({'error': 'Admin uniquement.'}, status=403)

        en_cours = Inventaire.objects.filter(statut=Inventaire.Statut.EN_COURS).first()
        if en_cours:
            return Response({
                'error': f'Un inventaire est déjà en cours (#{en_cours.id}). Clôturez-le avant d\'en initier un nouveau.',
            }, status=400)

        inventaire = Inventaire.objects.create(
            date_debut=timezone.now(),
            statut=Inventaire.Statut.EN_COURS,
            initie_par=request.user,
        )
        return Response({
            'id':         inventaire.id,
            'date_debut': inventaire.date_debut,
            'statut':     inventaire.statut,
            'message':    'Inventaire initié avec succès.',
        }, status=201)

    def list(self, request):
        """GET /inventaires/ — liste"""
        inventaires = Inventaire.objects.all().select_related('initie_par')
        return Response([{
            'id':             inv.id,
            'date_debut':     inv.date_debut,
            'date_fin':       inv.date_fin,
            'statut':         inv.statut,
            'statut_display': inv.get_statut_display(),
            'initie_par':     inv.initie_par.nom if inv.initie_par else '—',
        } for inv in inventaires])

    def retrieve(self, request, pk=None):
        """GET /inventaires/{id}/ — retourne les lignes sauvegardées si disponibles"""
        try:
            inv = Inventaire.objects.get(pk=pk)
        except Inventaire.DoesNotExist:
            return Response({'error': 'Inventaire introuvable.'}, status=404)

        from cliniqueApp.medicaments.models import Medicament
        from .models import LigneInventaire

        # Si l'inventaire a des lignes sauvegardées → les utiliser
        lignes_bdd = LigneInventaire.objects.filter(
            inventaire=inv
        ).select_related('medicament').order_by('medicament__nom_commercial')

        if lignes_bdd.exists():
            lignes = [{
                'medicament_id':      l.medicament.id,
                'medicament_nom':     l.medicament.nom_commercial,
                'dci':                l.medicament.dci,
                'quantite_theorique': l.quantite_theorique,
                'quantite_physique':  l.quantite_physique,
                'ecart':              l.ecart,
                'justification':      l.justification,
            } for l in lignes_bdd]
        else:
            # Inventaire en cours sans saisie → stock actuel
            lignes = []
            for med in Medicament.objects.filter(est_actif=True).order_by('nom_commercial'):
                stock = LotStock.objects.filter(
                    medicament=med, statut='DISPONIBLE'
                ).aggregate(total=Sum('quantite_disponible'))['total'] or 0
                lignes.append({
                    'medicament_id':      med.id,
                    'medicament_nom':     med.nom_commercial,
                    'dci':                med.dci,
                    'quantite_theorique': stock,
                    'quantite_physique':  None,
                    'ecart':              None,
                    'justification':      '',
                })

        return Response({
            'id':         inv.id,
            'date_debut': inv.date_debut,
            'date_fin':   inv.date_fin,
            'statut':     inv.statut,
            'initie_par': inv.initie_par.nom if inv.initie_par else '—',
            'lignes':     lignes,
        })

    @action(detail=True, methods=['post'], url_path='lignes')
    def saisir_lignes(self, request, pk=None):
        """POST /inventaires/{id}/lignes/ — sauvegarder en BDD"""
        try:
            inv = Inventaire.objects.get(pk=pk, statut='EN_COURS')
        except Inventaire.DoesNotExist:
            return Response({'error': 'Inventaire en cours introuvable.'}, status=404)

        from cliniqueApp.medicaments.models import Medicament
        from .models import LigneInventaire
        resultats = []

        for ligne in request.data.get('lignes', []):
            try:
                med = Medicament.objects.get(pk=ligne.get('medicament_id'))
            except Medicament.DoesNotExist:
                continue

            qte_physique  = int(ligne.get('quantite_physique', 0))
            justification = ligne.get('justification', '')
            qte_theorique = LotStock.objects.filter(
                medicament=med, statut='DISPONIBLE'
            ).aggregate(total=Sum('quantite_disponible'))['total'] or 0
            ecart = qte_physique - qte_theorique

            if ecart != 0 and not justification:
                return Response({
                    'error': f'Justification obligatoire pour {med.nom_commercial} (écart : {ecart}).'
                }, status=400)

            # Persister en BDD
            LigneInventaire.objects.update_or_create(
                inventaire=inv,
                medicament=med,
                defaults={
                    'quantite_theorique': qte_theorique,
                    'quantite_physique':  qte_physique,
                    'ecart':              ecart,
                    'justification':      justification,
                }
            )

            resultats.append({
                'medicament_id':      med.id,
                'medicament_nom':     med.nom_commercial,
                'quantite_theorique': qte_theorique,
                'quantite_physique':  qte_physique,
                'ecart':              ecart,
                'justification':      justification,
            })
        return Response({'lignes': resultats, 'inventaire_id': inv.id})

    @action(detail=True, methods=['get'], url_path='ecarts')
    def ecarts(self, request, pk=None):
        return self.retrieve(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='valider')
    def valider(self, request, pk=None):
        """POST /inventaires/{id}/valider/"""
        try:
            # ✅ Ne pas filtrer par statut ici — on vérifie après
            inv = Inventaire.objects.get(pk=pk)
        except Inventaire.DoesNotExist:
            return Response({'error': 'Inventaire introuvable.'}, status=404)

        if request.user.role != 'ADMINISTRATEUR':
            return Response({'error': 'Admin uniquement.'}, status=403)

        if inv.statut == 'CLOTURE':
            return Response({'error': 'Cet inventaire est déjà clôturé.'}, status=400)

        ajustements = []

        try:
            with transaction.atomic():
                lignes_data = request.data.get('lignes', [])

                for ligne in lignes_data:
                    ecart = ligne.get('ecart', 0)
                    if ecart is None or int(ecart) == 0:
                        continue

                    med_id = ligne.get('medicament_id')
                    if not med_id:
                        continue

                    try:
                        from cliniqueApp.medicaments.models import Medicament
                        med = Medicament.objects.get(pk=int(med_id))
                    except Medicament.DoesNotExist:
                        continue

                    # Chercher le premier lot disponible
                    lot = LotStock.objects.filter(
                        medicament=med,
                    ).order_by('-quantite_disponible').first()

                    if not lot:
                        # Créer un lot fictif si aucun n'existe
                        continue

                    ancienne_qte = lot.quantite_disponible
                    nouvelle_qte = max(0, ancienne_qte + int(ecart))
                    lot.quantite_disponible = nouvelle_qte

                    if lot.quantite_disponible == 0:
                        lot.statut = 'EPUISE'
                    elif lot.statut == 'EPUISE' and lot.quantite_disponible > 0:
                        lot.statut = 'DISPONIBLE'
                    lot.save()

                    # Journal d'audit — try/except pour ne pas bloquer
                    try:
                        from cliniqueApp.rapports.models import JournalAudit
                        JournalAudit.objects.create(
                            action='AJUSTEMENT_INVENTAIRE',
                            entite_concernee=f'Médicament : {med.nom_commercial}',
                            ancienne_valeur={'quantite': ancienne_qte},
                            nouvelle_valeur={
                                'quantite':      nouvelle_qte,
                                'justification': ligne.get('justification', ''),
                                'inventaire_id': inv.id,
                            },
                            utilisateur=request.user,
                            adresse_ip=request.META.get('REMOTE_ADDR'),
                        )
                    except Exception as e:
                        print(f'[JOURNAL AUDIT] Erreur non bloquante : {e}')

                    ajustements.append({
                        'medicament':    med.nom_commercial,
                        'ancienne_qte':  ancienne_qte,
                        'nouvelle_qte':  nouvelle_qte,
                        'ecart':         int(ecart),
                        'justification': ligne.get('justification', ''),
                    })

                # ✅ Clôturer l'inventaire
                inv.statut   = 'CLOTURE'
                inv.date_fin = timezone.now()
                inv.save()

        except Exception as e:
            import traceback
            print(f'[INVENTAIRE VALIDER] Erreur : {e}')
            traceback.print_exc()
            return Response(
                {'error': f'Erreur lors de la validation : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message':     f'Inventaire #{inv.id} validé et clôturé avec succès.',
            'ajustements': ajustements,
            'date_fin':    inv.date_fin,
        })
        
    @action(detail=True, methods=['delete'], url_path='supprimer')
    def supprimer(self, request, pk=None):
        """DELETE /inventaires/{id}/supprimer/"""
        if request.user.role != 'ADMINISTRATEUR':
            return Response({'error': 'Admin uniquement.'}, status=403)
        try:
            inv = Inventaire.objects.get(pk=pk)
        except Inventaire.DoesNotExist:
            return Response({'error': 'Inventaire introuvable.'}, status=404)

        if inv.statut == 'CLOTURE':
            # Vérifier délai 3 jours
            if inv.date_fin:
                diff = (timezone.now() - inv.date_fin).days
                if diff > 3:
                    return Response({'error': 'Impossible de supprimer un inventaire clôturé depuis plus de 3 jours.'}, status=403)

        inv.delete()
        return Response({'message': f'Inventaire #{pk} supprimé.'})