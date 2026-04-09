import api from './authService';

export interface KPIs {
  total_medicaments:  number;
  ruptures_stock:     number;
  stock_faible:       number;
  lots_expirant_30j:  number;
  commandes_en_cours: number;
  valeur_stock:       number;
  alertes_actives:    number;
}

export interface DashboardData {
  kpis: KPIs;
  graphiques: {
    mouvements_6_mois:    { mois: string; entrees: number; sorties: number }[];
    valeur_par_categorie: { categorie: string; valeur: number }[];
    analyse_alertes:      { type: string; count: number }[];
  };
  alertes_recentes: {
      destinataire_nom: string;
    id: number; type_alerte: string; niveau_urgence: string;
    message: string; date_creation: string;
  }[];
}

const dashboardService = {
  getData: () => api.get<DashboardData>('/dashboard/'),
};

export default dashboardService;