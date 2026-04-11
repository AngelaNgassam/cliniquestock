from rest_framework import viewsets
from rest_framework.response import Response
from cliniqueApp.users.permissions import EstAdminOuPharmacien
from .models import JournalAudit


class JournalAuditViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def list(self, request):
        qs = JournalAudit.objects.select_related('utilisateur').order_by('-date_action')

        # ── Filtres ───────────────────────────────────────────────────────────
        date_debut   = request.query_params.get('date_debut')
        date_fin     = request.query_params.get('date_fin')
        jour_semaine = request.query_params.get('jour_semaine')
        mois         = request.query_params.get('mois')
        annee        = request.query_params.get('annee')
        action_type  = request.query_params.get('action')

        if date_debut:
            qs = qs.filter(date_action__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_action__date__lte=date_fin)
        if jour_semaine:
            qs = qs.filter(date_action__iso_week_day=int(jour_semaine))
        if mois:
            qs = qs.filter(date_action__month=int(mois))
        if annee:
            qs = qs.filter(date_action__year=int(annee))
        if action_type:
            qs = qs.filter(action__icontains=action_type)

        return Response([{
            'id':               j.id,
            'action':           j.action,
            'entite_concernee': j.entite_concernee,
            'ancienne_valeur':  j.ancienne_valeur,
            'nouvelle_valeur':  j.nouvelle_valeur,
            'date_action':      j.date_action,
            'utilisateur_nom':  (
                f"{j.utilisateur.prenom} {j.utilisateur.nom}"
                if j.utilisateur else 'Système'
            ),
            'adresse_ip':       j.adresse_ip or '—',
        } for j in qs[:1000]])