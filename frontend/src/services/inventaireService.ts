import api from './authService';

export interface LigneInventaire {
  medicament_id:      number;
  medicament_nom:     string;
  dci:                string;
  quantite_theorique: number;
  quantite_physique:  number | null;
  ecart:              number | null;
  justification:      string;
}

export interface InventaireSession {
  id:         number;
  date_debut: string;
  date_fin:   string | null;
  statut:     'PLANIFIE' | 'EN_COURS' | 'CLOTURE';
  initie_par: string;
  lignes?:    LigneInventaire[];
}

const inventaireService = {
  initier:        ()                             => api.post('/inventaires/'),
  getAll:         ()                             => api.get('/inventaires/'),
  getById:        (id: number)                   => api.get(`/inventaires/${id}/`),
  saisirLignes:   (id: number, lignes: any[])    => api.post(`/inventaires/${id}/lignes/`, { lignes }),
  getEcarts:      (id: number)                   => api.get(`/inventaires/${id}/ecarts/`),
  valider:        (id: number, lignes: any[])    => api.post(`/inventaires/${id}/valider/`, { lignes }),
  supprimer:      (id: number)                   => api.delete(`/inventaires/${id}/supprimer/`),
};


export default inventaireService;