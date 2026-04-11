import api from './authService';

export interface Utilisateur {
  id:                number;
  nom:               string;
  prenom:            string;
  email:             string;
  role:              'ADMINISTRATEUR' | 'PHARMACIEN';
  est_actif:         boolean;
  date_creation:     string;
  dernier_connexion: string | null;
}

export interface UtilisateurPayload {
  nom:      string;
  prenom:   string;
  email:    string;
  role:     string;
  password?: string;
  est_actif?: boolean;
}

export interface Stats {
  total:       number;
  admins:      number;
  pharmaciens: number;
  actifs:      number;
}

const utilisateurService = {
  getAll:        (params?: string) => api.get<{ utilisateurs: Utilisateur[]; stats: Stats }>(
                   `/auth/utilisateurs/${params ? '?' + params : ''}`
                 ),
  getById:       (id: number)                  => api.get<Utilisateur>(`/auth/utilisateurs/${id}/`),
  create:        (data: UtilisateurPayload)    => api.post('/auth/utilisateurs/', data),
  update:        (id: number, data: Partial<UtilisateurPayload>) =>
                   api.patch(`/auth/utilisateurs/${id}/`, data),
  toggle:        (id: number)                  => api.patch(`/auth/utilisateurs/${id}/toggle/`),
  desactiver:    (id: number)                  => api.delete(`/auth/utilisateurs/${id}/`),
};

export default utilisateurService;