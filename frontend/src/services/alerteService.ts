import api from './authService';

export type TypeAlerte  = 'STOCK_BAS' | 'PEREMPTION' | 'ANOMALIE' | 'SYSTEME';
export type NiveauAlerte = 'BAS' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export interface Alerte {
  id: number;
  type_alerte:     TypeAlerte;
  niveau_urgence:  NiveauAlerte;
  message:         string;
  date_creation:   string;
  est_lue:         boolean;
  destinataire:    number;
  destinataire_nom: string;
}

const alerteService = {
  getAll:       (params?: string) => api.get<{ results: Alerte[]; count: number }>(
                  `/alertes/${params ? '?' + params : ''}`
                ),
  getNonLues:   ()                => api.get<{ count: number }>('/alertes/non_lues_count/'),
  resolve:      (id: number)      => api.patch(`/alertes/${id}/resolve/`),
  markAllRead:  ()                => api.post('/alertes/mark_all_read/'),
};

export default alerteService;