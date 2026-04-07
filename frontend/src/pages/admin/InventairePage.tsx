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
  if (stock === undefined) return { label: '—', color: '#90A4AE', bg: '#ECEFF1' };
  if (stock === 0)         return { label: 'Rupture',  color: '#C62828', bg: '#FFEBEE' };
  if (stock <= seuil)      return { label: 'Critique', color: '#E65100', bg: '#FFF3E0' };
  if (stock <= seuil * 2)  return { label: 'Faible',   color: '#F9A825', bg: '#FFFDE7' };
  return                          { label: 'Optimal',  color: '#2E7D32', bg: '#E8F5E9' };
}

// ── Export PDF inventaire ─────────────────────────────────────────────────────
async function exporterInventairePDF(medicaments: Medicament[]) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const BLEU     = [13, 71, 161]   as [number, number, number];
  const GRIS     = [100, 100, 100] as [number, number, number];
  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();

  const entetePied = (numPage: number, total: number) => {
    doc.setFillColor(...BLEU);
    doc.rect(0, 0, W, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le ${dateStr} à ${heureStr}`, W - 14, 11, { align: 'right' });

    doc.setFillColor(240, 247, 255);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(...GRIS); doc.setFontSize(7);
    doc.text('CliniqueStock — Liste des Médicaments', 14, H - 4);
    doc.text(`Page ${numPage} / ${total}`, W - 14, H - 4, { align: 'right' });
    doc.text(`${dateStr} ${heureStr}`, W / 2, H - 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  // Titre et sous-titre — page 1
  entetePied(1, 1);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLEU);
  doc.text('Liste des Médicaments — CliniqueStock', W / 2, 28, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
  doc.text(`Médicaments actifs classés par catégorie — généré le ${dateStr} à ${heureStr}`, W / 2, 35, { align: 'center' });

  // Grouper par catégorie
  const parCateg: Record<string, Medicament[]> = {};
  medicaments.filter(m => m.est_actif).forEach(m => {
    const cat = m.categorie_nom || 'Sans catégorie';
    if (!parCateg[cat]) parCateg[cat] = [];
    parCateg[cat].push(m);
  });

  const COLS = [
    { label: 'Nom Commercial', x: 14,  w: 42 },
    { label: 'DCI',            x: 57,  w: 30 },
    { label: 'Forme / Dosage', x: 88,  w: 28 },
    { label: 'Stock Actuel',   x: 117, w: 20 },
    { label: 'Date Expiration',x: 138, w: 30 },
    { label: 'Prix (FCFA)',    x: 169, w: 25 },
    { label: 'Conditions',     x: 195, w: 42 },
  ];
  const ROW_H = 8;
  let y = 45;

  const enteteTableau = () => {
    doc.setFillColor(...BLEU);
    doc.rect(12, y - 6, W - 24, ROW_H, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    COLS.forEach(c => doc.text(c.label, c.x, y));
    doc.setTextColor(0, 0, 0);
    y += ROW_H;
  };

  let pageNum = 1;
  const checkNewPage = () => {
    if (y > H - 20) {
      doc.addPage();
      pageNum++;
      entetePied(pageNum, pageNum);
      y = 24;
      enteteTableau();
    }
  };

  Object.entries(parCateg).forEach(([categorie, meds]) => {
    checkNewPage();
    // Titre catégorie
    doc.setFillColor(238, 244, 255);
    doc.rect(12, y - 5, W - 24, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLEU);
    doc.text(`▸ ${categorie} (${meds.length} médicament(s))`, 15, y);
    doc.setTextColor(0, 0, 0);
    y += ROW_H + 1;

    enteteTableau();

    meds.forEach((med, idx) => {
      checkNewPage();
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
      doc.rect(12, y - 6, W - 24, ROW_H, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');

      const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
      const stock = med.stock_actuel;
      const stockColor: [number,number,number] = stock === 0 ? [198,40,40] : stock !== undefined && stock <= med.seuil_alerte ? [230,81,0] : [33,33,33];

      doc.setTextColor(13, 71, 161);
      doc.text(med.nom_commercial.slice(0, 22), COLS[0].x, y);
      doc.setTextColor(33, 33, 33);
      doc.text((med.dci || '').slice(0, 16), COLS[1].x, y);
      doc.text(`${med.forme_galenique} ${med.dosage}`.slice(0, 18), COLS[2].x, y);
      doc.setTextColor(...stockColor);
      doc.text(stock !== undefined ? String(stock) : '—', COLS[3].x, y);
      doc.setTextColor(33, 33, 33);
      doc.text(formatDate(med.date_peremption), COLS[4].x, y);
      doc.text(Number(med.prix_unitaire).toLocaleString('fr-FR'), COLS[5].x, y);
      doc.text((med.conditions_stockage || '—').slice(0, 24), COLS[6].x, y);
      y += ROW_H;
    });
    y += 4;
  });

  // Corriger pagination
  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p);
    doc.setFillColor(240, 247, 255);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(...GRIS); doc.setFontSize(7);
    doc.text('CliniqueStock — Liste des Médicaments', 14, H - 4);
    doc.text(`Page ${p} / ${totalPg}`, W - 14, H - 4, { align: 'right' });
    doc.text(`${dateStr} ${heureStr}`, W / 2, H - 4, { align: 'center' });
  }

  doc.save(`inventaire-medicaments-${dateStr}.pdf`);
  toast.success('PDF téléchargé !');
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
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Category sx={{ color: '#1565C0', fontSize: 18 }} />
          </Box>
          <Typography fontWeight={800} color="#0D47A1">Nouvelle catégorie</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nom de la catégorie *" value={nom} onChange={e => setNom(e.target.value)}
            placeholder="ex: Antibiotiques" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
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
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #1976D2, #0D47A1)' }}>
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
  const [categories,    setCategories]    = useState<{id: number; nom: string}[]>([]);
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
      const results: Medicament[] = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      const count   = data.count ?? results.length;

      setMedicaments(results);
      setTotal(count);
      setTotalPages(Math.ceil(count / 20) || 1);
      setRuptures(results.filter(m => (m.stock_actuel ?? 0) === 0 && m.est_actif).length);
      setAlertes(results.filter(m => {
        const s = m.stock_actuel;
        return s !== undefined && s > 0 && s <= m.seuil_alerte && m.est_actif;
      }).length);
    } catch (err: any) {
      setError('Erreur lors du chargement.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/categories/').then(r => {
      const d = r.data;
      setCategories(Array.isArray(d) ? d : d.results ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchMedicaments(); }, [search, filterStatut, filterCateg, page]);

  const handleToggle = async (med: Medicament) => {
    if (!confirm(med.est_actif ? `Archiver "${med.nom_commercial}" ?` : `Désarchiver "${med.nom_commercial}" ?`)) return;
    try {
      await api.post(`/medicaments/${med.id}/${med.est_actif ? 'archiver' : 'restaurer'}/`);
      fetchMedicaments();
    } catch { toast.error('Erreur lors de l\'opération.'); }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      // Charger tous les médicaments actifs pour le PDF
      const res = await api.get('/medicaments/?est_actif=true&page_size=1000');
      const data = res.data;
      const all: Medicament[] = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      await exporterInventairePDF(all);
    } catch { toast.error('Erreur lors de la génération du PDF.'); }
    finally { setExportLoading(false); }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    const date = new Date(d);
    const now   = new Date();
    const diff  = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return { text: date.toLocaleDateString('fr-FR'), bientot: diff < 90 && diff > 0, expire: diff < 0 };
  };

  const actifs   = medicaments.filter(m => m.est_actif).length;
  const inactifs = medicaments.filter(m => !m.est_actif).length;

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
          <Button variant="outlined" startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdf />}
            onClick={handleExportPDF} disabled={exportLoading}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#FFCDD2', color: '#C62828', fontWeight: 600 }}>
            Exporter (PDF)
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
          { label: 'Total Médicaments', value: total,    color: '#1565C0', bg: '#E3F2FD', icon: <Inventory2 sx={{ color: '#1565C0', fontSize: 22 }} />, sub: 'dans le catalogue', trend: '+12 depuis le mois dernier' },
          { label: 'Ruptures de Stock', value: ruptures, color: '#C62828', bg: '#FFEBEE', icon: <TrendingDown sx={{ color: '#C62828', fontSize: 22 }} />, sub: 'médicaments épuisés', trend: '' },
          { label: 'Alertes Péremption',value: alertes,  color: '#E65100', bg: '#FFF3E0', icon: <Warning sx={{ color: '#E65100', fontSize: 22 }} />, sub: 'sous le seuil d\'alerte', trend: '' },
          { label: 'Actifs',            value: actifs,   color: '#2E7D32', bg: '#E8F5E9', icon: <CheckCircle sx={{ color: '#2E7D32', fontSize: 22 }} />, sub: 'disponibles en stock', trend: '' },
        ].map(({ label, value, color, bg, icon, sub, trend }) => (
          <Card key={label} elevation={0} sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 155,
            border: `1px solid ${bg}`, background: `linear-gradient(145deg, #ffffff, ${bg}40)`,
            position: 'relative', overflow: 'hidden' }}>
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
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
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
                  <TableCell key={h} sx={{ fontWeight: 700, color: '#455A64', fontSize: 11, py: 1.5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</TableCell>
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
                const statut   = getStatutStock(med.stock_actuel, med.seuil_alerte);
                const stockPct = med.stock_actuel !== undefined && med.seuil_alerte > 0
                  ? Math.min(100, (med.stock_actuel / (med.seuil_alerte * 3)) * 100)
                  : null;
                const expInfo = formatDate(med.date_peremption);
                const expObj  = typeof expInfo === 'object' ? expInfo : null;

                return (
                  <TableRow key={med.id} hover sx={{ '&:hover': { bgcolor: '#F8FBFF' }, cursor: 'pointer' }}
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
                            sx={{ bgcolor: statut.bg, color: statut.color, fontWeight: 700, fontSize: 11, border: `1px solid ${statut.color}30` }} />
                        : <Chip label="Archivé" size="small" sx={{ bgcolor: '#ECEFF1', color: '#607D8B', fontWeight: 700, fontSize: 11 }} />
                      }
                    </TableCell>
                    {/* ── COLONNE EXPIRATION REMPLIE ── */}
                    <TableCell>
                      {expObj ? (
                        <Typography fontSize={12} fontWeight={expObj.bientot || expObj.expire ? 700 : 400}
                          color={expObj.expire ? '#C62828' : expObj.bientot ? '#E65100' : '#424242'}>
                          {expObj.text}
                          {expObj.expire && ' ⚠️'}
                          {!expObj.expire && expObj.bientot && ' ⚡'}
                        </Typography>
                      ) : (
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        <Tooltip title="Voir détails">
                          <IconButton size="small" sx={{ color: '#2196F3' }} onClick={() => navigate(`/admin/inventaire/${med.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton size="small" sx={{ color: '#FF9800' }} onClick={() => navigate(`/admin/inventaire/${med.id}/modifier`)}>
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
              Affichage {((page - 1) * 20) + 1} à {Math.min(page * 20, total)} sur <strong>{total}</strong>
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" size="small"
              sx={{ '& .MuiPaginationItem-root': { borderRadius: 1.5 } }} />
          </Box>
        )}
      </Card>

      <CategorieDialog open={categDialog} onClose={() => setCategDialog(false)}
        onSaved={() => {
          setCategDialog(false);
          api.get('/categories/').then(r => setCategories(Array.isArray(r.data) ? r.data : r.data.results ?? []));
        }} />
    </Box>
  );
}