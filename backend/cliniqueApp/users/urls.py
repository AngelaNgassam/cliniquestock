from django.urls import path
from .views import (
    LoginView, LogoutView, RefreshView, MeView, RegisterView,
    AdminOnlyView, PharmacienOnlyView, AdminOuPharmacienView,
    UtilisateurListView, UtilisateurDetailView, ToggleStatutView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(),     name='auth_register'),
    path('login/',    LoginView.as_view(),         name='auth_login'),
    path('logout/',   LogoutView.as_view(),        name='auth_logout'),
    path('refresh/',  RefreshView.as_view(),       name='auth_refresh'),
    path('me/',       MeView.as_view(),            name='auth_me'),

    # Gestion utilisateurs (Admin)
    path('utilisateurs/',          UtilisateurListView.as_view(),   name='utilisateurs_list'),
    path('utilisateurs/<int:pk>/', UtilisateurDetailView.as_view(), name='utilisateurs_detail'),
    path('utilisateurs/<int:pk>/toggle/', ToggleStatutView.as_view(), name='utilisateurs_toggle'),

    # Tests RBAC
    path('test/admin/',      AdminOnlyView.as_view(),         name='test_admin'),
    path('test/pharmacien/', PharmacienOnlyView.as_view(),    name='test_pharmacien'),
    path('test/both/',       AdminOuPharmacienView.as_view(), name='test_both'),
]