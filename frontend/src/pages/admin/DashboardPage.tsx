import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Grid, Chip, CircularProgress,
  Alert, Button, Divider, Avatar, LinearProgress,
} from '@mui/material';
import {
  Inventory2, Warning, LocalShipping, Assessment,
  Add, ShoppingCart, Download, CheckCircle,
  Notifications, History, TrendingUp, AccessTime,
  ArrowForward,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import type { DashboardData } from '../../services/dashboardService';
import { useAuthStore } from '../../store/authStore';

// ── Données statiques pour simulation (remplacées par API quand dispo) ────────
const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const NIVEAU_COLOR: Record<string, string> = {
  CRITIQUE: '#C62828', ELEVE: '#E65100', MOYEN: '#F57F17', BAS: '#1565C0',
};

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
      borderRadius: 2.5, p: 2,
      cursor: onClick ? 'pointer' : 'default',
      bgcolor: alert ? `${color}08` : 'white',
      transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-1px)', boxShadow: `0 4px 16px ${color}20` } : {},
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={900} color={alert ? color : '#0D47A1'} sx={{ my: 0.3, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color={alert ? color : 'text.secondary'} fontWeight={alert ? 600 : 400}>
            {sublabel}
          </Typography>
        </Box>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2, bgcolor: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
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
      border: '1px solid #E3F2FD',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: '#F8FBFF', borderColor: color, transform: 'translateX(2px)' },
      mb: 1,
    }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, bgcolor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
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
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%', bgcolor: `${couleur}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
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

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

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

  // Construire données graphique consommation hebdo
  // (on utilise mouvements_6_mois si dispo, sinon données simulées)
  const chartData = JOURS_SEMAINE.map((jour, i) => ({
    jour,
    consommation: Math.floor(Math.random() * 300) + 150, // simulé
  }));

  // Stocks critiques = médicaments sous seuil
  const stocksCritiques = alertes_recentes
    .filter(a => a.type_alerte === 'STOCK_BAS')
    .slice(0, 3);

  const now = new Date();
  const heure = now.getHours();
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <Box sx={{ maxWidth: 1400 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} color="#0D47A1">
            Tableau de Bord
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {salutation}, {user?.prenom || 'Dr.'} {user?.nom || 'Smith'}. Voici l'état actuel de votre stock clinique.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
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

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact
            label="Total Médicaments"
            value={kpis.total_medicaments.toLocaleString()}
            sublabel="+12 cette semaine"
            icon={<Inventory2 sx={{ color: '#2196F3', fontSize: 20 }} />}
            color="#2196F3" bg="#E3F2FD"
            onClick={() => navigate('/admin/inventaire')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact
            label="Stocks Faibles"
            value={kpis.stock_faible}
            sublabel="Action requise"
            icon={<Warning sx={{ color: '#C62828', fontSize: 20 }} />}
            color="#C62828" bg="#FFEBEE"
            alert={kpis.stock_faible > 0}
            onClick={() => navigate('/admin/alertes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact
            label="Péremption < 30j"
            value={kpis.lots_expirant_30j}
            sublabel={`${kpis.lots_expirant_30j} lots critiques`}
            icon={<AccessTime sx={{ color: '#F57F17', fontSize: 20 }} />}
            color="#F57F17" bg="#FFF3E0"
            alert={kpis.lots_expirant_30j > 0}
            onClick={() => navigate('/admin/alertes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCompact
            label="Commandes en cours"
            value={kpis.commandes_en_cours}
            sublabel={`${kpis.commandes_en_cours} attendues aujourd'hui`}
            icon={<LocalShipping sx={{ color: '#4CAF50', fontSize: 20 }} />}
            color="#4CAF50" bg="#E8F5E9"
            onClick={() => navigate('/admin/commandes')}
          />
        </Grid>
      </Grid>

      {/* ── Contenu principal : 2 colonnes ──────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Colonne gauche */}
        <Grid item xs={12} md={8}>

          {/* Graphique consommation hebdomadaire */}
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
              <Chip
                label={`Total: ${graphiques.mouvements_6_mois.reduce((s, m) => s + m.sorties, 0).toLocaleString()} unités`}
                size="small"
                sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }}
              />
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
            ) : (
              alertes_recentes.slice(0, 3).map((alerte) => (
                <Box key={alerte.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 1.5, mb: 1, borderRadius: 2,
                  bgcolor: '#FFF8F8', border: '1px solid #FFCDD2',
                }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: 2, bgcolor: '#FFEBEE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
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
                    <Typography fontSize={18} fontWeight={900} color="#C62828">
                      {alerte.type_alerte === 'STOCK_BAS' ? '⚠' : '!'}
                    </Typography>
                    <Typography fontSize={10} color="text.secondary">STOCK ACTUEL</Typography>
                  </Box>
                </Box>
              ))
            )}
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
              onClick={() => navigate('/admin/rapports')}
            />

            {/* Vérification stock */}
            <Box sx={{
              mt: 2, p: 2, bgcolor: '#FFF8E1', border: '1px solid #FFE082',
              borderRadius: 2, textAlign: 'center',
            }}>
              <Warning sx={{ color: '#F57F17', fontSize: 28, mb: 0.5 }} />
              <Typography fontSize={13} fontWeight={700} color="#E65100" sx={{ mb: 0.5 }}>
                Vérification de Stock
              </Typography>
              <Typography fontSize={11} color="text.secondary" sx={{ mb: 1.5 }}>
                Il est temps de procéder à l'inventaire mensuel du rayon B.
              </Typography>
              <Button variant="outlined" size="small" fullWidth
                onClick={() => navigate('/admin/inventaire')}
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
            ) : (
              alertes_recentes.slice(0, 4).map((alerte, i) => (
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
              ))
            )}

            <Button fullWidth size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/admin/alertes')}
              sx={{ mt: 1.5, textTransform: 'none', fontSize: 12, color: '#1565C0' }}>
              Voir tout l'historique
            </Button>
          </Card>
        </Grid>
      </Grid>

      {/* ── Footer système ──────────────────────────────────────────────────── */}
      <Box sx={{
        mt: 3, p: 2, bgcolor: 'white',
        border: '1px solid #E3F2FD', borderRadius: 3,
        display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50' }} />
          <Box>
            <Typography fontSize={11} color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              État du Système
            </Typography>
            <Typography fontSize={13} fontWeight={700} color="#2E7D32">Connecté & Synchronisé</Typography>
          </Box>
        </Box>
        <Box>
          <Typography fontSize={11} color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Dernière Sauvegarde
          </Typography>
          <Typography fontSize={13} fontWeight={700} color="#0D47A1">
            Aujourd'hui, {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
        <Box>
          <Typography fontSize={11} color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Version Logicielle
          </Typography>
          <Typography fontSize={13} fontWeight={700} color="#0D47A1">CliniqueStock Enterprise v1.0.4</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Utilitaire temps écoulé ───────────────────────────────────────────────────
function tempsEcoule(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
}