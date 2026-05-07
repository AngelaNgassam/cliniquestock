import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, Button, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, IconButton,
  CircularProgress, Alert, Select, MenuItem, FormControl,
  InputLabel, TextField, Tooltip, Grid,
} from '@mui/material';
import {
  PictureAsPdf, Refresh, FilterList,
  History, PersonOutline,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EntreeHistorique {
  id:               number;
  action:           string;
  entite_concernee: string;
  ancienne_valeur:  any;
  nouvelle_valeur:  any;
  date_action:      string;
  utilisateur_nom:  string;
  adresse_ip:       string;
}

type FiltreType =
  | 'aujourd_hui'
  | 'cette_semaine'
  | '7j'
  | '30j'
  | '3_mois'
  | '6_mois'
  | '1_an'
  | '2_ans'
  | 'personnalise';

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_ANNEE   = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                      'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const ACTION_COLOR: Record<string, string> = {
  AJUSTEMENT_INVENTAIRE: '#9C27B0',
  CONNEXION:             '#2196F3',
  CREATION:              '#4CAF50',
  MODIFICATION:          '#FF9800',
  SUPPRESSION:           '#F44336',
  RECEPTION:             '#00BCD4',
  DISPENSATION:          '#FF5722',
  COMMANDE:              '#3F51B5',
  SORTIE:                '#E91E63',
  ENTREE:                '#009688',
};

const COLORS_CHART = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
                      '#F44336', '#00BCD4', '#FF5722', '#3F51B5'];

// ── Utilitaire couleur action ─────────────────────────────────────────────────
function getActionColor(action: string): string {
  const upper = action.toUpperCase();
  for (const [key, color] of Object.entries(ACTION_COLOR)) {
    if (upper.includes(key)) return color;
  }
  return '#607D8B';
}

// ── Export PDF historique ─────────────────────────────────────────────────────
async function exportHistoriquePDF(
  historique: EntreeHistorique[],
  filtreLabel: string,
  userName: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const C_BLEU : [number,number,number] = [13, 71, 161];
  const C_BLEU2: [number,number,number] = [21, 101, 192];
  const C_GRIS : [number,number,number] = [96, 96, 96];

  let pageNum = 1;
  let y = 0;

  const addHF = (p: number, total: number) => {
    doc.setFillColor(...C_BLEU);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock — Historique des Activités', 14, 9.5);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(
      `Filtre : ${filtreLabel}  |  Généré le ${dateStr} à ${heureStr} par ${userName}`,
      W - 14, 9.5, { align: 'right' }
    );
    doc.setFillColor(245, 248, 255);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.2);
    doc.line(0, H - 10, W, H - 10);
    doc.setTextColor(...C_GRIS); doc.setFontSize(7);
    doc.text('CliniqueStock — Document confidentiel', 14, H - 4);
    doc.text(`Page ${p} / ${total}`, W / 2, H - 4, { align: 'center' });
    doc.text(dateStr, W - 14, H - 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const COLS = [
    { label: 'Date & Heure',     x: 14  },
    { label: 'Utilisateur',      x: 49  },
    { label: 'Action',           x: 88  },
    { label: 'Entité concernée', x: 135 },
    { label: 'Détail',           x: 185 },
  ];
  const ROW_H = 8;

  const drawHeader = () => {
    doc.setFillColor(...C_BLEU2);
    doc.rect(12, y - 5.5, W - 24, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
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
      drawHeader();
    }
  };

  // Page 1
  addHF(1, 1);
  y = 22;

  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Historique des Activités — CliniqueStock', W / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  doc.text(
    `Période : ${filtreLabel}  •  ${historique.length} entrée(s)  •  Généré le ${dateStr} à ${heureStr}`,
    W / 2, y, { align: 'center' }
  );
  y += 8;
  drawHeader();

  const truncate = (s: string, max: number) =>
    s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '—');

  historique.forEach((h, idx) => {
    checkPage();
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
    doc.rect(12, y - 5.5, W - 24, ROW_H, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');

    const dateAction = new Date(h.date_action).toLocaleString('fr-FR');
    const detail = h.nouvelle_valeur
      ? JSON.stringify(h.nouvelle_valeur).slice(0, 55)
      : '—';

    doc.setTextColor(...C_GRIS);
    doc.text(truncate(dateAction, 20), COLS[0].x, y);
    doc.setTextColor(13, 71, 161);
    doc.text(truncate(h.utilisateur_nom || 'Système', 18), COLS[1].x, y);
    doc.setTextColor(33, 33, 33);
    doc.text(truncate(h.action, 26), COLS[2].x, y);
    doc.text(truncate(h.entite_concernee, 30), COLS[3].x, y);
    doc.setTextColor(...C_GRIS);
    doc.text(truncate(detail, 48), COLS[4].x, y);
    y += ROW_H;
  });

  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p);
    addHF(p, totalPg);
  }

  const slug = dateStr.replace(/\//g, '_');
  doc.save(`historique-cliniquestock-${slug}.pdf`);
  toast.success(`PDF exporté (${totalPg} page(s)) !`);
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function HistoriquePage() {
  const { user } = useAuthStore();

  // ✅ TOUS les useState sont ici, DANS le composant
  const [historique,             setHistorique]             = useState<EntreeHistorique[]>([]);
  const [loading,                setLoading]                = useState(true);
  const [error,                  setError]                  = useState('');
  const [filtre,                 setFiltre]                 = useState<FiltreType>('aujourd_hui');
  const [dateDebut,              setDateDebut]              = useState('');
  const [dateFin,                setDateFin]                = useState('');
  const [filtreJour,             setFiltreJour]             = useState('');
  const [filtreMois,             setFiltreMois]             = useState('');
  const [exportLoading,          setExportLoading]          = useState(false);
  const [totalUtilisateursActifs, setTotalUtilisateursActifs] = useState(0); // ✅ ici, pas en dehors

  // ── Calcul des dates selon le filtre ─────────────────────────────────────
  const getDateRange = useCallback(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fmt   = (d: Date) => d.toISOString().slice(0, 10);

    switch (filtre) {
      case 'aujourd_hui': {
        return { debut: fmt(today), fin: fmt(today) };
      }
      case 'cette_semaine': {
        const lundi = new Date(today);
        lundi.setDate(today.getDate() - (today.getDay() || 7) + 1);
        return { debut: fmt(lundi), fin: fmt(today) };
      }
      case '7j': {
        const d = new Date(today); d.setDate(d.getDate() - 7);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case '30j': {
        const d = new Date(today); d.setDate(d.getDate() - 30);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case '3_mois': {
        const d = new Date(today); d.setMonth(d.getMonth() - 3);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case '6_mois': {
        const d = new Date(today); d.setMonth(d.getMonth() - 6);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case '1_an': {
        const d = new Date(today); d.setFullYear(d.getFullYear() - 1);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case '2_ans': {
        const d = new Date(today); d.setFullYear(d.getFullYear() - 2);
        return { debut: fmt(d), fin: fmt(today) };
      }
      case 'personnalise': {
        return { debut: dateDebut, fin: dateFin };
      }
      default:
        return { debut: fmt(today), fin: fmt(today) };
    }
  }, [filtre, dateDebut, dateFin]);

  const getFiltreLabel = useCallback(() => {
    const labels: Record<FiltreType, string> = {
      aujourd_hui:   "Aujourd'hui",
      cette_semaine: 'Cette semaine',
      '7j':          '7 derniers jours',
      '30j':         '30 derniers jours',
      '3_mois':      '3 derniers mois',
      '6_mois':      '6 derniers mois',
      '1_an':        '1 an',
      '2_ans':       '2 ans',
      personnalise:  `Du ${dateDebut} au ${dateFin}`,
    };
    return labels[filtre] || filtre;
  }, [filtre, dateDebut, dateFin]);

  // ── Charger l'historique ──────────────────────────────────────────────────
  const fetchHistorique = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { debut, fin } = getDateRange();
      const params = new URLSearchParams();
      if (debut)      params.append('date_debut',   debut);
      if (fin)        params.append('date_fin',      fin);
      if (filtreJour) params.append('jour_semaine',  filtreJour);
      if (filtreMois) params.append('mois',          filtreMois);

      const res     = await api.get(`/journal-audit/?${params}`);
      const data    = res.data;
      const entries: EntreeHistorique[] = Array.isArray(data) ? data : data.results ?? [];
      setHistorique(entries);

      // ✅ Nombre réel d'utilisateurs actifs — tous, pas seulement ceux dans le journal
      try {
        const resUsers = await api.get('/auth/utilisateurs/');
        setTotalUtilisateursActifs(resUsers.data?.stats?.actifs ?? 0);
      } catch {
        // fallback : utilisateurs distincts dans le journal
        setTotalUtilisateursActifs(
          new Set(entries.map(h => h.utilisateur_nom).filter(Boolean)).size
        );
      }
    } catch {
      setError("Erreur lors du chargement de l'historique.");
    } finally {
      setLoading(false);
    }
  }, [getDateRange, filtreJour, filtreMois]);

  useEffect(() => { fetchHistorique(); }, [fetchHistorique]);

  // ── Stats par utilisateur ─────────────────────────────────────────────────
  const statsParUser = Object.entries(
    historique.reduce((acc, h) => {
      const nom = h.utilisateur_nom || 'Système';
      acc[nom]  = (acc[nom] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([nom, count]) => ({ nom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const handleExportPDF = async () => {
    if (historique.length === 0) { toast.error('Aucune donnée à exporter.'); return; }
    setExportLoading(true);
    try {
      const userName = user ? `${user.prenom} ${user.nom}` : 'Administrateur';
      await exportHistoriquePDF(historique, getFiltreLabel(), userName);
    } catch {
      toast.error('Erreur export PDF.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Historique des Activités
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Consultez et filtrez toutes les actions effectuées dans le système.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchHistorique}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
            Actualiser
          </Button>
          <Button variant="contained"
            startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
            onClick={handleExportPDF} disabled={exportLoading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #C62828, #B71C1C)' }}>
            Exporter PDF
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList sx={{ color: '#1565C0', fontSize: 18 }} />
          <Typography fontWeight={700} color="#0D47A1" fontSize={14}>Filtres</Typography>
        </Box>

        {/* Chips de période */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {([
            { value: 'aujourd_hui',   label: "Aujourd'hui" },
            { value: 'cette_semaine', label: 'Cette semaine' },
            { value: '7j',            label: '7 jours' },
            { value: '30j',           label: '30 jours' },
            { value: '3_mois',        label: '3 mois' },
            { value: '6_mois',        label: '6 mois' },
            { value: '1_an',          label: '1 an' },
            { value: '2_ans',         label: '2 ans' },
            { value: 'personnalise',  label: 'Personnalisé' },
          ] as { value: FiltreType; label: string }[]).map(({ value, label }) => (
            <Chip key={value} label={label} onClick={() => setFiltre(value)}
              sx={{
                cursor:     'pointer',
                fontWeight: filtre === value ? 700 : 400,
                bgcolor:    filtre === value ? '#1565C0' : '#F5F5F5',
                color:      filtre === value ? 'white'   : '#546E7A',
              }} />
          ))}
        </Box>

        {/* Dates personnalisées */}
        {filtre === 'personnalise' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField label="Date début" type="date" size="small" value={dateDebut}
              onChange={e => setDateDebut(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Date fin" type="date" size="small" value={dateFin}
              onChange={e => setDateFin(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Button variant="outlined" onClick={fetchHistorique}
              sx={{ borderRadius: 2, textTransform: 'none' }}>
              Appliquer
            </Button>
          </Box>
        )}

        {/* Filtres complémentaires */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Jour de la semaine</InputLabel>
            <Select value={filtreJour} label="Jour de la semaine"
              onChange={e => setFiltreJour(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous les jours</MenuItem>
              {JOURS_SEMAINE.map((j, i) => (
                <MenuItem key={i} value={String(i + 1)}>{j}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Mois</InputLabel>
            <Select value={filtreMois} label="Mois"
              onChange={e => setFiltreMois(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous les mois</MenuItem>
              {MOIS_ANNEE.map((m, i) => (
                <MenuItem key={i} value={String(i + 1)}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPIs résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={900} color="#1565C0">
              {loading ? '…' : historique.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Total activités
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={900} color="#4CAF50">
              {loading ? '…' : totalUtilisateursActifs}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Utilisateurs actifs (système)
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={900} color="#F57F17"
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {loading ? '…' : getFiltreLabel()}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Période sélectionnée
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Graphique utilisateurs les plus actifs */}
      {!loading && statsParUser.length > 0 && (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonOutline sx={{ color: '#1565C0', fontSize: 20 }} />
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Utilisateurs les plus actifs
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statsParUser} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
              <XAxis dataKey="nom" tick={{ fontSize: 11, fill: '#90A4AE' }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#90A4AE' }}
                axisLine={false} tickLine={false} />
              <RTooltip
                formatter={(value: any) => [`${value} action(s)`]}
                labelFormatter={(label: any) => String(label)}
              />
              <Bar dataKey="count" name="Actions" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {statsParUser.map((_, i) => (
                  <Cell key={i} fill={COLORS_CHART[i % COLORS_CHART.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Tableau historique */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F0F7FF' }}>
              {['Date & Heure', 'Utilisateur', 'Action', 'Entité concernée', 'Détail'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#455A64',
                  textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : historique.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <History sx={{ fontSize: 48, color: '#CFD8DC', mb: 1 }} />
                  <Typography color="text.secondary">
                    Aucune activité pour cette période.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : historique.map((h, i) => {
              const actionColor = getActionColor(h.action);
              const detail = h.nouvelle_valeur
                ? JSON.stringify(h.nouvelle_valeur).slice(0, 80)
                : '—';
              return (
                <TableRow key={h.id} hover sx={{
                  '&:hover': { bgcolor: '#F8FBFF' },
                  bgcolor: i % 2 === 0 ? 'white' : '#FAFCFF',
                }}>
                  <TableCell>
                    <Typography fontSize={12} color="#546E7A">
                      {new Date(h.date_action).toLocaleDateString('fr-FR')}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                      {new Date(h.date_action).toLocaleTimeString('fr-FR',
                        { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%', bgcolor: '#E3F2FD',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Typography fontSize={11} fontWeight={700} color="#1565C0">
                          {(h.utilisateur_nom || 'S')[0].toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography fontSize={12} fontWeight={600} color="#0D47A1">
                        {h.utilisateur_nom || 'Système'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={h.action} size="small" sx={{
                      bgcolor:    actionColor + '18',
                      color:      actionColor,
                      fontWeight: 700,
                      fontSize:   11,
                    }} />
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={12} color="#424242">
                      {h.entite_concernee || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={detail} placement="top-start">
                      <Typography fontSize={11} color="#607D8B"
                        sx={{ maxWidth: 250, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {detail}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}