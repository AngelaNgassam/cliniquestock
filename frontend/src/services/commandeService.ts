import api from './authService';

export type StatutCommande =
  | 'BROUILLON' | 'EN_ATTENTE' | 'PARTIELLE' | 'LIVREE' | 'ANNULEE';

// ✅ Nouvelle interface — prix_achat_fournisseur remplace prix_unitaire_estime
export interface LigneCommande {
  id?:                    number;
  medicament:             number;
  medicament_nom?:        string;
  quantite_commandee:     number;
  quantite_recue?:        number;
  prix_achat_fournisseur: string;   // ✅ Prix négocié avec le fournisseur
  prix_vente_patient?:    string;   // ✅ Prix de vente au patient (lecture seule)
  total_ligne?:           number;
}

export interface Commande {
  id:                    number;
  reference:             string;
  date_creation:         string;
  date_livraison_prevue: string | null;
  statut:                StatutCommande;
  montant_total:         string;
  fournisseur:           number;
  fournisseur_nom:       string;
  cree_par:              number;
  cree_par_nom:          string;
  lignes:                LigneCommande[];
  modifiable:            boolean;
}

// ✅ Payload création — prix_achat_fournisseur remplace prix_unitaire_estime
export interface LigneCommandePayload {
  medicament:             number;
  quantite_commandee:     number;
  prix_achat_fournisseur: string;   // ✅ Renommé — prix négocié manuellement
}

export interface CommandePayload {
  fournisseur:            number;
  date_livraison_prevue?: string;
  lignes:                 LigneCommandePayload[];
}

const commandeService = {
  getAll:    ()                              => api.get<{ results: Commande[]; count: number }>('/commandes/'),
  getById:   (id: number)                   => api.get<Commande>(`/commandes/${id}/`),
  create:    (data: CommandePayload)         => api.post<Commande>('/commandes/', data),
  update:    (id: number, data: CommandePayload) => api.put<Commande>(`/commandes/${id}/`, data),
  envoyer:   (id: number)                   => api.patch(`/commandes/${id}/envoyer/`),
  annuler:   (id: number)                   => api.patch(`/commandes/${id}/annuler/`),
  cloture:   (id: number)                   => api.patch(`/commandes/${id}/cloture/`),
  supprimer: (id: number)                   => api.delete(`/commandes/${id}/`),
  supprimerPlusieurs: (ids: number[])       =>
    api.delete('/commandes/supprimer_plusieurs/', { data: { ids } }),
};

export default commandeService;