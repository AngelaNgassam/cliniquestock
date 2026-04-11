import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TextField, Chip,
  CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, IconButton,
  Tooltip, Select, MenuItem, FormControl, InputLabel,
  Grid,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, Warning, Close,
  Inventory2, ArrowBack, Save, PictureAsPdf,
  Visibility, FilterList, Download,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import inventaireService from '../../services/inventaireService';
import type { LigneInventaire, InventaireSession } from '../../services/inventaireService';
import { useAuthStore } from '../../store/authStore';

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ── Export PDF inventaire physique ────────────────────────────────────────────
async function exportInventairePhysiquePDF(
  session: any,
  lignes: LigneInventaire[],
  moisNom: string,
  annee: number,
  userName: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const C_BLEU  : [number,number,number] = [13, 71, 161];
  const C_BLEU2 : [number,number,number] = [21, 101, 192];
  const C_GRIS  : [number,number,number] = [96, 96, 96];
  const C_ROUGE : [number,number,number] = [198, 40, 40];
  const C_VERT  : [number,number,number] = [46, 125, 50];

  let pageNum = 1;
  let y       = 0;

  const addHF = (p: number, total: number) => {
    doc.setFillColor(...C_BLEU);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock', 14, 9.5);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`Inventaire Physique — ${moisNom} ${annee}`, W / 2, 9.5, { align: 'center' });
    doc.text(`Généré le ${dateStr} à ${heureStr} par ${userName}`, W - 14, 9.5, { align: 'right' });

    doc.setFillColor(245, 248, 255);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.2);
    doc.line(0, H - 10, W, H - 10);
    doc.setTextColor(...C_GRIS); doc.setFontSize(7);
    doc.text('CliniqueStock — Inventaire Physique', 14, H - 4);
    doc.text(`Page ${p} / ${total}`, W / 2, H - 4, { align: 'center' });
    doc.text(dateStr, W - 14, H - 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const COLS = [
    { label: 'Médicament',      x: 14,  maxW: 40 },
    { label: 'DCI',             x: 57,  maxW: 28 },
    { label: 'Qté Théorique',   x: 88,  maxW: 20 },
    { label: 'Qté Physique',    x: 112, maxW: 20 },
    { label: 'Écart',           x: 136, maxW: 16 },
    { label: 'Justification',   x: 156, maxW: 90 },
  ];
  const ROW_H = 8;

  const drawTableHeader = () => {
    doc.setFillColor(...C_BLEU2);
    doc.rect(12, y - 5.5, W - 24, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    COLS.forEach(c => doc.text(c.label, c.x, y));
    doc.setTextColor(0, 0, 0);
    y += 7;
  };

  const checkPage = () => {
    if (y + ROW_H > H - 14) {
      doc.addPage();
      pageNum++;
      addHF(pageNum, pageNum);
      y = 22;
      drawTableHeader();
    }
  };

  // Page 1
  addHF(1, 1);
  y = 22;

  // Titre
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text(`Inventaire Physique — ${moisNom} ${annee}`, W / 2, y + 5, { align: 'center' });
  y += 14;

  // Encadré résumé
  doc.setFillColor(240, 247, 255);
  doc.roundedRect(14, y, W - 28, 20, 2, 2, 'F');
  doc.setDrawColor(...C_BLEU2); doc.setLineWidth(0.3);
  doc.roundedRect(14, y, W - 28, 20, 2, 2, 'S');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  y += 6;
  doc.text(`Initié par : ${session.initie_par || userName}`, 20, y);
  doc.text(`Début : ${new Date(session.date_debut).toLocaleString('fr-FR')}`, 100, y);
  doc.text(`Statut : ${session.statut === 'CLOTURE' ? 'Clôturé' : 'En cours'}`, 180, y);
  y += 6;
  const avecEcart = lignes.filter(l => l.ecart !== null && l.ecart !== 0).length;
  doc.text(`Total médicaments : ${lignes.length}`, 20, y);
  doc.text(`Avec écarts : ${avecEcart}`, 100, y);
  doc.text(`Sans écart : ${lignes.length - avecEcart}`, 180, y);
  y += 10;

  drawTableHeader();

  const truncate = (s: string, max: number) =>
    s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '—');

  lignes.forEach((ligne, idx) => {
    checkPage();
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
    doc.rect(12, y - 5.5, W - 24, ROW_H, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');

    const ecart = ligne.ecart ?? 0;
    const ecartColor: [number,number,number] =
      ecart > 0 ? C_VERT : ecart < 0 ? C_ROUGE : [33, 33, 33];

    doc.setTextColor(...C_BLEU); doc.setFont('helvetica', 'bold');
    doc.text(truncate(ligne.medicament_nom, 22), COLS[0].x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(truncate(ligne.dci || '—', 16),                 COLS[1].x, y);
    doc.text(String(ligne.quantite_theorique),                COLS[2].x, y);
    doc.text(String(ligne.quantite_physique ?? '—'),          COLS[3].x, y);
    doc.setTextColor(...ecartColor); doc.setFont('helvetica', 'bold');
    doc.text(ecart !== 0 ? (ecart > 0 ? '+' : '') + String(ecart) : '0', COLS[4].x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(truncate(ligne.justification || '—', 60),        COLS[5].x, y);
    y += ROW_H;
  });

  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p); addHF(p, totalPg);
  }

  const slug = `${annee}-${String(MOIS_NOMS.indexOf(moisNom) + 1).padStart(2, '0')}`;
  doc.save(`inventaire-physique-${slug}.pdf`);
  toast.success(`PDF exporté (${totalPg} page(s)) !`);
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function InventairePhysiquePage() {
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const now         = new Date();

  const [sessions,      setSessions]      = useState<any[]>([]);
  const [sessionActive, setSessionActive] = useState<any | null>(null);
  const [lignes,        setLignes]        = useState<LigneInventaire[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [validating,    setValidating]    = useState(false);
  const [error,         setError]         = useState('');
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filtres
  const [filtreAnnee, setFiltreAnnee]   = useState(now.getFullYear());
  const [filtreMois,  setFiltreMois]    = useState(now.getMonth() + 1);

  // Session visualisée (détail d'une session clôturée)
  const [sessionVue,    setSessionVue]  = useState<any | null>(null);
  const [lignesVue,     setLignesVue]   = useState<LigneInventaire[]>([]);
  const [detailOpen,    setDetailOpen]  = useState(false);

  const userName = user ? `${user.prenom} ${user.nom}` : 'Administrateur';

  // Années disponibles (2024 → année actuelle)
  const anneesDisponibles = Array.from(
    { length: now.getFullYear() - 2023 },
    (_, i) => 2024 + i,
  );

  // ── Charger les sessions ───────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await inventaireService.getAll();
      const data = Array.isArray(res.data) ? res.data : [];
      setSessions(data);

      const enCours = data.find((s: any) => s.statut === 'EN_COURS');
      if (enCours) {
        const detail = await inventaireService.getById(enCours.id);
        setSessionActive(detail.data);
        setLignes((detail.data.lignes || []).map((l: LigneInventaire) => ({
          ...l,
          quantite_physique: l.quantite_physique ?? l.quantite_theorique,
          justification:     l.justification ?? '',
        })));
      } else {
        setSessionActive(null);
        setLignes([]);
      }
    } catch { setError('Erreur de chargement.'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Sessions filtrées ──────────────────────────────────────────────────────
  const sessionsFiltrees = sessions.filter(s => {
    const d = new Date(s.date_debut);
    return d.getFullYear() === filtreAnnee && (d.getMonth() + 1) === filtreMois;
  });

  const sessionsDuMoisActuel = sessions.filter(s => {
    const d = new Date(s.date_debut);
    return d.getFullYear() === now.getFullYear() && (d.getMonth() + 1) === (now.getMonth() + 1);
  });

  // Peut-on modifier un inventaire clôturé ? (dans les 3 jours)
  const peutModifier = (session: any) => {
    if (session.statut !== 'CLOTURE') return false;
    const fin  = session.date_fin ? new Date(session.date_fin) : new Date();
    const diff = (Date.now() - fin.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleInitier = async () => {
    setSaving(true);
    try {
      await inventaireService.initier();
      toast.success('Inventaire initié !');
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur.');
    } finally { setSaving(false); }
  };

  const updateLigne = (index: number, field: string, value: any) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      if (field === 'quantite_physique') {
        updated.ecart = Number(value) - l.quantite_theorique;
      }
      return updated;
    }));
  };

  const handleSaisir = async () => {
    if (!sessionActive) return;
    setSaving(true);
    try {
      await inventaireService.saisirLignes(sessionActive.id, lignes);
      toast.success('Quantités enregistrées.');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur de saisie.');
    } finally { setSaving(false); }
  };

  const handleValider = async () => {
    if (!sessionActive) return;
    const lignesAvecEcartSansJustif = lignes.filter(
      l => l.ecart !== 0 && l.ecart !== null && !l.justification?.trim()
    );
    if (lignesAvecEcartSansJustif.length > 0) {
      toast.error(`Justification manquante pour : ${lignesAvecEcartSansJustif.map(l => l.medicament_nom).join(', ')}`);
      return;
    }
    setValidating(true);
    try {
      await inventaireService.valider(sessionActive.id, lignes);
      toast.success('✅ Inventaire validé et stock régularisé !', { duration: 5000 });
      setSessionActive(null);
      setLignes([]);
      fetchSessions();
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur de validation.');
    } finally { setValidating(false); }
  };

  const handleVoirDetail = async (session: any) => {
    try {
      const res = await inventaireService.getById(session.id);
      setSessionVue(session);
      setLignesVue(res.data.lignes || []);
      setDetailOpen(true);
    } catch {
      toast.error('Erreur de chargement du détail.');
    }
  };

  const handleExportSession = async (session: any) => {
    setExportLoading(true);
    try {
      const res    = await inventaireService.getById(session.id);
      const lignesSession = res.data.lignes || [];
      const d      = new Date(session.date_debut);
      await exportInventairePhysiquePDF(
        session, lignesSession,
        MOIS_NOMS[d.getMonth()], d.getFullYear(), userName
      );
    } catch {
      toast.error('Erreur export PDF.');
    } finally { setExportLoading(false); }
  };

  const handleExportActuel = async () => {
    if (!sessionActive) return;
    setExportLoading(true);
    try {
      await exportInventairePhysiquePDF(
        sessionActive, lignes,
        MOIS_NOMS[now.getMonth()], now.getFullYear(), userName
      );
    } catch {
      toast.error('Erreur export PDF.');
    } finally { setExportLoading(false); }
  };

  const ecartColor = (ecart: number | null) => {
    if (ecart === null) return 'text.secondary';
    if (ecart > 0) return '#2E7D32';
    if (ecart < 0) return '#C62828';
    return '#2E7D32';
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Retour inventaire">
            <IconButton onClick={() => navigate('/admin/inventaire')} sx={{ color: '#1565C0' }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#0D47A1">Inventaire Physique</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Comptez, saisissez et régularisez votre stock réel.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {sessionActive && (
            <Button variant="outlined"
              startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdf />}
              onClick={handleExportActuel} disabled={exportLoading}
              sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#FFCDD2', color: '#C62828', fontWeight: 600 }}>
              Exporter PDF
            </Button>
          )}
          {!sessionActive && (
            <Button variant="contained" startIcon={<PlayArrow />}
              onClick={handleInitier} disabled={saving}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
              {saving ? 'Initialisation...' : 'Initier un inventaire'}
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Session en cours */}
      {sessionActive && (
        <>
          <Card elevation={0} sx={{ border: '1px solid #FFB74D', borderRadius: 3, p: 2, mb: 3,
            bgcolor: '#FFF8E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography fontWeight={700} color="#E65100" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ fontSize: 18 }} />
                Inventaire #{sessionActive.id} — EN COURS
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Initié le {new Date(sessionActive.date_debut).toLocaleString('fr-FR')} par {sessionActive.initie_par}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<Save />}
                onClick={handleSaisir} disabled={saving}
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#1565C0', color: '#1565C0' }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="contained" startIcon={<CheckCircle />}
                onClick={() => setConfirmOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
                  background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
                Valider & Clôturer
              </Button>
            </Box>
          </Card>

          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Saisissez les quantités physiques. Une justification est obligatoire pour tout écart non nul.
          </Alert>

          {/* Tableau saisie */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F0F7FF' }}>
                  {['Médicament', 'DCI', 'Qté théorique', 'Qté physique', 'Écart', 'Justification'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#455A64',
                      textTransform: 'uppercase', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.map((ligne, i) => (
                  <TableRow key={ligne.medicament_id} hover
                    sx={{ bgcolor: ligne.ecart !== null && ligne.ecart !== 0 ? '#FFF8F8' : 'inherit' }}>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600} color="#0D47A1">
                        {ligne.medicament_nom}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={12} color="text.secondary">{ligne.dci}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600} color="#1565C0">
                        {ligne.quantite_theorique}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number"
                        value={ligne.quantite_physique ?? ''}
                        onChange={e => updateLigne(i, 'quantite_physique', Number(e.target.value))}
                        inputProps={{ min: 0 }}
                        sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </TableCell>
                    <TableCell>
                      {ligne.ecart !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography fontSize={13} fontWeight={700} color={ecartColor(ligne.ecart)}>
                            {ligne.ecart > 0 ? '+' : ''}{ligne.ecart}
                          </Typography>
                          {ligne.ecart !== 0 && <Warning sx={{ fontSize: 14, color: '#F57F17' }} />}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {ligne.ecart !== null && ligne.ecart !== 0 ? (
                        <TextField size="small" fullWidth
                          placeholder="Justification obligatoire..."
                          value={ligne.justification}
                          onChange={e => updateLigne(i, 'justification', e.target.value)}
                          error={!ligne.justification?.trim()}
                          helperText={!ligne.justification?.trim() ? 'Requis' : ''}
                          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Aucun inventaire en cours */}
      {!sessionActive && (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 4, textAlign: 'center', mb: 3 }}>
          <Inventory2 sx={{ fontSize: 56, color: '#90CAF9', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="#0D47A1" sx={{ mb: 1 }}>
            Aucun inventaire en cours
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Initiez une session d'inventaire pour commencer la saisie des quantités physiques.
          </Typography>
          <Button variant="contained" startIcon={<PlayArrow />}
            onClick={handleInitier} disabled={saving}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            Initier un inventaire physique
          </Button>
        </Card>
      )}

      {/* ── Historique des inventaires avec filtres ──────────────────────────── */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList sx={{ color: '#1565C0', fontSize: 20 }} />
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Historique des inventaires
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Mois</InputLabel>
              <Select value={filtreMois} label="Mois"
                onChange={e => setFiltreMois(Number(e.target.value))} sx={{ borderRadius: 2 }}>
                {MOIS_NOMS.map((m, i) => (
                  <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Année</InputLabel>
              <Select value={filtreAnnee} label="Année"
                onChange={e => setFiltreAnnee(Number(e.target.value))} sx={{ borderRadius: 2 }}>
                {anneesDisponibles.map(a => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {sessionsFiltrees.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              Aucun inventaire pour {MOIS_NOMS[filtreMois - 1]} {filtreAnnee}.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                {['#', 'Initié par', 'Début', 'Fin', 'Statut', 'Modification', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#546E7A',
                    textTransform: 'uppercase', py: 1.5 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sessionsFiltrees.map(s => {
                const modifiable = peutModifier(s);
                return (
                  <TableRow key={s.id} hover>
                    <TableCell>#{s.id}</TableCell>
                    <TableCell>{s.initie_par}</TableCell>
                    <TableCell>{new Date(s.date_debut).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>
                      {s.date_fin ? new Date(s.date_fin).toLocaleString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell>
                      {s.statut === 'CLOTURE' ? (
                        <Chip label="Clôturé" size="small"
                          sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }} />
                      ) : s.statut === 'EN_COURS' ? (
                        <Chip label="En cours" size="small"
                          sx={{ bgcolor: '#FFF8E1', color: '#E65100', fontWeight: 700 }} />
                      ) : (
                        <Chip label={s.statut} size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {s.statut === 'CLOTURE' && (
                        <Chip
                          label={modifiable ? '✏️ Modifiable (< 3j)' : '🔒 Fermé'}
                          size="small"
                          sx={{
                            bgcolor: modifiable ? '#E3F2FD' : '#F5F5F5',
                            color:   modifiable ? '#1565C0' : '#9E9E9E',
                            fontWeight: 600, fontSize: 11,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Voir le détail">
                          <IconButton size="small" sx={{ color: '#2196F3' }}
                            onClick={() => handleVoirDetail(s)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger PDF">
                          <IconButton size="small" sx={{ color: '#C62828' }}
                            onClick={() => handleExportSession(s)} disabled={exportLoading}>
                            {exportLoading ? <CircularProgress size={16} /> : <Download fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Dialog Confirmation validation ──────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} color="#0D47A1">Confirmer la validation</Typography>
          <IconButton onClick={() => setConfirmOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Cette action est irréversible. Le stock sera régularisé selon les quantités saisies.
          </Alert>
          <Typography fontSize={14} color="text.secondary" sx={{ mb: 1 }}>
            Écarts détectés : <strong>{lignes.filter(l => l.ecart !== 0 && l.ecart !== null).length}</strong> médicament(s)
          </Typography>
          {lignes.filter(l => l.ecart !== 0 && l.ecart !== null).map(l => (
            <Box key={l.medicament_id} sx={{ display: 'flex', justifyContent: 'space-between',
              mt: 1, p: 1, bgcolor: '#FFF3E0', borderRadius: 1 }}>
              <Typography fontSize={13} fontWeight={600}>{l.medicament_nom}</Typography>
              <Typography fontSize={13} color={ecartColor(l.ecart)} fontWeight={700}>
                {(l.ecart ?? 0) > 0 ? '+' : ''}{l.ecart}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}>
            Annuler
          </Button>
          <Button onClick={handleValider} variant="contained" disabled={validating}
            startIcon={validating ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
            {validating ? 'Validation...' : 'Confirmer et valider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Détail session ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} color="#0D47A1">
            Inventaire #{sessionVue?.id} — {sessionVue && MOIS_NOMS[new Date(sessionVue.date_debut).getMonth()]} {sessionVue && new Date(sessionVue.date_debut).getFullYear()}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={() => sessionVue && handleExportSession(sessionVue)}
              sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#FFCDD2', color: '#C62828' }}>
              PDF
            </Button>
            <IconButton onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F0F7FF' }}>
                {['Médicament', 'DCI', 'Qté théorique', 'Qté physique', 'Écart', 'Justification'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#455A64', textTransform: 'uppercase' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {lignesVue.map(ligne => (
                <TableRow key={ligne.medicament_id} hover
                  sx={{ bgcolor: ligne.ecart !== null && ligne.ecart !== 0 ? '#FFF8F8' : 'inherit' }}>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600} color="#0D47A1">{ligne.medicament_nom}</Typography>
                  </TableCell>
                  <TableCell><Typography fontSize={12} color="text.secondary">{ligne.dci}</Typography></TableCell>
                  <TableCell><Typography fontSize={13} fontWeight={600} color="#1565C0">{ligne.quantite_theorique}</Typography></TableCell>
                  <TableCell><Typography fontSize={13}>{ligne.quantite_physique ?? '—'}</Typography></TableCell>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={700} color={ecartColor(ligne.ecart)}>
                      {ligne.ecart !== null ? (ligne.ecart > 0 ? '+' : '') + ligne.ecart : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography fontSize={12} color="text.secondary">{ligne.justification || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Box>
  );
}