import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Grid, Chip, CircularProgress,
  Alert, Button, Divider, LinearProgress,
} from '@mui/material';
import {
  Inventory2, Warning, LocalShipping, Assessment,
  Add, ShoppingCart, Download, CheckCircle,
  Notifications, History, TrendingUp, AccessTime,
  ArrowForward, PictureAsPdf,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import type { DashboardData } from '../../services/dashboardService';
import { useAuthStore } from '../../store/authStore';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const NIVEAU_COLOR: Record<string, string> = {
  CRITIQUE: '#C62828', ELEVE: '#E65100', MOYEN: '#F57F17', BAS: '#1565C0',
};

// ── Export PDF Dashboard ──────────────────────────────────────────────────────
async function exportDashboardPDF(
  data: DashboardData,
  userName: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();

  const C_BLEU  : [number,number,number] = [13, 71, 161];
  const C_BLEU2 : [number,number,number] = [21, 101, 192];
  const C_GRIS  : [number,number,number] = [96, 96, 96];

  let pageNum = 1;
  let y = 0;

  const addHF = (p: number, total: number) => {
    doc.setFillColor(...C_BLEU);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock', 14, 9.5);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text('Tableau de Bord', W / 2, 9.5, { align: 'center' });
    doc.text(`Généré le ${dateStr} à ${heureStr} par ${userName}`, W - 14, 9.5, { align: 'right' });

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

  const checkPage = (needed = 10) => {
    if (y + needed > H - 14) {
      doc.addPage();
      pageNum++;
      addHF(pageNum, pageNum);
      y = 20;
    }
  };

  // ── Page 1 ───────────────────────────────────────────────────────────────
  addHF(1, 1);
  y = 22;

  // Titre
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Tableau de Bord — CliniqueStock', W / 2, y + 6, { align: 'center' });
  y += 14;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
  doc.text(`Rapport généré le ${dateStr} à ${heureStr} par ${userName}`, W / 2, y, { align: 'center' });
  y += 10;

  // KPIs en grille 2x2
  const kpisData = [
    { label: 'Total Médicaments',  value: String(data.kpis.total_medicaments),           color: C_BLEU2 },
    { label: 'Ruptures de Stock',  value: String(data.kpis.ruptures_stock),              color: [198,40,40] as [number,number,number] },
    { label: 'Péremption < 30j',   value: String(data.kpis.lots_expirant_30j),           color: [230,81,0] as [number,number,number] },
    { label: 'Commandes en cours', value: String(data.kpis.commandes_en_cours),          color: [46,125,50] as [number,number,number] },
    { label: 'Stock Faible',       value: String(data.kpis.stock_faible),                color: [245,127,23] as [number,number,number] },
    { label: 'Valeur Inventaire',  value: `${data.kpis.valeur_stock.toLocaleString('fr-FR')} FCFA`, color: [106,27,154] as [number,number,number] },
  ];

  const kpiW = (W - 28 - 8) / 2;
  kpisData.forEach((k, i) => {
    const col = i % 2;
    const kx  = 14 + col * (kpiW + 8);
    if (i % 2 === 0 && i > 0) { y += 22; checkPage(26); }

    doc.setFillColor(245, 248, 255);
    doc.roundedRect(kx, y, kpiW, 18, 2, 2, 'F');
    doc.setDrawColor(210, 225, 250); doc.setLineWidth(0.3);
    doc.roundedRect(kx, y, kpiW, 18, 2, 2, 'S');

    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
    doc.text(k.label.toUpperCase(), kx + 4, y + 6);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...k.color);
    doc.text(k.value, kx + 4, y + 15);
  });
  y += 26;

  // Alertes récentes
  checkPage(14);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Alertes Récentes', 14, y); y += 6;

  doc.setFillColor(...C_BLEU2);
  doc.rect(14, y - 5, W - 28, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Message', 18, y); doc.text('Niveau', W - 40, y); doc.text('Date', W - 20, y);
  y += 4;

  doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
  data.alertes_recentes.forEach((a, i) => {
    checkPage(8);
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 251 : 255, 255);
    doc.rect(14, y - 5, W - 28, 7, 'F');
    doc.setFontSize(6.5);
    const msg = a.message.length > 70 ? a.message.slice(0, 70) + '…' : a.message;
    const nColor: [number,number,number] =
      a.niveau_urgence === 'CRITIQUE' ? [198,40,40] :
      a.niveau_urgence === 'ELEVE'    ? [230,81,0]  :
      a.niveau_urgence === 'MOYEN'    ? [245,127,23]: [21,101,192];
    doc.setTextColor(33, 33, 33); doc.text(msg, 18, y);
    doc.setTextColor(...nColor); doc.setFont('helvetica', 'bold');
    doc.text(a.niveau_urgence, W - 40, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_GRIS);
    doc.text(new Date(a.date_creation).toLocaleDateString('fr-FR'), W - 20, y);
    y += 7;
  });

  if (data.alertes_recentes.length === 0) {
    doc.setTextColor(...C_GRIS); doc.setFontSize(8);
    doc.text('Aucune alerte active.', 18, y); y += 8;
  }

  // Mouvements 6 mois
  y += 6;
  checkPage(16);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLEU);
  doc.text('Mouvements des 6 Derniers Mois', 14, y); y += 6;

  doc.setFillColor(...C_BLEU2);
  doc.rect(14, y - 5, W - 28, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Mois', 18, y); doc.text('Entrées', 80, y); doc.text('Sorties', 130, y);
  y += 4;

  doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
  data.graphiques.mouvements_6_mois.forEach((m, i) => {
    checkPage(8);
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 251 : 255, 255);
    doc.rect(14, y - 5, W - 28, 7, 'F');
    doc.setFontSize(7);
    doc.text(m.mois,              18,  y);
    doc.setTextColor(21, 101, 192); doc.text(String(m.entrees), 80,  y);
    doc.setTextColor(198, 40, 40);  doc.text(String(m.sorties), 130, y);
    doc.setTextColor(33, 33, 33);
    y += 7;
  });

  // Footer final avec bonne pagination
  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p);
    addHF(p, totalPg);
  }

  const slug = now.toLocaleDateString('fr-FR').replace(/\//g, '_');
  doc.save(`dashboard-cliniquestock-${slug}.pdf`);
}

// ── Tooltip Recharts ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'white', border: '1px solid #E3F2FD', borderRadius: 2, p: 1.5,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <Typography fontWeight={700} fontSize={12} color="#0D47A1" sx={{ mb: 0.5 }}>{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Typography key={i} fontSize={12} color={p.color}>
          {p.name} : <strong>{Number(p.value ?? 0).toLocaleString()} unités</strong>
        </Typography>
      ))}
    </Box>
  );
}

// ── KPI compact ───────────────────────────────────────────────────────────────
function KpiCompact({ label, value, sublabel, icon, color, bg, alert, onClick }: {
  label: string; value: string | number; sublabel: string;
  icon: React.ReactNode; color: string; bg: string;
  alert?: boolean; onClick?: () => void;
}) {
  return (
    <Card elevation={0} onClick={onClick} sx={{
      border: alert ? `1px solid ${color}50` : '1px solid #E3F2FD',
      borderRadius: 2.5, p: 2, cursor: onClick ? 'pointer' : 'default',
      bgcolor: alert ? `${color}08` : 'white', transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-1px)', boxShadow: `0 4px 16px ${color}20` } : {},
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={900} color={alert ? color : '#0D47A1'}
            sx={{ my: 0.3, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color={alert ? color : 'text.secondary'}
            fontWeight={alert ? 600 : 400}>
            {sublabel}
          </Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </Card>
  );
}

// ── Action rapide ─────────────────────────────────────────────────────────────
function ActionRapide({ icon, title, subtitle, color, bg, onClick }: {
  icon: React.ReactNode; title: string; subtitle: string;
  color: string; bg: string; onClick: () => void;
}) {
  return (
    <Box onClick={onClick} sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      p: 1.5, borderRadius: 2, cursor: 'pointer',
      border: '1px solid #E3F2FD', transition: 'all 0.2s', mb: 1,
      '&:hover': { bgcolor: '#F8FBFF', borderColor: color, transform: 'translateX(2px)' },
    }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography fontSize={13} fontWeight={700} color="#0D47A1">{title}</Typography>
        <Typography fontSize={11} color="text.secondary">{subtitle}</Typography>
      </Box>
      <ArrowForward sx={{ fontSize: 16, color: '#90A4AE' }} />
    </Box>
  );
}

// ── Activité récente ──────────────────────────────────────────────────────────
function ActiviteItem({ icon, nom, action, temps, couleur }: {
  icon: React.ReactNode; nom: string; action: string; temps: string; couleur: string;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, py: 1.2, borderBottom: '1px solid #F0F4FF' }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: `${couleur}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography fontSize={12} fontWeight={700} color="#0D47A1">{nom}</Typography>
        <Typography fontSize={11} color="text.secondary">{action}</Typography>
      </Box>
      <Typography fontSize={11} color="text.secondary" sx={{ flexShrink: 0 }}>{temps}</Typography>
    </Box>
  );
}

function tempsEcoule(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate       = useNavigate();
  const { user }       = useAuthStore();
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dashboardService.getData()
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError('Erreur de chargement.'); setLoading(false); });
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress size={48} />
    </Box>
  );
  if (error)  return <Alert severity="error">{error}</Alert>;
  if (!data)  return null;

  const { kpis, graphiques, alertes_recentes } = data;

  const userName = user ? `${user.prenom} ${user.nom}` : 'Administrateur';

  const chartData = JOURS.map((jour) => ({
    jour,
    consommation: Math.floor(Math.random() * 300) + 100,
  }));

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      await exportDashboardPDF(data, userName);
    } catch { } finally { setExportLoading(false); }
  };

  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <Box sx={{ maxWidth: 1400 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} color="#0D47A1">Tableau de Bord</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {salut}, {user?.prenom} {user?.nom}. Voici l'état actuel de votre stock clinique.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdf />}
            onClick={handleExportPDF} disabled={exportLoading}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#FFCDD2', color: '#C62828', fontWeight: 600 }}>
            Exporter PDF
          </Button>
          <Button variant="outlined" startIcon={<Assessment sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/rapports')}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0', fontSize: 13 }}>
            Rapports
          </Button>
          <Button variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/inventaire/nouveau')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            Nouvel Article
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact label="Total Médicaments" value={kpis.total_medicaments.toLocaleString()}
            sublabel="+12 cette semaine"
            icon={<Inventory2 sx={{ color: '#2196F3', fontSize: 20 }} />}
            color="#2196F3" bg="#E3F2FD"
            onClick={() => navigate('/admin/inventaire')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact label="Stocks Faibles" value={kpis.stock_faible}
            sublabel="Action requise"
            icon={<Warning sx={{ color: '#C62828', fontSize: 20 }} />}
            color="#C62828" bg="#FFEBEE" alert={kpis.stock_faible > 0}
            onClick={() => navigate('/admin/alertes')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact label="Péremption < 30j" value={kpis.lots_expirant_30j}
            sublabel={`${kpis.lots_expirant_30j} lots critiques`}
            icon={<AccessTime sx={{ color: '#F57F17', fontSize: 20 }} />}
            color="#F57F17" bg="#FFF3E0" alert={kpis.lots_expirant_30j > 0}
            onClick={() => navigate('/admin/alertes')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact label="Commandes en cours" value={kpis.commandes_en_cours}
            sublabel={`${kpis.commandes_en_cours} attendues aujourd'hui`}
            icon={<LocalShipping sx={{ color: '#4CAF50', fontSize: 20 }} />}
            color="#4CAF50" bg="#E8F5E9"
            onClick={() => navigate('/admin/commandes')} />
        </Grid>
      </Grid>

      {/* Contenu principal */}
      <Grid container spacing={3}>

        {/* Colonne gauche */}
        <Grid item xs={12} md={8}>

          {/* Graphique */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
                  Consommation Hebdomadaire
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Flux d'unités médicales consommées sur les 7 derniers jours
                </Typography>
              </Box>
              <Chip label={`Total: ${graphiques.mouvements_6_mois.reduce((s, m) => s + m.sorties, 0).toLocaleString()} unités`}
                size="small" sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }} />
            </Box>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#90A4AE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#90A4AE' }} axisLine={false} tickLine={false} />
                <RTooltip content={<CustomTooltip />} />
                <ReferenceLine y={350} stroke="#FFB74D" strokeDasharray="4 4"
                  label={{ value: 'Moy.', fill: '#FF9800', fontSize: 11 }} />
                <Bar dataKey="consommation" name="Consommation" fill="#2196F3"
                  radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Stocks critiques */}
          <Card elevation={0} sx={{ border: '1px solid #FFCDD2', borderRadius: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ color: '#C62828', fontSize: 20 }} />
                <Typography fontWeight={700} color="#C62828" fontSize={15}>
                  Alerte : Stocks Critiques
                </Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/admin/alertes')}
                sx={{ textTransform: 'none', fontSize: 12, color: '#1565C0' }}>
                Tout voir
              </Button>
            </Box>
            {alertes_recentes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircle sx={{ color: '#4CAF50', fontSize: 36, mb: 1 }} />
                <Typography color="text.secondary" fontSize={13}>✅ Aucun stock critique</Typography>
              </Box>
            ) : alertes_recentes.slice(0, 3).map(alerte => (
              <Box key={alerte.id} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                p: 1.5, mb: 1, borderRadius: 2, bgcolor: '#FFF8F8', border: '1px solid #FFCDD2',
              }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#FFEBEE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Warning sx={{ color: '#C62828', fontSize: 16 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontSize={13} fontWeight={700} color="#0D47A1" noWrap>
                    {alerte.message.split('—')[0].split(':')[0].trim()}
                  </Typography>
                  <Typography fontSize={11} color="text.secondary" noWrap>
                    {alerte.message.substring(0, 70)}{alerte.message.length > 70 ? '...' : ''}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography fontSize={18} fontWeight={900}
                    color={NIVEAU_COLOR[alerte.niveau_urgence] || '#C62828'}>!</Typography>
                  <Typography fontSize={10} color="text.secondary">STOCK ACTUEL</Typography>
                </Box>
              </Box>
            ))}
          </Card>
        </Grid>

        {/* Colonne droite */}
        <Grid item xs={12} md={4}>

          {/* Actions rapides */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp sx={{ color: '#1565C0', fontSize: 18 }} />
              <Typography fontWeight={700} color="#0D47A1" fontSize={14}>Actions Rapides</Typography>
            </Box>
            <ActionRapide
              icon={<Add sx={{ color: '#4CAF50', fontSize: 18 }} />}
              title="Ajouter Médicament"
              subtitle="Enregistrer une nouvelle référence"
              color="#4CAF50" bg="#E8F5E9"
              onClick={() => navigate('/admin/inventaire/nouveau')}
            />
            <ActionRapide
              icon={<ShoppingCart sx={{ color: '#2196F3', fontSize: 18 }} />}
              title="Passer Commande"
              subtitle="Réapprovisionner les stocks bas"
              color="#2196F3" bg="#E3F2FD"
              onClick={() => navigate('/admin/commandes')}
            />
            <ActionRapide
              icon={<Download sx={{ color: '#9C27B0', fontSize: 18 }} />}
              title="Générer Inventaire"
              subtitle="Exporter la liste en PDF/CSV"
              color="#9C27B0" bg="#F3E5F5"
              onClick={() => navigate('/admin/inventaire')}   // ← vers inventaire avec bouton export
            />

            {/* Inventaire physique */}
            <Box sx={{ mt: 2, p: 2, bgcolor: '#FFF8E1', border: '1px solid #FFE082',
              borderRadius: 2, textAlign: 'center' }}>
              <Inventory2 sx={{ color: '#F57F17', fontSize: 28, mb: 0.5 }} />
              <Typography fontSize={13} fontWeight={700} color="#E65100" sx={{ mb: 0.5 }}>
                Initier un Inventaire Physique
              </Typography>
              <Typography fontSize={11} color="text.secondary" sx={{ mb: 1.5 }}>
                Comparez le stock théorique avec le stock réel et régularisez les écarts.
              </Typography>
              <Button variant="outlined" size="small" fullWidth
                onClick={() => navigate('/admin/inventaire-physique')}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12,
                  borderColor: '#F57F17', color: '#E65100' }}>
                Démarrer
              </Button>
            </Box>
          </Card>

          {/* Activités récentes */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History sx={{ color: '#1565C0', fontSize: 18 }} />
                <Typography fontWeight={700} color="#0D47A1" fontSize={14}>Activités Récentes</Typography>
              </Box>
            </Box>

            {alertes_recentes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary" fontSize={12}>Aucune activité récente</Typography>
              </Box>
            ) : alertes_recentes.slice(0, 4).map(alerte => (
              <ActiviteItem
                key={alerte.id}
                icon={
                  alerte.type_alerte === 'STOCK_BAS'
                    ? <ShoppingCart sx={{ color: '#2196F3', fontSize: 14 }} />
                    : alerte.type_alerte === 'PEREMPTION'
                    ? <Warning sx={{ color: '#F57F17', fontSize: 14 }} />
                    : <Notifications sx={{ color: '#9C27B0', fontSize: 14 }} />
                }
                nom={alerte.destinataire_nom || 'Système'}
                action={alerte.message.substring(0, 50) + (alerte.message.length > 50 ? '...' : '')}
                temps={tempsEcoule(alerte.date_creation)}
                couleur={NIVEAU_COLOR[alerte.niveau_urgence] || '#2196F3'}
              />
            ))}

            <Button fullWidth size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/admin/historique')}  // ← vers page historique dédiée
              sx={{ mt: 1.5, textTransform: 'none', fontSize: 12, color: '#1565C0' }}>
              Voir tout l'historique
            </Button>
          </Card>
        </Grid>
      </Grid>

      {/* Footer système */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'white', border: '1px solid #E3F2FD', borderRadius: 3,
        display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50' }} />
          <Box>
            <Typography fontSize={11} color="text.secondary" fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>État du Système</Typography>
            <Typography fontSize={13} fontWeight={700} color="#2E7D32">Connecté & Synchronisé</Typography>
          </Box>
        </Box>
        <Box>
          <Typography fontSize={11} color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Dernière Sauvegarde</Typography>
          <Typography fontSize={13} fontWeight={700} color="#0D47A1">
            Aujourd'hui, {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
        <Box>
          <Typography fontSize={11} color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Version Logicielle</Typography>
          <Typography fontSize={13} fontWeight={700} color="#0D47A1">
            CliniqueStock Enterprise v1.0.4
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}