import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Tabs, Tab, Divider,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  CheckCircle, NotificationsOff, Refresh,
  ExpandMore, Settings, ErrorOutline,
  WarningAmber, Schedule, Inventory,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import alerteService from '../../services/alerteService';
import type { Alerte, NiveauAlerte, TypeAlerte } from '../../services/alerteService';

// ── Config visuelle ──────────────────────────────────────────────────────────
const NIVEAU_CONFIG: Record<NiveauAlerte, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CRITIQUE: { label: 'Critique',      color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A', icon: <ErrorOutline sx={{ color: '#C62828', fontSize: 20 }} /> },
  ELEVE:    { label: 'Élevé',         color: '#E65100', bg: '#FFF3E0', border: '#FFCC02', icon: <WarningAmber sx={{ color: '#E65100', fontSize: 20 }} /> },
  MOYEN:    { label: 'Avertissement', color: '#F57F17', bg: '#FFFDE7', border: '#FFF176', icon: <WarningAmber sx={{ color: '#F57F17', fontSize: 20 }} /> },
  BAS:      { label: 'Logistique',    color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9', icon: <Schedule    sx={{ color: '#1565C0', fontSize: 20 }} /> },
};

const TYPE_LABEL: Record<TypeAlerte, string> = {
  STOCK_BAS:  'Gestion Stock',
  PEREMPTION: 'Péremption',
  ANOMALIE:   'Anomalie',
  SYSTEME:    'Système',
};

function tempsEcoule(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
}

// ── Carte alerte ──────────────────────────────────────────────────────────────
function AlerteCard({ alerte, onResolved }: { alerte: Alerte; onResolved: () => void }) {
  const [loading, setLoading] = useState(false);
  const nc = NIVEAU_CONFIG[alerte.niveau_urgence];

  const handleResolve = async () => {
    setLoading(true);
    try {
      await alerteService.resolve(alerte.id);
      toast.success('Alerte résolue.');
      onResolved();
    } catch {
      toast.error('Erreur lors de la résolution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{
      border: `1px solid ${nc.border}`,
      borderLeft: `4px solid ${nc.color}`,
      borderRadius: 2, mb: 1.5, bgcolor: nc.bg,
      opacity: alerte.est_lue ? 0.6 : 1,
      transition: 'opacity 0.3s',
    }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Icône */}
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          bgcolor: `${nc.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {nc.icon}
        </Box>

        {/* Contenu */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography fontWeight={700} fontSize={14} color={nc.color}>
              {alerte.message.split(':')[0]}
            </Typography>
            <Chip label={nc.label} size="small"
              sx={{ bgcolor: nc.color, color: 'white', fontWeight: 700, fontSize: 11, height: 20 }} />
            {alerte.est_lue && (
              <Chip label="TRAITÉ" size="small"
                sx={{ bgcolor: '#E0E0E0', color: '#757575', fontWeight: 700, fontSize: 11, height: 20 }} />
            )}
          </Box>

          <Typography fontSize={13} color="#555" sx={{ mb: 1, lineHeight: 1.6 }}>
            {alerte.message}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule sx={{ fontSize: 13 }} />
              {tempsEcoule(alerte.date_creation)}
            </Typography>
            <Chip label={TYPE_LABEL[alerte.type_alerte]} size="small"
              sx={{ bgcolor: '#F5F5F5', color: '#546E7A', fontSize: 11, height: 18 }} />
          </Box>
        </Box>

        {/* Actions */}
        {!alerte.est_lue && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {alerte.type_alerte === 'STOCK_BAS' && (
              <Button size="small" variant="outlined" startIcon={<Inventory sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5, borderColor: nc.color, color: nc.color }}>
                Commander
              </Button>
            )}
            {alerte.type_alerte === 'PEREMPTION' && (
              <Button size="small" variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5, borderColor: nc.color, color: nc.color }}>
                Vérifier
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
              onClick={handleResolve} disabled={loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5, borderColor: '#4CAF50', color: '#2E7D32' }}>
              {loading ? <CircularProgress size={12} /> : 'Résoudre'}
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AlertesPage() {
  const [alertes,  setAlertes]  = useState<Alerte[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tabValue, setTabValue] = useState(0);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await alerteService.getAll();
      const data = res.data as any;
      setAlertes(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      setError('Erreur lors du chargement des alertes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertes();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchAlertes, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertes]);

  const handleMarkAllRead = async () => {
    try {
      await alerteService.markAllRead();
      toast.success('Toutes les alertes ont été marquées comme lues.');
      fetchAlertes();
    } catch {
      toast.error('Erreur.');
    }
  };

  // Filtres par onglet
  const tabs = [
    { label: 'Toutes',        filter: (a: Alerte) => true },
    { label: 'Critiques',     filter: (a: Alerte) => a.niveau_urgence === 'CRITIQUE' && !a.est_lue },
    { label: 'Avertissements',filter: (a: Alerte) => ['MOYEN', 'ELEVE'].includes(a.niveau_urgence) && !a.est_lue },
    { label: 'Traitées',      filter: (a: Alerte) => a.est_lue },
  ];

  const alertesFiltrees = alertes.filter(tabs[tabValue].filter);

  const critiques     = alertes.filter(a => a.niveau_urgence === 'CRITIQUE' && !a.est_lue).length;
  const avertissements = alertes.filter(a => ['MOYEN', 'ELEVE'].includes(a.niveau_urgence) && !a.est_lue).length;
  const logistiques   = alertes.filter(a => a.niveau_urgence === 'BAS' && !a.est_lue).length;

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Alertes & Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Surveillez l'état critique de votre inventaire et réagissez aux urgences.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<NotificationsOff />}
            onClick={handleMarkAllRead}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
            Tout marquer comme lu
          </Button>
          <Button variant="contained" startIcon={<Settings />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            Configurer les seuils
          </Button>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchAlertes} sx={{ color: '#2196F3' }}><Refresh /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI badges */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'ALERTES CRITIQUES',  value: critiques,      color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A' },
          { label: 'AVERTISSEMENTS',     value: avertissements, color: '#F57F17', bg: '#FFF3E0', border: '#FFCC80' },
          { label: 'LOGISTIQUE',         value: logistiques,    color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9' },
        ].map(({ label, value, color, bg, border }) => (
          <Card key={label} elevation={0} sx={{
            flex: 1, minWidth: 160, p: 2.5,
            border: `1px solid ${border}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 2, bgcolor: bg,
          }}>
            <Typography variant="h3" fontWeight={900} color={color}>{value}</Typography>
            <Typography variant="caption" fontWeight={700} color={color} sx={{ letterSpacing: 1 }}>
              {label}
            </Typography>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Onglets */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        {tabs.map((t, i) => <Tab key={i} label={t.label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
      </Tabs>

      {/* Liste des alertes */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : alertesFiltrees.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 2, p: 6, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 48, color: '#4CAF50', mb: 2 }} />
          <Typography fontWeight={700} color="#2E7D32">Aucune alerte dans cette catégorie !</Typography>
          <Typography variant="body2" color="text.secondary">Votre inventaire est sous contrôle.</Typography>
        </Card>
      ) : (
        alertesFiltrees.map(alerte => (
          <AlerteCard key={alerte.id} alerte={alerte} onResolved={fetchAlertes} />
        ))
      )}

      {/* Informations sur les seuils */}
      <Box sx={{ mt: 4 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          ℹ️ Informations sur les seuils
        </Typography>
        {[
          {
            q: 'Comment sont calculés les seuils de stock ?',
            r: 'Le seuil d\'alerte est défini pour chaque médicament lors de sa création. Une alerte est déclenchée automatiquement dès que le stock disponible descend en dessous de ce seuil suite à une dispensation.',
          },
          {
            q: 'Personnaliser mes préférences de notification',
            r: 'Vous pouvez configurer les seuils de chaque médicament depuis la page Inventaire → Fiche médicament → Seuil d\'alerte critique.',
          },
        ].map(({ q, r }) => (
          <Accordion key={q} elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: '8px !important', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography fontWeight={600} fontSize={14} color="#546E7A">{q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography fontSize={13} color="#555">{r}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}