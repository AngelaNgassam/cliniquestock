import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Grid, Chip,
  CircularProgress, Alert, Select, MenuItem,
  FormControl, Divider, LinearProgress,
} from '@mui/material';
import {
  Inventory2, TrendingDown, Warning, LocalShipping,
  AttachMoney, NotificationsActive, ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import type { DashboardData } from '../../services/dashboardService';

const COLORS = ['#2196F3', '#FF5722', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];

const NIVEAU_COLOR: Record<string, string> = {
  CRITIQUE: '#C62828', ELEVE: '#E65100', MOYEN: '#F57F17', BAS: '#1565C0',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, subtitle, icon, color, bg, trend, trendLabel, onClick,
}: {
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; color: string; bg: string;
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
  onClick?: () => void;
}) {
  return (
    <Card elevation={0} onClick={onClick} sx={{
      border: `1px solid ${color}25`,
      borderRadius: 3, overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 24px ${color}20`,
      } : {},
    }}>
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
              {title}
            </Typography>
            {trendLabel && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                {trend === 'up'
                  ? <ArrowUpward sx={{ fontSize: 12, color }} />
                  : trend === 'down'
                  ? <ArrowDownward sx={{ fontSize: 12, color: '#F44336' }} />
                  : null}
                <Typography variant="caption"
                  color={trend === 'up' ? color : trend === 'down' ? '#F44336' : 'text.secondary'}
                  fontWeight={600}>
                  {trendLabel}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={900} color={color} sx={{ mb: 0.3 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {subtitle}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={100} sx={{
        height: 3, bgcolor: 'transparent',
        '& .MuiLinearProgress-bar': { bgcolor: color, opacity: 0.6 },
      }} />
    </Card>
  );
}

// ── Tooltip personnalisé ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'white', border: '1px solid #E3F2FD',
      borderRadius: 2, p: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <Typography fontWeight={700} fontSize={13} color="#0D47A1" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((p: any, i: number) => (
        <Typography key={i} fontSize={12} color={p.color}>
          {p.name} : <strong>{Number(p.value ?? 0).toLocaleString()}</strong>
        </Typography>
      ))}
    </Box>
  );
}

// ── Page Dashboard ────────────────────────────────────────────────────────────
export default function RapportPage() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [periode, setPeriode] = useState<'7j' | '30j' | 'annee'>('30j');

  useEffect(() => {
    setLoading(true);
    dashboardService.getData()
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => {
        setError('Erreur lors du chargement du tableau de bord.');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress size={48} />
    </Box>
  );

  if (error)  return <Alert severity="error">{error}</Alert>;
  if (!data)  return null;

  const { kpis, graphiques, alertes_recentes } = data;

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} color="#0D47A1">Rapport & Statistiques</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Vue d'ensemble de votre inventaire pharmaceutique en temps réel.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={periode} onChange={e => setPeriode(e.target.value as any)}
            sx={{ borderRadius: 2, fontSize: 14 }}>
            <MenuItem value="7j">7 derniers jours</MenuItem>
            <MenuItem value="30j">30 derniers jours</MenuItem>
            <MenuItem value="annee">Cette année</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ── Bandeau alertes ─────────────────────────────────────────────────── */}
      {alertes_recentes.length > 0 && (
        <Box sx={{
          mb: 3, p: 2,
          bgcolor: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 3,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}>
          <NotificationsActive sx={{ color: '#E65100' }} />
          <Typography fontWeight={700} color="#E65100" fontSize={14}>
            {alertes_recentes.length} alerte(s) active(s) nécessitent votre attention
          </Typography>
          <Chip label="Voir toutes les alertes" size="small"
            onClick={() => navigate('/admin/alertes')}
            sx={{ bgcolor: '#E65100', color: 'white', cursor: 'pointer', fontWeight: 600, ml: 'auto' }} />
        </Box>
      )}

      {/* ── KPIs ligne 1 ────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Total Médicaments"
            value={kpis.total_medicaments}
            subtitle="dans le catalogue actif"
            icon={<Inventory2 sx={{ color: '#2196F3', fontSize: 22 }} />}
            color="#2196F3" bg="#E3F2FD"
            trendLabel="+12 ce mois" trend="up"
            onClick={() => navigate('/admin/inventaire')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Ruptures de Stock"
            value={kpis.ruptures_stock}
            subtitle="médicaments épuisés"
            icon={<TrendingDown sx={{ color: '#C62828', fontSize: 22 }} />}
            color="#C62828" bg="#FFEBEE"
            trendLabel={kpis.ruptures_stock > 0 ? 'Action requise' : 'Stock OK'}
            trend={kpis.ruptures_stock > 0 ? 'down' : 'up'}
            onClick={() => navigate('/admin/alertes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Alertes Péremption"
            value={kpis.lots_expirant_30j}
            subtitle="lots expirant < 30 jours"
            icon={<Warning sx={{ color: '#F57F17', fontSize: 22 }} />}
            color="#F57F17" bg="#FFF3E0"
            trendLabel={kpis.lots_expirant_30j > 0 ? 'Vérifier urgence' : 'OK'}
            trend={kpis.lots_expirant_30j > 0 ? 'down' : 'neutral'}
            onClick={() => navigate('/admin/alertes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Commandes en cours"
            value={kpis.commandes_en_cours}
            subtitle="en attente de livraison"
            icon={<LocalShipping sx={{ color: '#4CAF50', fontSize: 22 }} />}
            color="#4CAF50" bg="#E8F5E9"
            onClick={() => navigate('/admin/commandes')}
          />
        </Grid>
      </Grid>

      {/* ── KPIs ligne 2 ────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <KpiCard
            title="Valeur de l'Inventaire"
            value={`${kpis.valeur_stock.toLocaleString('fr-FR')} FCFA`}
            subtitle="valorisation financière du stock"
            icon={<AttachMoney sx={{ color: '#9C27B0', fontSize: 22 }} />}
            color="#9C27B0" bg="#F3E5F5"
            trendLabel="+4.2%" trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <KpiCard
            title="Stock Faible"
            value={kpis.stock_faible}
            subtitle="médicaments sous le seuil d'alerte"
            icon={<Warning sx={{ color: '#FF9800', fontSize: 22 }} />}
            color="#FF9800" bg="#FFF3E0"
            trend={kpis.stock_faible > 0 ? 'down' : 'up'}
            trendLabel={kpis.stock_faible > 0 ? 'Commander requis' : 'Niveaux OK'}
            onClick={() => navigate('/admin/alertes')}
          />
        </Grid>
      </Grid>

      {/* ── Graphiques ligne 1 ──────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>

        {/* AreaChart — Consommation vs Approvisionnement */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Consommation vs Approvisionnement
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Flux de mouvements de stocks sur les 6 derniers mois
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={graphiques.mouvements_6_mois}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2196F3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF5722" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF5722" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" />
                <XAxis dataKey="mois"
                  tick={{ fontSize: 12, fill: '#90A4AE' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#90A4AE' }} axisLine={false} tickLine={false} />
                <RTooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ fontSize: 12, color: '#546E7A' }}>{v}</span>} />
                <Area type="monotone" dataKey="entrees" name="Commandes"
                  stroke="#2196F3" strokeWidth={2} fill="url(#gradEntrees)" />
                <Area type="monotone" dataKey="sorties" name="Consommation"
                  stroke="#FF5722" strokeWidth={2} fill="url(#gradSorties)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* PieChart — Répartition valeur par catégorie */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Répartition de la Valeur
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Valeur financière par catégorie d'articles
            </Typography>
            {graphiques.valeur_par_categorie.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography color="text.secondary" fontSize={13}>Aucune donnée disponible</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={graphiques.valeur_par_categorie}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      dataKey="valeur" nameKey="categorie"
                      paddingAngle={3}>
                      {graphiques.valeur_par_categorie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    {/* ✅ Correction : formatter avec type any pour éviter l'erreur TS */}
                    <RTooltip formatter={(value: any) =>
                      [`${Number(value ?? 0).toLocaleString()} FCFA`]
                    } />
                    <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography fontSize={12} color="text.secondary" fontWeight={600}>
                    Valeur Totale Est.
                  </Typography>
                  <Typography fontWeight={800} color="#1565C0" fontSize={15}>
                    {kpis.valeur_stock.toLocaleString('fr-FR')} FCFA
                  </Typography>
                </Box>
              </>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* ── Graphiques ligne 2 ──────────────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* BarChart — Analyse des alertes */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Analyse des Alertes
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Répartition des points de vigilance critiques
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graphiques.analyse_alertes} layout="vertical"
                margin={{ top: 0, right: 20, left: 90, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" horizontal={false} />
                <XAxis type="number"
                  tick={{ fontSize: 11, fill: '#90A4AE' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="type" type="category" width={90}
                  tick={{ fontSize: 11, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                <RTooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Nb alertes" radius={[0, 4, 4, 0]}>
                  {graphiques.analyse_alertes.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.type === 'Rupture'         ? '#C62828' :
                      entry.type === 'Seuil Critique'  ? '#FF5722' :
                      entry.type === 'Péremption < 30' ? '#F57F17' : '#FF9800'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Alertes récentes */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography fontWeight={700} color="#0D47A1" fontSize={15}>Alertes Récentes</Typography>
                <Typography variant="caption" color="text.secondary">
                  5 dernières alertes actives
                </Typography>
              </Box>
              <Chip label="Voir tout" size="small"
                onClick={() => navigate('/admin/alertes')}
                sx={{ bgcolor: '#E3F2FD', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} />
            </Box>

            {alertes_recentes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" fontSize={13}>✅ Aucune alerte active</Typography>
              </Box>
            ) : (
              alertes_recentes.map((alerte, i) => (
                <Box key={alerte.id} sx={{
                  display: 'flex', gap: 1.5, p: 1.5, mb: 1,
                  borderLeft: `3px solid ${NIVEAU_COLOR[alerte.niveau_urgence] ?? '#90A4AE'}`,
                  bgcolor: i % 2 === 0 ? '#F8FBFF' : 'white',
                  borderRadius: '0 8px 8px 0',
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={12} fontWeight={600} color="#0D47A1" sx={{ mb: 0.3 }}>
                      {alerte.message.length > 65
                        ? alerte.message.substring(0, 65) + '...'
                        : alerte.message}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={alerte.niveau_urgence} size="small" sx={{
                        height: 16, fontSize: 10, fontWeight: 700,
                        bgcolor: (NIVEAU_COLOR[alerte.niveau_urgence] ?? '#90A4AE') + '20',
                        color:   NIVEAU_COLOR[alerte.niveau_urgence] ?? '#546E7A',
                      }} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alerte.date_creation).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}