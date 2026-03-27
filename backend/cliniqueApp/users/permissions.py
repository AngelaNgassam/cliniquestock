from rest_framework.permissions import BasePermission


class EstAdmin(BasePermission):
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMINISTRATEUR"
        )


class EstPharmacien(BasePermission):
    message = "Accès réservé aux pharmaciens."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "PHARMACIEN"
        )


class EstAdminOuPharmacien(BasePermission):
    message = "Accès réservé aux utilisateurs autorisés."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMINISTRATEUR", "PHARMACIEN")
        )