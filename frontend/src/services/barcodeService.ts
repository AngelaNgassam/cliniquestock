// frontend/src/services/barcodeService.ts

export interface MedicamentInfo {
  nom_commercial?: string;
  dci?: string;
  forme_galenique?: string;
  conditions_stockage?: string;
  indications_therapeutiques?: string;
  code_barres: string;
  source?: 'catalogue' | 'rxnorm' | 'inconnu';
}

const API = import.meta.env.VITE_API_URL;

export async function fetchMedicamentByBarcode(
  code: string,
  token: string
): Promise<MedicamentInfo> {

  // ── Étape 1 : chercher dans le catalogue CliniqueStock ─────────────────────
  try {
    const res = await fetch(
      `${API}/medicaments/?search=${code}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const results = data.results ?? data;

    if (Array.isArray(results) && results.length > 0) {
      const m = results[0];
      return {
        nom_commercial:             m.nom_commercial,
        dci:                        m.dci,
        forme_galenique:            m.forme_galenique,
        conditions_stockage:        m.conditions_stockage,
        indications_therapeutiques: m.indications_therapeutiques,
        code_barres:                code,
        source:                     'catalogue',
      };
    }
  } catch (_) {}

  // ── Étape 2 : essayer RxNorm (DCI universelle) ─────────────────────────────
  // Utile pour Paracétamol, Amoxicilline, Ibuprofène... noms génériques
  try {
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${code}`
    );
    const data = await res.json();
    const drug = data.drugGroup?.conceptGroup?.[0]?.conceptProperties?.[0];
    if (drug) {
      return {
        nom_commercial: drug.name,
        dci:            drug.synonym || drug.name,
        code_barres:    code,
        source:         'rxnorm',
      };
    }
  } catch (_) {}

  // ── Étape 3 : rien trouvé, juste le code ──────────────────────────────────
  return { code_barres: code, source: 'inconnu' };
}