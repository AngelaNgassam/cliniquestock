import api from './authService';

export type StatutCommande =
  | 'BROUILLON' | 'EN_ATTENTE' | 'PARTIELLE' | 'LIVREE' | 'ANNULEE';

export interface LigneCommande {
  id?: number;
  medicament: number;
  medicament_nom?: string;
  quantite_commandee: number;
  quantite_recue?: number;
  prix_unitaire_estime: string;
  total_ligne?: number;
}

export interface Commande {
  id: number;
  reference: string;
  date_creation: string;
  date_livraison_prevue: string | null;
  statut: StatutCommande;
  montant_total: string;
  fournisseur: number;
  fournisseur_nom: string;
  cree_par: number;
  cree_par_nom: string;
  lignes: LigneCommande[];
  modifiable: boolean;
}

export interface CommandePayload {
  fournisseur: number;
  date_livraison_prevue?: string;
  statut?: StatutCommande;
  lignes: {
    medicament: number;
    quantite_commandee: number;
    prix_unitaire_estime: string;
  }[];
}

const commandeService = {
  getAll:       ()                         => api.get<{ results: Commande[]; count: number }>('/commandes/'),
  getById:      (id: number)               => api.get<Commande>(`/commandes/${id}/`),
  create:       (data: CommandePayload)    => api.post<Commande>('/commandes/', data),
  update:       (id: number, data: CommandePayload) => api.put<Commande>(`/commandes/${id}/`, data),
  envoyer:      (id: number)               => api.patch(`/commandes/${id}/envoyer/`),
  annuler:      (id: number)               => api.patch(`/commandes/${id}/annuler/`),
  cloture:      (id: number)               => api.patch(`/commandes/${id}/cloture/`),
  supprimer:    (id: number)               => api.delete(`/commandes/${id}/`),
};

export default commandeService;