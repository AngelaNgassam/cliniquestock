import api from './authService';

export interface Fournisseur {
  id: number;
  nom_societe: string;
  contact: string;
  email: string;
  adresse: string;
  est_actif: boolean;
  total_commandes: number;
  volume_affaires: number;
}

export interface FournisseurPayload {
  nom_societe: string;
  contact: string;
  email: string;
  adresse: string;
}

export interface CommandeResumee {
  id: number;
  reference: string;
  date_creation: string;
  statut: string;
  montant_total: string;
}

export interface Historique {
  fournisseur: string;
  total_commandes: number;
  volume_affaires: number;
  commandes: CommandeResumee[];
}

const fournisseurService = {
  getAll: ()                          => api.get<Fournisseur[]>('/fournisseurs/'),
  getById: (id: number)               => api.get<Fournisseur>(`/fournisseurs/${id}/`),
  create: (data: FournisseurPayload)  => api.post<Fournisseur>('/fournisseurs/', data),
  update: (id: number, data: FournisseurPayload) =>
                                         api.patch<Fournisseur>(`/fournisseurs/${id}/`, data),
  toggleStatut: (id: number)          => api.patch(`/fournisseurs/${id}/toggle_statut/`),
  getHistorique: (id: number)         => api.get<Historique>(`/fournisseurs/${id}/historique/`),
};

export default fournisseurService;