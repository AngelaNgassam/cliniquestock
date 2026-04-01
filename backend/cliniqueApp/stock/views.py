from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F

from cliniqueApp.users.permissions import EstAdmin, EstAdminOuPharmacien
from .models import Reception, LotStock, MouvementStock
from .serializers import ReceptionSerializer


class ReceptionViewSet(viewsets.ModelViewSet):
    serializer_class = ReceptionSerializer

    def get_queryset(self):
        return Reception.objects.all()\
            .prefetch_related('lignes', 'lignes__anomalies')\
            .select_related('enregistre_par', 'commande')\
            .order_by('-date_reception')

    def get_permissions(self):
        return [EstAdminOuPharmacien()]

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'La suppression d\'une réception n\'est pas autorisée.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


class StockViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    # ── GET /stock/ — vue globale ─────────────────────────────────────────────
    def list(self, request):
        from cliniqueApp.medicaments.models import Medicament
        medicaments = Medicament.objects.filter(est_actif=True)

        stock_data = []
        for med in medicaments:
            lots = med.lots.filter(statut=LotStock.Statut.DISPONIBLE)
            quantite_totale = lots.aggregate(
                total=Sum('quantite_disponible')
            )['total'] or 0
            valeur = lots.aggregate(
                val=Sum(F('quantite_disponible') * F('prix_achat'))
            )['val'] or 0

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

    # ── GET /stock/{medicament_id}/ — détail par médicament ──────────────────
    def retrieve(self, request, pk=None):
        from cliniqueApp.medicaments.models import Medicament
        from django.utils import timezone

        try:
            med = Medicament.objects.get(pk=pk)
        except Medicament.DoesNotExist:
            return Response({'error': 'Médicament introuvable.'}, status=404)

        lots = med.lots.all().order_by('date_peremption')
        lots_data = []
        for lot in lots:
            lots_data.append({
                'id':                  lot.id,
                'numero_lot':          lot.numero_lot,
                'date_peremption':     lot.date_peremption,
                'quantite_disponible': lot.quantite_disponible,
                'prix_achat':          float(lot.prix_achat),
                'statut':              lot.statut,
                'expire':              lot.date_peremption < timezone.now().date(),
                'proche_peremption':   (lot.date_peremption - timezone.now().date()).days <= 90,
            })

        return Response({
            'medicament_id':  med.id,
            'nom_commercial': med.nom_commercial,
            'dci':            med.dci,
            'lots':           lots_data,
        })


class MouvementViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    # ── GET /mouvements/ — historique filtrable ───────────────────────────────
    def list(self, request):
        qs = MouvementStock.objects.select_related(
            'lot__medicament', 'operateur'
        ).order_by('-date_operation')

        # Filtres optionnels
        type_mvt    = request.query_params.get('type')
        medicament  = request.query_params.get('medicament_id')
        date_debut  = request.query_params.get('date_debut')
        date_fin    = request.query_params.get('date_fin')

        if type_mvt:
            qs = qs.filter(type_mouvement=type_mvt)
        if medicament:
            qs = qs.filter(lot__medicament_id=medicament)
        if date_debut:
            qs = qs.filter(date_operation__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_operation__date__lte=date_fin)

        data = [{
            'id':              m.id,
            'type_mouvement':  m.type_mouvement,
            'motif':           m.type_motif,
            'quantite':        m.quantite,
            'date_operation':  m.date_operation,
            'operateur':       m.operateur.nom,
            'medicament':      m.lot.medicament.nom_commercial,
            'numero_lot':      m.lot.numero_lot,
            'numero_ordre':    m.numero_ordre,
            'patient_nom':     m.patient_nom,
            'prescripteur':    m.prescripteur,
        } for m in qs[:200]]  # limite à 200

        return Response(data)