import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Select, MenuItem, FormControl, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Card, Alert, Tooltip, Pagination, CircularProgress,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider,
} from '@mui/material';
import {
  Search, Add, Visibility, Edit,
  Refresh, Warning, CheckCircle, Inventory2,
  TrendingDown, LocalPharmacy, Archive, Unarchive,
  PictureAsPdf, Category,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/authService';
import { medicamentService } from '../../services/medicamentService';


interface Medicament {
  id: number; nom_commercial: string; dci: string;
  forme_galenique: string; dosage: string; unite_stock: string;
  prix_unitaire: string; seuil_alerte: number;
  conditions_stockage: string; indications_therapeutiques: string;
  code_barres: string; est_actif: boolean;
  categorie: number; categorie_nom: string;
  stock_actuel?: number; date_peremption?: string;
  numero_lot_actuel?: string;
}

function getStatutStock(stock: number | undefined, seuil: number) {
  if (stock === undefined) return { label: '—',       color: '#90A4AE', bg: '#ECEFF1' };
  if (stock === 0)         return { label: 'Rupture',  color: '#C62828', bg: '#FFEBEE' };
  if (stock <= seuil)      return { label: 'Critique', color: '#E65100', bg: '#FFF3E0' };
  if (stock <= seuil * 2)  return { label: 'Faible',   color: '#F9A825', bg: '#FFFDE7' };
  return                          { label: 'Optimal',  color: '#2E7D32', bg: '#E8F5E9' };
}

// ── Format prix ───────────────────────────────────────────────────────────────
const formatPrix = (prix: number | string): string => {
  const n = Number(prix);
  if (isNaN(n)) return '—';
  return n % 1 === 0
    ? `${n.toLocaleString('fr-FR')} FCFA`
    : `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;
};

// ── Export PDF inventaire ─────────────────────────────────────────────────────
async function exporterInventairePDF(medicaments: Medicament[], userName = 'Administrateur') {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const W        = doc.internal.pageSize.getWidth();   // 297
  const H        = doc.internal.pageSize.getHeight();  // 210

  const C_BLEU  : [number,number,number] = [13, 71, 161];
  const C_BLEU2 : [number,number,number] = [21, 101, 192];
  const C_GRIS  : [number,number,number] = [96, 96, 96];
  const C_BGROW1: [number,number,number] = [248, 251, 255];
  const C_BGROW2: [number,number,number] = [255, 255, 255];
  const C_ROUGE : [number,number,number] = [198, 40, 40];
  const C_ORANGE: [number,number,number] = [230, 81, 0];

  // ── Entête / pied de page ────────────────────────────────────────────────
  const addHeaderFooter = (page: number, total: number) => {
    // Bandeau haut
    doc.setFillColor(...C_BLEU);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock', 14, 9.5);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Inventaire des Médicaments`, W / 2, 9.5, { align: 'center' });
    doc.text(`Généré le ${dateStr} à ${heureStr} par ${userName}`, W - 14, 9.5, { align: 'right' });

    // Ligne de séparation
    doc.setDrawColor(...C_BLEU2);
    doc.setLineWidth(0.3);
    doc.line(0, 14, W, 14);

    // Pied de page
    doc.setFillColor(245, 248, 255);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setDrawColor(200, 215, 240);
    doc.setLineWidth(0.2);
    doc.line(0, H - 10, W, H - 10);
    doc.setTextColor(...C_GRIS); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('CliniqueStock — Document confidentiel', 14, H - 4);
    doc.text(`Page ${page} / ${total}`, W / 2, H - 4, { align: 'center' });
    doc.text(`${dateStr} ${heureStr}`, W - 14, H - 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  // ── Colonnes ─────────────────────────────────────────────────────────────
  const COLS = [
    { label: 'Nom Commercial',   x: 14,  maxW: 40 },
    { label: 'DCI',              x: 57,  maxW: 28 },
    { label: 'Forme / Dosage',   x: 88,  maxW: 26 },
    { label: 'Stock',            x: 117, maxW: 14 },
    { label: 'Seuil',            x: 133, maxW: 12 },
    { label: 'Expiration',       x: 148, maxW: 22 },
    { label: 'Prix (FCFA)',      x: 173, maxW: 26 },
    { label: 'Conditions',       x: 202, maxW: 40 },
    { label: 'Indications',      x: 245, maxW: 45 },
  ];
  const ROW_H    = 8;
  const COL_HDR  = 7;
  let y = 22;
  let pageNum = 1;

  // ── Entête tableau ────────────────────────────────────────────────────────
  const drawTableHeader = () => {
    doc.setFillColor(...C_BLEU2);
    doc.rect(12, y - 5.5, W - 24, COL_HDR, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
    COLS.forEach(c => doc.text(c.label, c.x, y));
    doc.setTextColor(0, 0, 0);
    y += COL_HDR;

    // Ligne sous entête
    doc.setDrawColor(...C_BLEU2); doc.setLineWidth(0.3);
    doc.line(12, y - 1, W - 12, y - 1);
  };

  // ── Vérification saut de page ─────────────────────────────────────────────
  const checkPage = (needed = ROW_H) => {
    if (y + needed > H - 14) {
      doc.addPage();
      pageNum++;
      addHeaderFooter(pageNum, pageNum);
      y = 22;
      drawTableHeader();
    }
  };

  // ── Grouper par catégorie ─────────────────────────────────────────────────
  const parCateg: Record<string, Medicament[]> = {};
  medicaments.filter(m => m.est_actif).forEach(m => {
    const c = m.categorie_nom || 'Sans catégorie';
    if (!parCateg[c]) parCateg[c] = [];
    parCateg[c].push(m);
  });

  // ── PAGE 1 : titre + résumé ───────────────────────────────────────────────
  addHeaderFooter(1, 1);

  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Inventaire des Médicaments', W / 2, 24, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  doc.text('CliniqueStock — Document officiel', W / 2, 31, { align: 'center' });

  // Encadré résumé
  doc.setFillColor(240, 247, 255);
  doc.roundedRect(14, 36, W - 28, 24, 2, 2, 'F');
  doc.setDrawColor(...C_BLEU2); doc.setLineWidth(0.4);
  doc.roundedRect(14, 36, W - 28, 24, 2, 2, 'S');

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Résumé de l\'inventaire', 20, 44);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  doc.setFontSize(7.5);
  const nbMeds = medicaments.filter(m => m.est_actif).length;
  const nbCat  = Object.keys(parCateg).length;
  const totalStock = medicaments.reduce((s, m) => s + (m.stock_actuel ?? 0), 0);

  const colResume = [
    ['Total médicaments actifs', String(nbMeds)],
    ['Catégories',               String(nbCat)],
    ['Total unités en stock',    totalStock.toLocaleString('fr-FR')],
    ['Générateur',               userName],
    ['Date de génération',       `${dateStr} à ${heureStr}`],
  ];
  colResume.forEach(([lbl, val], i) => {
    const cx = 20 + Math.floor(i / 3) * 90;
    const cy = 51 + (i % 3) * 6;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
    doc.text(lbl + ' :', cx, cy);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(val, cx + 45, cy);
  });

  y = 68;
  drawTableHeader();

  // ── Lignes médicaments ────────────────────────────────────────────────────
  Object.entries(parCateg).forEach(([categorie, meds]) => {
    checkPage(10);

    // Titre catégorie
    doc.setFillColor(232, 240, 255);
    doc.rect(12, y - 5.5, W - 24, 7, 'F');
    doc.setDrawColor(180, 210, 255); doc.setLineWidth(0.2);
    doc.rect(12, y - 5.5, W - 24, 7, 'S');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
    doc.text(`▸  ${categorie}  —  ${meds.length} médicament(s)`, 16, y);
    y += 7;

    meds.forEach((med, idx) => {
      checkPage(ROW_H);

      // Alternance de fond
      doc.setFillColor(...(idx % 2 === 0 ? C_BGROW1 : C_BGROW2));
      doc.rect(12, y - 5.5, W - 24, ROW_H, 'F');

      // Ligne de séparation légère
      doc.setDrawColor(220, 235, 255); doc.setLineWidth(0.1);
      doc.line(12, y + 2.5, W - 12, y + 2.5);

      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');

      const truncate = (s: string, max: number) =>
        s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '—');

      const stock = med.stock_actuel;
      const stockColor: [number,number,number] =
        stock === 0          ? C_ROUGE  :
        stock !== undefined && stock <= med.seuil_alerte ? C_ORANGE :
        [33, 33, 33];

      const formatDateCourt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('fr-FR') : '—';

      // Nom commercial — bleu cliquable
      doc.setTextColor(...C_BLEU); doc.setFont('helvetica', 'bold');
      doc.text(truncate(med.nom_commercial, 22), COLS[0].x, y);

      doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
      doc.text(truncate(med.dci, 16),                              COLS[1].x, y);
      doc.text(truncate(`${med.forme_galenique} ${med.dosage}`, 18), COLS[2].x, y);

      // Stock coloré
      doc.setTextColor(...stockColor); doc.setFont('helvetica', 'bold');
      doc.text(stock !== undefined ? String(stock) : '—',          COLS[3].x, y);

      doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
      doc.text(String(med.seuil_alerte),                           COLS[4].x, y);
      doc.text(formatDateCourt(med.date_peremption),               COLS[5].x, y);
      doc.text(formatPrix(med.prix_unitaire),                      COLS[6].x, y);
      doc.text(truncate(med.conditions_stockage, 24),              COLS[7].x, y);
      doc.text(truncate(med.indications_therapeutiques, 30),       COLS[8].x, y);

      y += ROW_H;
    });
    y += 3; // espace entre catégories
  });

  // ── Corriger pagination finale ────────────────────────────────────────────
  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p);
    addHeaderFooter(p, totalPg);
  }

  const slug = dateStr.replace(/\//g, '_');

  // Ajouter la signature si disponible
  try {
    const sigRes = await api.get('/signature/');
    const sigData = sigRes.data as any;
    if (sigData.exists && sigData.image_b64) {
      const lastPage = doc.getNumberOfPages();
      doc.setPage(lastPage);

      // Zone signature en bas à droite
      const sigX = W - 80;
      const sigY = H - 45;

      doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.3);
      doc.rect(sigX - 5, sigY - 15, 75, 30, 'S');

      // Image de la signature
      doc.addImage(sigData.image_b64, 'PNG', sigX, sigY - 12, 65, 15);

      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
      doc.text(sigData.nom || '', sigX + 32, sigY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
      doc.text(sigData.fonction || '', sigX + 32, sigY + 10, { align: 'center' });
    }
  } catch { /* signature optionnelle */ }

  doc.save(`inventaire-medicaments-${slug}.pdf`);
  toast.success(`PDF exporté (${totalPg} page(s)) !`);
}

// ── Dialog Nouvelle Catégorie ─────────────────────────────────────────────────
function CategorieDialog({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [nom,         setNom]         = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => { if (!open) { setNom(''); setDescription(''); setError(''); } }, [open]);

  const handleSave = async () => {
    if (!nom.trim()) { setError('Le nom de la catégorie est obligatoire.'); return; }
    setLoading(true);
    try {
      await api.post('/categories/', { nom: nom.trim(), description });
      toast.success(`Catégorie "${nom}" ajoutée !`);
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.nom?.[0] || 'Erreur lors de l\'ajout.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#E3F2FD',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Category sx={{ color: '#1565C0', fontSize: 18 }} />
          </Box>
          <Typography fontWeight={800} color="#0D47A1">Nouvelle catégorie</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nom *" value={nom} onChange={e => setNom(e.target.value)}
            placeholder="ex: Antibiotiques"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)}
            multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #1976D2, #0D47A1)' }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function InventairePage() {
  const navigate = useNavigate();
  const [medicaments,   setMedicaments]   = useState<Medicament[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [filterStatut,  setFilterStatut]  = useState('tous');
  const [filterCateg,   setFilterCateg]   = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);
  const [ruptures,      setRuptures]      = useState(0);
  const [alertes,       setAlertes]       = useState(0);
  const [categories,    setCategories]    = useState<{ id: number; nom: string }[]>([]);
  const [categDialog,   setCategDialog]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchMedicaments = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search)                     params.append('search', search);
      if (filterStatut === 'actif')   params.append('est_actif', 'true');
      if (filterStatut === 'inactif') params.append('est_actif', 'false');
      if (filterCateg)                params.append('categorie', filterCateg);
      params.append('page', String(page));

      const res     = await api.get(`/medicaments/?${params}`);
      const data    = res.data;
      const results: Medicament[] = Array.isArray(data.results) ? data.results
        : Array.isArray(data) ? data : [];
      const count   = data.count ?? results.length;

      setMedicaments(results);
      setTotal(count);
      setTotalPages(Math.ceil(count / 20) || 1);
      setRuptures(results.filter(m => (m.stock_actuel ?? 0) === 0 && m.est_actif).length);
      setAlertes(results.filter(m => {
        const s = m.stock_actuel;
        return s !== undefined && s > 0 && s <= m.seuil_alerte && m.est_actif;
      }).length);
    } catch { setError('Erreur lors du chargement.'); }
    finally   { setLoading(false); }
  };

  useEffect(() => {
    api.get('/categories/').then(r => {
      const d = r.data;
      setCategories(Array.isArray(d) ? d : d.results ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchMedicaments(); }, [search, filterStatut, filterCateg, page]);

  const handleToggle = async (med: Medicament) => {
    if (!confirm(med.est_actif
      ? `Archiver "${med.nom_commercial}" ?`
      : `Désarchiver "${med.nom_commercial}" ?`)) return;
    try {
      await api.post(`/medicaments/${med.id}/${med.est_actif ? 'archiver' : 'restaurer'}/`);
      fetchMedicaments();
    } catch { toast.error('Erreur lors de l\'opération.'); }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/medicaments/?est_actif=true&page_size=1000');
      const data = res.data;
      const all: Medicament[] = Array.isArray(data.results) ? data.results
        : Array.isArray(data) ? data : [];
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = user.prenom && user.nom ? `${user.prenom} ${user.nom}` : 'Administrateur';
      await exporterInventairePDF(all, userName);
    } catch { toast.error('Erreur lors de la génération du PDF.'); }
    finally   { setExportLoading(false); }
  };

  const formatDate = (d?: string) => {
    if (!d) return { text: '—', bientot: false, expire: false };
    const date = new Date(d);
    const diff  = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return { text: date.toLocaleDateString('fr-FR'), bientot: diff < 90 && diff > 0, expire: diff < 0 };
  };

  const actifs = medicaments.filter(m => m.est_actif).length;

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">Inventaire des Médicaments</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gérez vos stocks, surveillez les seuils d'alerte et suivez les dates de péremption.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="outlined"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdf />}
            onClick={handleExportPDF} disabled={exportLoading}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#FFCDD2', color: '#C62828', fontWeight: 600 }}>
            Exporter (PDF)
          </Button>

          {/* ✅ TON BOUTON AJOUTÉ AU BON ENDROIT */}
          <Button variant="outlined"
            startIcon={<Inventory2 sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/inventaire-physique')}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#C8E6C9', color: '#2E7D32', fontWeight: 600 }}>
            Inventaire physique
          </Button>

          <Button variant="outlined" startIcon={<Category />}
            onClick={() => setCategDialog(true)}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#C5CAE9', color: '#3949AB', fontWeight: 600 }}>
            Ajouter une catégorie
          </Button>

          <Button variant="contained" startIcon={<Add />}
            onClick={() => navigate('/admin/inventaire/nouveau')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #1976D2, #0D47A1)',
              boxShadow: '0 4px 14px rgba(13,71,161,0.35)', px: 2.5 }}>
            Ajouter un médicament
          </Button>

        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Médicaments', value: total,    color: '#1565C0', bg: '#E3F2FD', icon: <Inventory2  sx={{ color: '#1565C0', fontSize: 22 }} />, sub: 'dans le catalogue',    trend: '+12 depuis le mois dernier' },
          { label: 'Ruptures de Stock', value: ruptures, color: '#C62828', bg: '#FFEBEE', icon: <TrendingDown sx={{ color: '#C62828', fontSize: 22 }} />, sub: 'médicaments épuisés',   trend: '' },
          { label: 'Alertes Péremption',value: alertes,  color: '#E65100', bg: '#FFF3E0', icon: <Warning      sx={{ color: '#E65100', fontSize: 22 }} />, sub: 'sous le seuil d\'alerte', trend: '' },
          { label: 'Actifs',            value: actifs,   color: '#2E7D32', bg: '#E8F5E9', icon: <CheckCircle  sx={{ color: '#2E7D32', fontSize: 22 }} />, sub: 'disponibles en stock', trend: '' },
        ].map(({ label, value, color, bg, icon, sub, trend }) => (
          <Card key={label} elevation={0} sx={{
            p: 2.5, borderRadius: 3, flex: 1, minWidth: 155,
            border: `1px solid ${bg}`,
            background: `linear-gradient(145deg, #ffffff, ${bg}40)`,
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: '50%', bgcolor: `${color}10` }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>
                  {label}
                </Typography>
                <Typography variant="h3" fontWeight={900} color={color} sx={{ my: 0.5, lineHeight: 1 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{sub}</Typography>
                {trend && <Typography variant="caption" display="block" sx={{ color: '#2E7D32', fontWeight: 700, mt: 0.3 }}>{trend}</Typography>}
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${color}30` }}>
                {icon}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField placeholder="Rechercher par nom, code ou fournisseur..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} size="small"
            sx={{ flex: 1, minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F8FBFF' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#90A4AE', fontSize: 20 }} /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={filterCateg} onChange={e => { setFilterCateg(e.target.value); setPage(1); }} displayEmpty sx={{ borderRadius: 2 }}>
              <MenuItem value="">Toutes Catégories</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nom}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1); }} sx={{ borderRadius: 2 }}>
              <MenuItem value="tous">Tous les Statuts</MenuItem>
              <MenuItem value="actif">Actifs</MenuItem>
              <MenuItem value="inactif">Archivés</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchMedicaments} sx={{ color: '#2196F3', border: '1px solid #E3F2FD' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Tableau */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F0F7FF', '& th': { borderBottom: '2px solid #BBDEFB' } }}>
                {['Médicament', 'Catégorie', 'Dosage / Forme', 'Stock Actuel', 'Seuil', 'Statut', 'Expiration', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: '#455A64', fontSize: 11, py: 1.5,
                    textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && medicaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <LocalPharmacy sx={{ fontSize: 56, color: '#CFD8DC', mb: 1.5 }} />
                    <Typography color="text.secondary" fontWeight={500}>Aucun médicament trouvé.</Typography>
                    <Button sx={{ mt: 1.5, textTransform: 'none' }} startIcon={<Add />}
                      onClick={() => navigate('/admin/inventaire/nouveau')}>
                      Ajouter le premier médicament
                    </Button>
                  </TableCell>
                </TableRow>
              ) : medicaments.map(med => {
                const statut  = getStatutStock(med.stock_actuel, med.seuil_alerte);
                const stockPct = med.stock_actuel !== undefined && med.seuil_alerte > 0
                  ? Math.min(100, (med.stock_actuel / (med.seuil_alerte * 3)) * 100) : null;
                const expObj  = formatDate(med.date_peremption);

                return (
                  <TableRow key={med.id} hover
                    sx={{ '&:hover': { bgcolor: '#F8FBFF' }, cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/inventaire/${med.id}`)}>

                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography fontWeight={700} fontSize={13} color="#0D47A1"
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {med.nom_commercial}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {med.dci} • {med.code_barres}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip label={med.categorie_nom || '—'} size="small"
                        sx={{ bgcolor: '#EEF4FF', color: '#1565C0', fontWeight: 600, fontSize: 11 }} />
                    </TableCell>

                    <TableCell>
                      <Typography fontSize={13} fontWeight={600}>{med.dosage}</Typography>
                      <Typography variant="caption" color="text.secondary">{med.forme_galenique}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography fontWeight={800} fontSize={14}
                        color={(med.stock_actuel ?? 0) === 0 ? '#C62828' : (med.stock_actuel ?? 0) <= med.seuil_alerte ? '#E65100' : '#1A237E'}>
                        {med.stock_actuel !== undefined ? med.stock_actuel : '—'}
                      </Typography>
                      {stockPct !== null && (
                        <LinearProgress variant="determinate" value={stockPct}
                          sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: '#ECEFF1',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: stockPct < 34 ? '#C62828' : stockPct < 67 ? '#F9A825' : '#43A047',
                            } }} />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography fontSize={12} color="#607D8B" fontWeight={600}>{med.seuil_alerte}</Typography>
                    </TableCell>

                    <TableCell>
                      {med.est_actif
                        ? <Chip label={statut.label} size="small"
                            sx={{ bgcolor: statut.bg, color: statut.color, fontWeight: 700, fontSize: 11,
                              border: `1px solid ${statut.color}30` }} />
                        : <Chip label="Archivé" size="small"
                            sx={{ bgcolor: '#ECEFF1', color: '#607D8B', fontWeight: 700, fontSize: 11 }} />
                      }
                    </TableCell>

                    <TableCell>
                      <Typography fontSize={12} fontWeight={expObj.bientot || expObj.expire ? 700 : 400}
                        color={expObj.expire ? '#C62828' : expObj.bientot ? '#E65100' : '#424242'}>
                        {expObj.text}
                        {expObj.expire  && ' ⚠️'}
                        {!expObj.expire && expObj.bientot && ' ⚡'}
                      </Typography>
                    </TableCell>

                    <TableCell onClick={e => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        <Tooltip title="Voir détails">
                          <IconButton size="small" sx={{ color: '#2196F3' }}
                            onClick={() => navigate(`/admin/inventaire/${med.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton size="small" sx={{ color: '#FF9800' }}
                            onClick={() => navigate(`/admin/inventaire/${med.id}/modifier`)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={med.est_actif ? 'Archiver' : 'Désarchiver'}>
                          <IconButton size="small" sx={{ color: med.est_actif ? '#F44336' : '#4CAF50' }}
                            onClick={() => handleToggle(med)}>
                            {med.est_actif ? <Archive fontSize="small" /> : <Unarchive fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            px: 3, py: 2, borderTop: '1px solid #E3F2FD', bgcolor: '#FAFCFF' }}>
            <Typography variant="body2" color="text.secondary">
              Affichage {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} sur <strong>{total}</strong>
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)}
              color="primary" size="small"
              sx={{ '& .MuiPaginationItem-root': { borderRadius: 1.5 } }} />
          </Box>
        )}
      </Card>

      <CategorieDialog
        open={categDialog}
        onClose={() => setCategDialog(false)}
        onSaved={() => {
          setCategDialog(false);
          api.get('/categories/').then(r => setCategories(Array.isArray(r.data) ? r.data : r.data.results ?? []));
        }}
      />
    </Box>
  );
}