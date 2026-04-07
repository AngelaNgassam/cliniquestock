import api from './authService';

export type TypeAlerte   = 'STOCK_BAS' | 'PEREMPTION' | 'ANOMALIE' | 'SYSTEME';
export type NiveauAlerte = 'BAS' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export interface Alerte {
  id: number;
  type_alerte:      TypeAlerte;
  niveau_urgence:   NiveauAlerte;
  message:          string;
  date_creation:    string;
  est_lue:          boolean;
  destinataire:     number;
  destinataire_nom: string;
  medicament_id?:   number;
  medicament_nom?:  string;
}

export interface SeuilConfig {
  seuil_stock_global:        number;
  seuil_critique:            number;
  seuil_peremption_warning:  number;
  seuil_peremption_critique: number;
}

const alerteService = {
  getAll:        (params?: string) => api.get<{ results: Alerte[]; count: number }>(
                   `/alertes/${params ? '?' + params : ''}`
                 ),
  getNonLues:    ()               => api.get<{ count: number }>('/alertes/non_lues_count/'),
  resolve:       (id: number)     => api.patch(`/alertes/${id}/resolve/`),
  verifier:      (id: number)     => api.get(`/alertes/${id}/verifier/`),
  markAllRead:   ()               => api.post('/alertes/mark_all_read/'),
  nettoyer:      ()               => api.delete('/alertes/nettoyer/'),
  getSeuils:     ()               => api.get<SeuilConfig>('/config/seuils/'),
  saveSeuils:    (data: SeuilConfig) => api.post('/config/seuils/', data),
};

export default alerteService;