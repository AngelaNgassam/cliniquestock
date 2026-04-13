from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from cliniqueApp.users.permissions import EstAdminOuPharmacien
from .models import JournalAudit, Signature


class JournalAuditViewSet(viewsets.ViewSet):
    permission_classes = [EstAdminOuPharmacien]

    def list(self, request):
        qs = JournalAudit.objects.select_related('utilisateur').order_by('-date_action')

        date_debut   = request.query_params.get('date_debut')
        date_fin     = request.query_params.get('date_fin')
        jour_semaine = request.query_params.get('jour_semaine')
        mois         = request.query_params.get('mois')
        annee        = request.query_params.get('annee')
        action_type  = request.query_params.get('action')

        if date_debut:   qs = qs.filter(date_action__date__gte=date_debut)
        if date_fin:     qs = qs.filter(date_action__date__lte=date_fin)
        if jour_semaine: qs = qs.filter(date_action__iso_week_day=int(jour_semaine))
        if mois:         qs = qs.filter(date_action__month=int(mois))
        if annee:        qs = qs.filter(date_action__year=int(annee))
        if action_type:  qs = qs.filter(action__icontains=action_type)

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
            'adresse_ip': j.adresse_ip or '—',
        } for j in qs[:1000]])


class SignatureView(APIView):
    permission_classes = [EstAdminOuPharmacien]

    def get(self, request):
        """GET /api/v1/signature/ — récupérer la signature actuelle"""
        sig = Signature.objects.first()
        if not sig:
            return Response({'exists': False})
        return Response({
            'exists':   True,
            'id':       sig.id,
            'nom':      sig.nom,
            'fonction': sig.fonction,
            'image_b64': sig.image_b64,
            'created_at': sig.created_at,
        })

    def post(self, request):
        """POST /api/v1/signature/ — enregistrer ou mettre à jour"""
        nom       = request.data.get('nom', '')
        fonction  = request.data.get('fonction', '')
        image_b64 = request.data.get('image', '')

        if not nom or not image_b64:
            return Response({'error': 'nom et image sont requis.'}, status=400)

        # Convertir base64 → fichier image
        import base64, uuid
        from django.core.files.base import ContentFile

        try:
            # Nettoyer le préfixe data:image/png;base64,...
            if ',' in image_b64:
                header, data = image_b64.split(',', 1)
            else:
                data = image_b64

            image_data = base64.b64decode(data)
            filename   = f'signature_{uuid.uuid4().hex}.png'
            image_file = ContentFile(image_data, name=filename)
        except Exception as e:
            return Response({'error': f'Image invalide : {e}'}, status=400)

        # Créer ou mettre à jour (une seule signature par système)
        sig = Signature.objects.first()
        if sig:
            sig.nom       = nom
            sig.fonction  = fonction
            sig.image_b64 = image_b64
            sig.image.save(filename, image_file, save=False)
            sig.save()
        else:
            sig = Signature(nom=nom, fonction=fonction, image_b64=image_b64)
            sig.image.save(filename, image_file, save=False)
            sig.save()

        # Journal
        try:
            JournalAudit.objects.create(
                action='MISE_A_JOUR_SIGNATURE',
                entite_concernee=f'Signature : {nom}',
                nouvelle_valeur={'nom': nom, 'fonction': fonction},
                utilisateur=request.user,
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass

        return Response({
            'message':   'Signature enregistrée avec succès.',
            'id':        sig.id,
            'nom':       sig.nom,
            'fonction':  sig.fonction,
            'image_b64': sig.image_b64,
        })