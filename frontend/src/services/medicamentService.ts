import api from './authService';

export interface Categorie {
  id: number;
  nom: string;
  description?: string;
}

export interface MedicamentPayload {
  nom_commercial: string;
  dci: string;
  forme_galenique: string;
  dosage: string;
  unite_stock: string;
  prix_unitaire: string;
  seuil_alerte: number;
  conditions_stockage: string;
  indications_therapeutiques: string;
  code_barres: string;
  est_actif: boolean;
  categorie: number;
}

export const medicamentService = {
  getCategories: async (): Promise<Categorie[]> => {
  const res = await api.get('/medicaments/categories/');  // ← ajouter medicaments/
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data.results)) return res.data.results;
  return [];
},

  create: (data: MedicamentPayload) =>
    api.post('/medicaments/', data),

  update: (id: number, data: Partial<MedicamentPayload>) =>
    api.put(`/medicaments/${id}/`, data),

  getById: (id: number) =>
    api.get(`/medicaments/${id}/`),

  checkDoublon: (code: string) =>
    api.get(`/medicaments/?search=${code}`),

  // Ajouter cette ligne dans l'objet medicamentService
  getAll: (params?: string) => api.get(`/medicaments/${params ? '?' + params : ''}`),
};