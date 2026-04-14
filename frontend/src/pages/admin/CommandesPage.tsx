import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Divider, Collapse, Badge,
} from '@mui/material';
import {
  Add, Send, Cancel, Lock, ExpandMore, ExpandLess,
  Refresh, ShoppingCart, LocalShipping, CheckCircle,
  History, WarningAmber, Lightbulb, PictureAsPdf,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import commandeService from '../../services/commandeService';
import type { Commande, StatutCommande } from '../../services/commandeService';
import fournisseurService from '../../services/fournisseurService';
import { medicamentService } from '../../services/medicamentService';
import api from '../../services/authService';

// ── Statuts ───────────────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<StatutCommande, {
  label: string; bg: string; color: string; border: string;
}> = {
  BROUILLON:  { label: 'Brouillon',  bg: '#F5F5F5', color: '#607D8B', border: '#CFD8DC' },
  EN_ATTENTE: { label: 'En attente', bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
  PARTIELLE:  { label: 'Partielle',  bg: '#FFF8E1', color: '#E65100', border: '#FFB300' },
  LIVREE:     { label: 'Livrée',     bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' },
  ANNULEE:    { label: 'Annulée',    bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
};

const TYPES_ANOMALIE: Record<string, string> = {
  PRODUIT_NON_CONFORME:    'Produit non conforme',
  MEDICAMENT_ENDOMMAGE:    'Médicament endommagé',
  PEREMPTION_INSUFFISANTE: 'Péremption insuffisante (< 6 mois)',
  QUANTITE_MANQUANTE:      'Quantité manquante',
};

// ── Signature ─────────────────────────────────────────────────────────────────
async function chargerSignature(): Promise<{
  nom: string; fonction: string; image_b64: string;
} | null> {
  try {
    const res  = await api.get('/signature/');
    const data = res.data as any;
    return data.exists ? data : null;
  } catch {
    return null;
  }
}

async function ajouterSignaturePDF(
  doc: any,
  sig: { nom: string; fonction: string; image_b64: string } | null,
  W: number, H: number,
) {
  if (!sig?.image_b64) return;
  const C_BLEU: [number,number,number] = [13, 71, 161];
  const C_GRIS: [number,number,number] = [96, 96, 96];
  const sigX = W - 75;
  const sigY = H - 42;
  doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.3);
  doc.rect(sigX - 4, sigY - 2, 70, 28, 'S');
  try { doc.addImage(sig.image_b64, 'PNG', sigX, sigY, 62, 14); } catch { /* ignore */ }
  doc.setLineWidth(0.5); doc.setDrawColor(...C_GRIS);
  doc.line(sigX, sigY + 16, sigX + 62, sigY + 16);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text(sig.nom, sigX + 31, sigY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C_GRIS);
  doc.text(sig.fonction, sigX + 31, sigY + 24, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

// ── Export PDF commande ───────────────────────────────────────────────────────
async function exporterCommandePDF(commande: Commande) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const C_BLEU : [number,number,number] = [13, 71, 161];
  const C_BLEU2: [number,number,number] = [21, 101, 192];
  const C_GRIS : [number,number,number] = [96, 96, 96];
  const C_VERT : [number,number,number] = [46, 125, 50];

  // ── En-tête ────────────────────────────────────────────────────────────────
  doc.setFillColor(...C_BLEU);
  doc.rect(0, 0, W, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('CliniqueStock', 14, 11);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Bon de Commande', W / 2, 11, { align: 'center' });
  doc.text(`${dateStr} à ${heureStr}`, W - 14, 11, { align: 'right' });

  // ── Titre ──────────────────────────────────────────────────────────────────
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('BON DE COMMANDE', W / 2, 30, { align: 'center' });
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  doc.text(commande.reference, W / 2, 37, { align: 'center' });

  // ── Statut badge ───────────────────────────────────────────────────────────
  const sc = STATUT_CONFIG[commande.statut];
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(sc.color as unknown as string);
  doc.text(`Statut : ${sc.label}`, W / 2, 44, { align: 'center' });

  // ── Info commande ──────────────────────────────────────────────────────────
  let y = 52;
  doc.setFillColor(240, 247, 255);
  doc.roundedRect(14, y, W - 28, 28, 2, 2, 'F');
  doc.setDrawColor(...C_BLEU2); doc.setLineWidth(0.3);
  doc.roundedRect(14, y, W - 28, 28, 2, 2, 'S');

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Informations de la commande', 20, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33); doc.setFontSize(8);

  const infos = [
    ['Référence',         commande.reference],
    ['Fournisseur',       commande.fournisseur_nom || '—'],
    ['Date de création',  new Date(commande.date_creation).toLocaleDateString('fr-FR')],
    ['Livraison prévue',  commande.date_livraison_prevue
      ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'],
    ['Montant total',     `${Number(commande.montant_total).toLocaleString('fr-FR')} FCFA`],
  ];

  infos.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? 20 : W / 2 + 5;
    const row = y + 13 + Math.floor(i / 2) * 7;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
    doc.text(`${label} :`, col, row);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(value, col + 30, row);
  });

  // ── Lignes de commande ─────────────────────────────────────────────────────
  y = 86;
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Détail des articles commandés', 14, y); y += 6;

  const COLS_CMD = [
    { label: 'Médicament',     x: 14, w: 60 },
    { label: 'DCI',            x: 76, w: 30 },
    { label: 'Qté cmdée',      x: 108, w: 18 },
    { label: 'Qté reçue',      x: 128, w: 18 },
    { label: 'Prix unitaire',  x: 148, w: 25 },
    { label: 'Total (FCFA)',   x: 175, w: 25 },
  ];

  // En-tête tableau
  doc.setFillColor(...C_BLEU2);
  doc.rect(12, y - 5, W - 24, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  COLS_CMD.forEach(c => doc.text(c.label, c.x, y));
  doc.setTextColor(0, 0, 0);
  y += 5;

  // Lignes
  const ROW_H = 8;
  commande.lignes.forEach((ligne, idx) => {
    if (y + ROW_H > H - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
    doc.rect(12, y - 5, W - 24, ROW_H, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');

    const truncate = (s: string, max: number) =>
      s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '—');
    const total = ligne.quantite_commandee * Number(ligne.prix_unitaire_estime);
    const qteRecue = ligne.quantite_recue ?? 0;
    const complet  = qteRecue >= ligne.quantite_commandee;

    doc.setTextColor(...C_BLEU); doc.setFont('helvetica', 'bold');
    doc.text(truncate(ligne.medicament_nom || `Med #${ligne.medicament}`, 32), COLS_CMD[0].x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(truncate(ligne.medicament_nom || '—', 18), COLS_CMD[1].x, y);
    doc.text(String(ligne.quantite_commandee), COLS_CMD[2].x, y);
    doc.setTextColor(complet ? 46 : qteRecue > 0 ? 230 : 100,
                     complet ? 125 : qteRecue > 0 ? 81  : 100,
                     complet ? 50  : qteRecue > 0 ? 0   : 100);
    doc.setFont('helvetica', 'bold');
    doc.text(String(qteRecue), COLS_CMD[3].x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(`${Number(ligne.prix_unitaire_estime).toLocaleString('fr-FR')}`, COLS_CMD[4].x, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
    doc.text(`${total.toLocaleString('fr-FR')}`, COLS_CMD[5].x, y);
    y += ROW_H;
  });

  // ── Total ──────────────────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor(232, 240, 255);
  doc.roundedRect(12, y, W - 24, 12, 2, 2, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('MONTANT TOTAL :', 18, y + 8);
  doc.setFontSize(12);
  doc.text(
    `${Number(commande.montant_total).toLocaleString('fr-FR')} FCFA`,
    W - 18, y + 8, { align: 'right' }
  );
  y += 20;

  // ── Pied de page ───────────────────────────────────────────────────────────
  doc.setFillColor(245, 248, 255);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.2);
  doc.line(0, H - 12, W, H - 12);
  doc.setTextColor(...C_GRIS); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('CliniqueStock — Document confidentiel', 14, H - 4);
  doc.text('Page 1 / 1', W / 2, H - 4, { align: 'center' });
  doc.text(dateStr, W - 14, H - 4, { align: 'right' });

  // ── Signature ──────────────────────────────────────────────────────────────
  const sig = await chargerSignature();
  if (sig) {
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    await ajouterSignaturePDF(doc, sig, W, H);
  }

  doc.save(`commande-${commande.reference}-${dateStr.replace(/\//g, '_')}.pdf`);
  toast.success('PDF de la commande exporté !');
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog Réception
// ─────────────────────────────────────────────────────────────────────────────
function ReceptionDialog({
  commande, open, onClose, onDone,
}: { commande: Commande; open: boolean; onClose: () => void; onDone: () => void }) {
  const [loading,       setLoading]       = useState(false);
  const [dateReception, setDateReception] = useState(new Date().toISOString().slice(0, 16));
  const [receptions,    setReceptions]    = useState<any[]>([]);
  const [loadingHist,   setLoadingHist]   = useState(false);
  const [lotsSuggeres,  setLotsSuggeres]  = useState<Record<number, { prochain: string }>>({});
  const [lignes,        setLignes]        = useState<{
    medicament: number; medicament_nom: string;
    quantite_commandee: number; quantite_deja_recue: number;
    quantite_recue: number; numero_lot: string;
    date_peremption: string; prix_achat_reel: string;
    has_anomalie: boolean; type_anomalie: string;
    description_anomalie: string; lot_modifie: boolean;
  }[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoadingHist(true);
    api.get(`/receptions/?commande=${commande.id}`)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data.results ?? [];
        setReceptions(list.filter((rec: any) => rec.commande === commande.id));
      })
      .catch(() => setReceptions([]))
      .finally(() => setLoadingHist(false));

    const buildLignes = async () => {
      let receptionsExistantes: any[] = [];
      try {
        const r = await api.get(`/receptions/?commande=${commande.id}`);
        receptionsExistantes = (Array.isArray(r.data) ? r.data : r.data.results ?? [])
          .filter((rec: any) => rec.commande === commande.id);
      } catch { /* ignore */ }

      const nouvLignes = commande.lignes.map(l => {
        const restant = Math.max(0, l.quantite_commandee - (l.quantite_recue ?? 0));
        let dernNumLot = '', dernDatePerem = '', dernPrixAchat = l.prix_unitaire_estime;
        for (const rec of receptionsExistantes) {
          const lp = (rec.lignes || []).find((rl: any) => rl.medicament === l.medicament);
          if (lp) { dernNumLot = lp.numero_lot || ''; dernDatePerem = lp.date_peremption || ''; dernPrixAchat = lp.prix_achat_reel || l.prix_unitaire_estime; }
        }
        return {
          medicament: l.medicament, medicament_nom: l.medicament_nom || `Médicament #${l.medicament}`,
          quantite_commandee: l.quantite_commandee, quantite_deja_recue: l.quantite_recue ?? 0,
          quantite_recue: restant, numero_lot: dernNumLot, date_peremption: dernDatePerem,
          prix_achat_reel: String(dernPrixAchat), has_anomalie: false, type_anomalie: '',
          description_anomalie: '', lot_modifie: false,
        };
      });
      setLignes(nouvLignes);

      const sugg: Record<number, any> = {};
      for (const l of commande.lignes) {
        try { const r = await api.get(`/receptions/numeros_lot/?medicament_id=${l.medicament}`); sugg[l.medicament] = r.data; } catch { /* ignore */ }
      }
      setLotsSuggeres(sugg);
    };

    buildLignes();
    setDateReception(new Date().toISOString().slice(0, 16));
  }, [open, commande]);

  const updateLigne = (i: number, key: string, value: any) => {
    setLignes(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [key]: value };
      if (key === 'numero_lot') updated.lot_modifie = true;
      if (key === 'quantite_recue') {
        const restant = l.quantite_commandee - l.quantite_deja_recue;
        if (Number(value) < restant && Number(value) > 0 && !l.has_anomalie) {
          updated.has_anomalie = true; updated.type_anomalie = 'QUANTITE_MANQUANTE';
        }
        if (Number(value) === restant) { updated.has_anomalie = false; updated.type_anomalie = ''; }
      }
      if (key === 'date_peremption' && value) {
        const datePerem = new Date(value);
        const dans6Mois = new Date();
        dans6Mois.setMonth(dans6Mois.getMonth() + 6);
        if (datePerem < dans6Mois && datePerem > new Date()) {
          updated.has_anomalie = true; updated.type_anomalie = 'PEREMPTION_INSUFFISANTE';
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    const actives = lignes.filter(l => (l.quantite_commandee - l.quantite_deja_recue) > 0);
    if (actives.some(l => !l.numero_lot || !l.date_peremption)) {
      toast.error('Remplissez le numéro de lot et la date de péremption.'); return;
    }
    setLoading(true);
    try {
      await api.post('/receptions/', {
        commande: commande.id,
        date_reception: new Date(dateReception).toISOString(),
        lignes: actives.map(l => ({
          medicament: l.medicament, quantite_recue: l.quantite_recue,
          numero_lot: l.numero_lot, date_peremption: l.date_peremption,
          prix_achat_reel: l.prix_achat_reel, has_anomalie: l.has_anomalie,
          type_anomalie: l.type_anomalie, description_anomalie: l.description_anomalie,
        })),
      });
      toast.success('✅ Réception enregistrée ! Stock mis à jour.', { duration: 6000 });
      onDone(); onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        JSON.stringify(err.response?.data) ||
        "Erreur lors de l'enregistrement."
      );
    } finally { setLoading(false); }
  };

  const restantTotal = lignes.reduce(
    (sum, l) => sum + Math.max(0, l.quantite_commandee - l.quantite_deja_recue), 0
  );
  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '94vh' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2,
            background: 'linear-gradient(135deg, #43A047, #1B5E20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalShipping sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize={18} color="#1B5E20">
              Enregistrer une réception
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
              <Typography variant="caption" color="text.secondary">
                Commande <strong>{commande.reference}</strong> — {commande.fournisseur_nom}
              </Typography>
              {commande.statut === 'PARTIELLE' && (
                <Chip label="Réception complémentaire" size="small"
                  sx={{ bgcolor: '#FFF8E1', color: '#E65100', fontWeight: 700, fontSize: 10 }} />
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>
      <Divider sx={{ mt: 2 }} />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Historique réceptions précédentes */}
        {commande.statut === 'PARTIELLE' && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <History sx={{ color: '#F57F17', fontSize: 18 }} />
              <Typography fontWeight={700} color="#E65100" fontSize={14}>
                Réceptions précédentes (lecture seule)
              </Typography>
            </Box>
            {loadingHist ? (
              <CircularProgress size={24} />
            ) : receptions.length === 0 ? (
              <Typography fontSize={13} color="text.secondary">Aucune réception précédente.</Typography>
            ) : receptions.map(rec => (
              <Card key={rec.id} elevation={0} sx={{
                border: '1px solid #FFE082', borderRadius: 2, bgcolor: '#FFFDE7', mb: 1.5 }}>
                <Box sx={{ px: 2, py: 1, bgcolor: '#FFF8E1', borderBottom: '1px solid #FFE082',
                  display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700} fontSize={13} color="#E65100">
                    📦 {rec.numero_bon_livraison}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(rec.date_reception)}
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#FFFDE7' }}>
                      {['Médicament', 'Qté reçue', 'N° lot', 'Date péremption', 'Anomalie'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#78909C', py: 0.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rec.lignes || []).map((rl: any, rli: number) => (
                      <TableRow key={rli}>
                        <TableCell sx={{ fontSize: 12 }}>{rl.medicament_nom}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{rl.quantite_recue}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#1565C0' }}>{rl.numero_lot || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {rl.date_peremption ? new Date(rl.date_peremption).toLocaleDateString('fr-FR') : '—'}
                        </TableCell>
                        <TableCell>
                          {rl.has_anomalie
                            ? <Chip label={TYPES_ANOMALIE[rl.anomalies?.[0]?.type_anomalie] || 'Anomalie'} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: 10 }} />
                            : <Chip label="OK" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontSize: 10 }} />
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
            <Divider sx={{ my: 2.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Add sx={{ color: '#1B5E20', fontSize: 18 }} />
              <Typography fontWeight={700} color="#1B5E20" fontSize={14}>
                Nouvelle réception complémentaire
              </Typography>
            </Box>
          </Box>
        )}

        {/* Date réception */}
        <Box sx={{ mb: 3 }}>
          <TextField label="Date de réception *" type="datetime-local"
            value={dateReception} onChange={e => setDateReception(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small"
            sx={{ width: 290, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Le numéro de bon sera généré automatiquement (format BL-AAAA-NNN)
          </Typography>
        </Box>

        <Typography fontWeight={700} color="#1B5E20" sx={{ mb: 2 }} fontSize={15}>
          Médicaments à réceptionner
        </Typography>

        {lignes.map((ligne, i) => {
          const restant    = ligne.quantite_commandee - ligne.quantite_deja_recue;
          const dejaComplet = restant <= 0;
          const suggestion  = lotsSuggeres[ligne.medicament];

          return (
            <Card key={i} elevation={0} sx={{
              border: dejaComplet ? '1px solid #C8E6C9' : ligne.has_anomalie ? '1.5px solid #FFCDD2' : '1px solid #E0E0E0',
              borderRadius: 2, mb: 2, overflow: 'hidden', opacity: dejaComplet ? 0.65 : 1,
            }}>
              <Box sx={{
                px: 2, py: 1.2,
                bgcolor: dejaComplet ? '#F1F8E9' : ligne.has_anomalie ? '#FFF5F5' : '#FAFAFA',
                borderBottom: '1px solid',
                borderBottomColor: dejaComplet ? '#C8E6C9' : ligne.has_anomalie ? '#FFCDD2' : '#EEEEEE',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Typography fontWeight={700} fontSize={14} color={dejaComplet ? '#2E7D32' : '#212121'}>
                  {dejaComplet && '✓ '}{ligne.medicament_nom}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {ligne.quantite_deja_recue > 0 && (
                    <Chip label={`Déjà reçu : ${ligne.quantite_deja_recue}/${ligne.quantite_commandee}`}
                      size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontSize: 11 }} />
                  )}
                  <Chip label={dejaComplet ? 'Complet' : `Restant : ${restant}`} size="small"
                    sx={{ bgcolor: dejaComplet ? '#C8E6C9' : '#E3F2FD',
                      color: dejaComplet ? '#2E7D32' : '#1565C0', fontWeight: 600, fontSize: 11 }} />
                </Box>
              </Box>

              {dejaComplet ? (
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="#2E7D32">
                    Ce médicament a déjà été entièrement réceptionné.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1.5, mb: 1.5 }}>
                    <TextField label={`Qté reçue * (max: ${restant})`} type="number"
                      value={ligne.quantite_recue}
                      onChange={e => updateLigne(i, 'quantite_recue', Number(e.target.value))}
                      inputProps={{ min: 0, max: restant }} size="small"
                      error={ligne.quantite_recue > restant}
                      helperText={ligne.quantite_recue > restant ? `Maximum : ${restant}` : ''}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />

                    <Box>
                      <TextField label="N° lot *" value={ligne.numero_lot}
                        onChange={e => updateLigne(i, 'numero_lot', e.target.value)}
                        size="small" fullWidth placeholder={suggestion?.prochain || 'ex: LOT-2026A'}
                        helperText={ligne.numero_lot && !ligne.lot_modifie ? '📋 Pré-rempli depuis réception précédente' : ''}
                        FormHelperTextProps={{ sx: { color: '#F57F17', fontSize: 10 } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                      {suggestion?.prochain && (
                        <Tooltip title={`Utiliser : ${suggestion.prochain}`}>
                          <Button size="small" startIcon={<Lightbulb sx={{ fontSize: 14 }} />}
                            onClick={() => updateLigne(i, 'numero_lot', suggestion.prochain)}
                            sx={{ mt: 0.5, py: 0, px: 1, fontSize: 10, textTransform: 'none', color: '#1565C0' }}>
                            Suggéré : {suggestion.prochain}
                          </Button>
                        </Tooltip>
                      )}
                    </Box>

                    <TextField label="Date péremption *" type="date"
                      value={ligne.date_peremption}
                      onChange={e => updateLigne(i, 'date_peremption', e.target.value)}
                      InputLabelProps={{ shrink: true }} size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />

                    <TextField label="Prix achat réel (FCFA) *" type="number"
                      value={ligne.prix_achat_reel}
                      onChange={e => updateLigne(i, 'prix_achat_reel', e.target.value)}
                      size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button size="small"
                      variant={ligne.has_anomalie ? 'contained' : 'outlined'}
                      color={ligne.has_anomalie ? 'error' : 'inherit'}
                      startIcon={<WarningAmber fontSize="small" />}
                      onClick={() => {
                        updateLigne(i, 'has_anomalie', !ligne.has_anomalie);
                        if (ligne.has_anomalie) updateLigne(i, 'type_anomalie', '');
                      }}
                      sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: 12 }}>
                      {ligne.has_anomalie ? 'Anomalie signalée' : 'Signaler une anomalie'}
                    </Button>
                  </Box>

                  {ligne.has_anomalie && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5, mt: 1.5 }}>
                      <FormControl size="small">
                        <InputLabel>Type d'anomalie *</InputLabel>
                        <Select value={ligne.type_anomalie} label="Type d'anomalie *"
                          onChange={e => updateLigne(i, 'type_anomalie', e.target.value)}
                          sx={{ borderRadius: 1.5 }}>
                          {Object.entries(TYPES_ANOMALIE).map(([val, label]) => (
                            <MenuItem key={val} value={val}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField label="Description de l'anomalie" size="small"
                        value={ligne.description_anomalie}
                        onChange={e => updateLigne(i, 'description_anomalie', e.target.value)}
                        placeholder="Décrivez l'anomalie observée..."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                    </Box>
                  )}
                </Box>
              )}
            </Card>
          );
        })}

        <Card elevation={0} sx={{ bgcolor: '#F3E5F5', border: '1px solid #CE93D8', borderRadius: 2, p: 1.5, mt: 1 }}>
          <Typography variant="caption" color="#6A1B9A" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
            ℹ️ Règles de traitement automatique des anomalies
          </Typography>
          {[
            ['Produit non conforme', 'Non intégré au stock'],
            ['Médicament endommagé', 'Stock quarantaine'],
            ['Péremption < 6 mois',  'Alerte déclenchée'],
            ['Quantité manquante',   'Commande → Partielle'],
          ].map(([type, effet]) => (
            <Typography key={type} variant="caption" color="#4A148C" display="block">
              • <strong>{type}</strong> → {effet}
            </Typography>
          ))}
        </Card>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1.5, bgcolor: '#FAFAFA' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#A5D6A7', color: '#388E3C' }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained"
          disabled={loading || restantTotal === 0}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
            background: restantTotal === 0 ? '#BDBDBD' : 'linear-gradient(135deg, #43A047, #1B5E20)' }}>
          {loading ? 'Enregistrement...' : restantTotal === 0 ? 'Tout déjà reçu' : 'Enregistrer la réception'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CommandeRow
// ─────────────────────────────────────────────────────────────────────────────
function CommandeRow({ commande, onRefresh }: { commande: Commande; onRefresh: () => void }) {
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const sc = STATUT_CONFIG[commande.statut];

  const handleAction = async (action: () => Promise<any>, msg: string) => {
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      await action();
      toast.success('Action effectuée !');
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erreur.");
    } finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      await exporterCommandePDF(commande);
    } catch {
      toast.error('Erreur lors de la génération du PDF.');
    } finally { setPdfLoading(false); }
  };

  return (
    <>
      <TableRow hover sx={{ '&:hover': { bgcolor: '#F8FBFF' }, borderLeft: `3px solid ${sc.border}` }}>
        <TableCell>
          <Typography fontWeight={700} fontSize={14} color="#0D47A1">{commande.reference}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(commande.date_creation).toLocaleDateString('fr-FR')}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography fontSize={13} fontWeight={500}>{commande.fournisseur_nom}</Typography>
        </TableCell>
        <TableCell>
          <Typography fontSize={13}>
            {commande.date_livraison_prevue
              ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography fontWeight={800} fontSize={14} color="#1565C0">
            {Number(commande.montant_total).toLocaleString()} FCFA
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label={sc.label} size="small"
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, border: `1px solid ${sc.border}` }} />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title={open ? 'Masquer' : 'Voir les lignes'}>
              <IconButton size="small" sx={{ color: '#2196F3' }} onClick={() => setOpen(!open)}>
                {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* ✅ Bouton PDF */}
            <Tooltip title="Télécharger le PDF">
              <IconButton size="small" sx={{ color: '#C62828' }}
                onClick={handleExportPDF} disabled={pdfLoading}>
                {pdfLoading
                  ? <CircularProgress size={14} />
                  : <PictureAsPdf fontSize="small" />}
              </IconButton>
            </Tooltip>

            {['BROUILLON', 'EN_ATTENTE'].includes(commande.statut) && commande.modifiable && (
              <Tooltip title="Envoyer au fournisseur">
                <IconButton size="small" sx={{ color: '#4CAF50' }} disabled={loading}
                  onClick={() => handleAction(() => commandeService.envoyer(commande.id),
                    `Envoyer ${commande.reference} au fournisseur ?`)}>
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {['EN_ATTENTE', 'PARTIELLE'].includes(commande.statut) && (
              <Tooltip title={commande.statut === 'PARTIELLE' ? 'Réception complémentaire' : 'Enregistrer réception'}>
                <IconButton size="small" disabled={loading} onClick={() => setReceptionOpen(true)}
                  sx={{ color: commande.statut === 'PARTIELLE' ? '#E65100' : '#2E7D32' }}>
                  <Badge variant="dot" invisible={commande.statut !== 'PARTIELLE'} color="warning">
                    <LocalShipping fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {!['LIVREE', 'ANNULEE'].includes(commande.statut) && (
              <Tooltip title="Annuler">
                <IconButton size="small" sx={{ color: '#F44336' }} disabled={loading}
                  onClick={() => handleAction(() => commandeService.annuler(commande.id),
                    `Annuler ${commande.reference} ? Irréversible.`)}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {['LIVREE', 'PARTIELLE'].includes(commande.statut) && (
              <Tooltip title="Clôturer">
                <IconButton size="small" sx={{ color: '#9C27B0' }} disabled={loading}
                  onClick={() => handleAction(() => commandeService.cloture(commande.id),
                    `Clôturer ${commande.reference} ?`)}>
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {!commande.modifiable && commande.statut === 'EN_ATTENTE' && (
              <Tooltip title="Non modifiable (> 24h)">
                <Lock fontSize="small" sx={{ color: '#BDBDBD', ml: 0.5 }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>

      {/* Détail lignes */}
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mx: 2, my: 1.5, bgcolor: '#F8FBFF', borderRadius: 2, p: 2, border: '1px solid #E3F2FD' }}>
              <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 1.5 }} fontSize={13}>
                Lignes de commande
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#EEF4FF' }}>
                    {['Médicament', 'Qté commandée', 'Qté reçue', 'Prix unitaire', 'Total'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#546E7A' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commande.lignes.map((ligne, i) => {
                    const qteRecue = ligne.quantite_recue ?? 0;
                    const complet  = qteRecue >= ligne.quantite_commandee;
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <Typography fontSize={13} fontWeight={600}>
                            {ligne.medicament_nom || `Médicament #${ligne.medicament}`}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography fontSize={13}>{ligne.quantite_commandee}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography fontSize={13} fontWeight={600}
                              color={complet ? '#2E7D32' : qteRecue > 0 ? '#E65100' : '#9E9E9E'}>
                              {qteRecue}
                            </Typography>
                            {complet && <CheckCircle sx={{ fontSize: 14, color: '#2E7D32' }} />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13}>
                            {Number(ligne.prix_unitaire_estime).toLocaleString()} FCFA
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13} fontWeight={700} color="#1565C0">
                            {(ligne.quantite_commandee * Number(ligne.prix_unitaire_estime)).toLocaleString()} FCFA
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <ReceptionDialog commande={commande} open={receptionOpen}
        onClose={() => setReceptionOpen(false)} onDone={onRefresh} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog Nouvelle Commande
// ─────────────────────────────────────────────────────────────────────────────
function NouvelleCommandeDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [fournisseurs,  setFournisseurs]  = useState<any[]>([]);
  const [medicaments,   setMedicaments]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [fournisseur,   setFournisseur]   = useState<number | ''>('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [lignes, setLignes] = useState([
    { medicament: '' as number | '', quantite_commandee: 1, prix_unitaire_estime: '' },
  ]);

  useEffect(() => {
    if (!open) return;
    fournisseurService.getAll().then(r => {
      const d = r.data as any;
      setFournisseurs(Array.isArray(d) ? d : d.results ?? []);
    }).catch(() => {});
    medicamentService.getAll().then((r: any) => {
      const d = r.data;
      setMedicaments(Array.isArray(d) ? d : d.results ?? []);
    }).catch(() => {});
  }, [open]);

  const addLigne    = () => setLignes(p => [...p, { medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);
  const removeLigne = (i: number) => setLignes(p => p.filter((_, idx) => idx !== i));
  const updateLigne = (i: number, key: string, value: any) =>
    setLignes(p => p.map((l, idx) => {
      if (idx !== i) return l;
      const u = { ...l, [key]: value };
      if (key === 'medicament') {
        const med = medicaments.find(m => m.id === value);
        if (med) u.prix_unitaire_estime = String(med.prix_achat ?? med.prix_unitaire ?? '');
      }
      return u;
    }));

  const total = lignes.reduce((s, l) => s + l.quantite_commandee * Number(l.prix_unitaire_estime || 0), 0);

  const handleSubmit = async (action: 'brouillon' | 'envoyer') => {
    if (!fournisseur) { toast.error('Sélectionnez un fournisseur.'); return; }
    const valides = lignes.filter(l => l.medicament && l.prix_unitaire_estime);
    if (!valides.length) { toast.error('Ajoutez au moins une ligne valide.'); return; }
    setLoading(true);
    try {
      const res = await commandeService.create({
        fournisseur: Number(fournisseur),
        date_livraison_prevue: dateLivraison || undefined,
        lignes: valides.map(l => ({
          medicament: Number(l.medicament),
          quantite_commandee: l.quantite_commandee,
          prix_unitaire_estime: String(l.prix_unitaire_estime),
        })),
      });
      const commandeId = (res.data as any).id;
      if (action === 'envoyer' && commandeId) {
        await commandeService.envoyer(commandeId);
        toast.success('✅ Commande envoyée ! Fournisseur notifié.', { duration: 5000 });
      } else {
        toast.success('📋 Commande enregistrée en brouillon.');
      }
      setFournisseur(''); setDateLivraison('');
      setLignes([{ medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);
      onCreated(); onClose();
    } catch (err: any) {
      toast.error(JSON.stringify(err.response?.data) || 'Erreur.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography fontWeight={800} color="#0D47A1" fontSize={18}>
            Nouveau bon de commande
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Fournisseur *</InputLabel>
            <Select value={fournisseur} label="Fournisseur *"
              onChange={e => setFournisseur(e.target.value as number)} sx={{ borderRadius: 2 }}>
              {fournisseurs.filter(f => f.est_actif).map(f => (
                <MenuItem key={f.id} value={f.id}>{f.nom_societe}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Date de livraison prévue" type="date" value={dateLivraison}
            onChange={e => setDateLivraison(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2 }}>Lignes de commande</Typography>
        {lignes.map((ligne, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
            <FormControl>
              <InputLabel>Médicament *</InputLabel>
              <Select value={ligne.medicament} label="Médicament *"
                onChange={e => updateLigne(i, 'medicament', e.target.value)}
                sx={{ borderRadius: 2 }}>
                {medicaments.filter(m => m.est_actif).map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.nom_commercial}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Quantité *" type="number" value={ligne.quantite_commandee}
              onChange={e => updateLigne(i, 'quantite_commandee', Number(e.target.value))}
              inputProps={{ min: 1 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Prix unitaire (FCFA) *" type="number" value={ligne.prix_unitaire_estime}
              onChange={e => updateLigne(i, 'prix_unitaire_estime', e.target.value)}
              helperText={ligne.medicament && ligne.prix_unitaire_estime ? '✓ auto-rempli' : ' '}
              FormHelperTextProps={{ sx: { color: '#43A047', fontSize: 10 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Button size="small" color="error" onClick={() => removeLigne(i)}
              disabled={lignes.length === 1} sx={{ mt: 1 }}>✕</Button>
          </Box>
        ))}
        <Button variant="outlined" size="small" onClick={addLigne}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}>
          + Ajouter une ligne
        </Button>
        <Box sx={{ mt: 3, p: 2.5, borderRadius: 2,
          background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} color="#0D47A1" fontSize={15}>Total estimé</Typography>
          <Typography variant="h5" fontWeight={900} color="#1565C0">
            {total.toLocaleString()} FCFA
          </Typography>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={() => handleSubmit('brouillon')} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', color: '#607D8B', borderColor: '#B0BEC5' }}>
          Enregistrer brouillon
        </Button>
        <Button onClick={() => handleSubmit('envoyer')} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
            boxShadow: '0 4px 12px rgba(33,150,243,0.35)' }}>
          {loading ? 'Envoi...' : 'Valider et envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────
export default function CommandesPage() {
  const [commandes,    setCommandes]    = useState<Commande[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [dialogOpen,   setDialogOpen]   = useState(false);

  const fetchCommandes = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await commandeService.getAll();
      const data = res.data as any;
      setCommandes(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      setError('Erreur lors du chargement des commandes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommandes(); }, [fetchCommandes]);

  const commandesFiltrees = commandes.filter(c =>
    filterStatut === 'tous' ? true : c.statut === filterStatut
  );

  const kpis = {
    total:      commandes.length,
    en_attente: commandes.filter(c => c.statut === 'EN_ATTENTE').length,
    partielles: commandes.filter(c => c.statut === 'PARTIELLE').length,
    livrees:    commandes.filter(c => c.statut === 'LIVREE').length,
    montant:    commandes.reduce((s, c) => s + Number(c.montant_total), 0),
  };

  return (
    <Box>
      <Toaster position="top-right"
        toastOptions={{ style: { borderRadius: '10px', fontFamily: 'inherit' } }} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Gestion des Commandes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Créez et suivez vos bons de commande fournisseurs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchCommandes}
              sx={{ color: '#2196F3', border: '1px solid #E3F2FD' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)',
              boxShadow: '0 4px 15px rgba(33,150,243,0.3)', px: 2.5 }}>
            Nouveau bon de commande
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total commandes', value: kpis.total,      color: '#1565C0', bg: '#E3F2FD' },
          { label: 'En attente',      value: kpis.en_attente, color: '#1565C0', bg: '#BBDEFB' },
          { label: 'Partielles',      value: kpis.partielles, color: '#E65100', bg: '#FFF8E1' },
          { label: 'Livrées',         value: kpis.livrees,    color: '#2E7D32', bg: '#E8F5E9' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: bg,
            borderRadius: 3, flex: 1, minWidth: 130,
            background: `linear-gradient(135deg, white, ${bg}22)` }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
            <Typography variant="h4" fontWeight={900} color={color} sx={{ my: 0.5 }}>{value}</Typography>
          </Card>
        ))}
        <Card elevation={0} sx={{ p: 2.5, border: '1px solid #E3F2FD', borderRadius: 3,
          flex: 2, minWidth: 200, background: 'linear-gradient(135deg, white, #E3F2FD22)' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>Volume total</Typography>
          <Typography variant="h5" fontWeight={900} color="#1565C0" sx={{ my: 0.5 }}>
            {kpis.montant.toLocaleString()} FCFA
          </Typography>
        </Card>
      </Box>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
            Filtrer :
          </Typography>
          {[
            { value: 'tous',       label: 'Toutes',     count: kpis.total },
            { value: 'EN_ATTENTE', label: 'En attente', count: kpis.en_attente },
            { value: 'PARTIELLE',  label: 'Partielle',  count: kpis.partielles },
            { value: 'LIVREE',     label: 'Livrée',     count: kpis.livrees },
            { value: 'ANNULEE',    label: 'Annulée',    count: commandes.filter(c => c.statut === 'ANNULEE').length },
          ].map(({ value, label, count }) => (
            <Chip key={value}
              label={`${label}${count > 0 ? ` (${count})` : ''}`}
              onClick={() => setFilterStatut(value)}
              sx={{
                cursor:     'pointer',
                fontWeight: filterStatut === value ? 700 : 400,
                bgcolor:    filterStatut === value ? '#1565C0' : '#F5F5F5',
                color:      filterStatut === value ? 'white'   : '#546E7A',
              }} />
          ))}
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F0F7FF' }}>
                {['Référence', 'Fournisseur', 'Livraison prévue', 'Montant', 'Statut', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: '#455A64', fontSize: 12,
                    py: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={36} />
                    <Typography color="text.secondary" sx={{ mt: 1.5 }}>Chargement...</Typography>
                  </TableCell>
                </TableRow>
              ) : commandesFiltrees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <ShoppingCart sx={{ fontSize: 48, color: '#B0BEC5', mb: 1 }} />
                    <Typography color="text.secondary">Aucune commande trouvée.</Typography>
                  </TableCell>
                </TableRow>
              ) : commandesFiltrees.map(commande => (
                <CommandeRow key={commande.id} commande={commande} onRefresh={fetchCommandes} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <NouvelleCommandeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchCommandes}
      />
    </Box>
  );
}