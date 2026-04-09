import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Tabs, Tab, Divider,
  Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField,
  Table, TableHead, TableRow, TableBody, TableCell,
} from '@mui/material';
import {
  CheckCircle, NotificationsOff, Refresh, ExpandMore,
  Settings, ErrorOutline, WarningAmber, Schedule,
  ShoppingCart, DeleteSweep, Close, VerifiedUser,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import alerteService from '../../services/alerteService';
import type { Alerte, NiveauAlerte, TypeAlerte, SeuilConfig } from '../../services/alerteService';
import { medicamentService } from '../../services/medicamentService';
import api from '../../services/authService';

// ── Config visuelle ───────────────────────────────────────────────────────────
const NIVEAU_CONFIG: Record<NiveauAlerte, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  CRITIQUE: { label: 'Critique',      color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A', icon: <ErrorOutline sx={{ color: '#C62828', fontSize: 20 }} /> },
  ELEVE:    { label: 'Élevé',         color: '#E65100', bg: '#FFF3E0', border: '#FFCC80', icon: <WarningAmber sx={{ color: '#E65100', fontSize: 20 }} /> },
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
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
}

// ── Modal Vérification ────────────────────────────────────────────────────────
function VerifierModal({ alerte, open, onClose }: {
  alerte: Alerte | null; open: boolean; onClose: () => void;
}) {
  const [info,    setInfo]    = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !alerte) return;
    setLoading(true);
    alerteService.verifier(alerte.id)
      .then(r => { setInfo(r.data); setLoading(false); })
      .catch(()  => setLoading(false));
  }, [open, alerte]);

  if (!alerte) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">Vérification de l'alerte</Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : info ? (
          <Box>
            <Alert severity={info.est_lue ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {info.est_lue ? '✅ Cette alerte a été résolue.' : '⚠️ Cette alerte est encore active.'}
            </Alert>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {([
                ['Type',       TYPE_LABEL[info.type_alerte as TypeAlerte]],
                ['Niveau',     info.niveau],
                ['Créée le',   new Date(info.date_creation).toLocaleString('fr-FR')],
                ['Statut',     info.est_lue ? 'Résolue' : 'En cours'],
                ['Résolution', info.resolution],
              ] as [string, string][]).map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Typography fontWeight={600} fontSize={13} color="#546E7A" sx={{ minWidth: 100 }}>
                    {label}
                  </Typography>
                  <Typography fontSize={13} color="#333">{value}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
              <Typography fontWeight={600} fontSize={13} color="#0D47A1" sx={{ mb: 1 }}>
                Détail du message
              </Typography>
              <Typography fontSize={13} color="#444">{info.message}</Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Modal Configuration des seuils ────────────────────────────────────────────
function SeuilConfigModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [seuils,     setSeuils]     = useState<SeuilConfig>({
    seuil_stock_global:        10,
    seuil_critique:            5,
    seuil_peremption_warning:  7,
    seuil_peremption_critique: 3,
  });

  // ── Section 4 : seuils par médicament ─────────────────────────────────────
  const [medicaments, setMedicaments] = useState<any[]>([]);
  const [seuilsMeds,  setSeuilsMeds]  = useState<Record<number, number>>({});
  const [savingMed,   setSavingMed]   = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    // Charger les seuils globaux
    setLoading(true);
    alerteService.getSeuils()
      .then(r => { setSeuils(r.data); setLoading(false); })
      .catch(() => setLoading(false));

    // Charger les médicaments actifs
    medicamentService.getAll().then((r: any) => {
      const data = r.data;
      const meds = Array.isArray(data) ? data : data.results ?? [];
      const actifs = meds.filter((m: any) => m.est_actif);
      setMedicaments(actifs);
      const seuilsInit: Record<number, number> = {};
      actifs.forEach((m: any) => { seuilsInit[m.id] = m.seuil_alerte; });
      setSeuilsMeds(seuilsInit);
    }).catch(() => {});
  }, [open]);

  const handleSaveGlobal = async () => {
    setSaving(true);
    try {
      await alerteService.saveSeuils(seuils);
      toast.success('Seuils globaux sauvegardés !');
      onSaved();
      onClose();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const saveMedSeuil = async (medId: number, medNom: string) => {
    setSavingMed(medId);
    try {
      await api.patch(`/medicaments/${medId}/update-seuil/`, {
        seuil_alerte: seuilsMeds[medId],
      });
      toast.success(`Seuil de ${medNom} mis à jour.`);
    } catch {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setSavingMed(null);
    }
  };

  // Composant champ de saisie réutilisable
  const Field = ({ label, field, color, description }: {
    label: string; field: keyof SeuilConfig; color: string; description: string;
  }) => (
    <Box sx={{
      p: 2,
      border:     `1px solid ${color}30`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 2,
      bgcolor:    `${color}08`,
    }}>
      <Typography fontWeight={700} fontSize={13} color={color} sx={{ mb: 0.5 }}>{label}</Typography>
      <Typography fontSize={12} color="text.secondary" sx={{ mb: 1.5 }}>{description}</Typography>
      <TextField
        type="number" size="small" fullWidth
        value={seuils[field]}
        onChange={e => setSeuils(prev => ({ ...prev, [field]: Number(e.target.value) }))}
        inputProps={{ min: 0 }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">Configurer les seuils d'alerte</Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Ces seuils définissent quand les alertes sont déclenchées automatiquement.
            </Typography>

            {/* Seuils de stock */}
            <Typography fontWeight={700} color="#546E7A" fontSize={12}
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Seuils de stock
            </Typography>
            <Field label="Seuil de stock global (unités)" field="seuil_stock_global" color="#F57F17"
              description="Déclenche une alerte Avertissement quand le stock descend sous ce seuil." />
            <Field label="Seuil critique de stock (unités)" field="seuil_critique" color="#C62828"
              description="Déclenche une alerte Critique. Le médicament est en rupture imminente." />

            <Divider />

            {/* Seuils de péremption */}
            <Typography fontWeight={700} color="#546E7A" fontSize={12}
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Seuils de péremption
            </Typography>
            <Field label="Péremption — Avertissement (jours)" field="seuil_peremption_warning" color="#F57F17"
              description="Alerte Avertissement si un lot expire dans moins de X jours." />
            <Field label="Péremption — Critique (jours)" field="seuil_peremption_critique" color="#C62828"
              description="Alerte Critique si un lot expire dans moins de X jours." />

            <Divider />

            {/* ── Section 4 : Seuils par médicament ──────────────────────── */}
            <Typography fontWeight={700} color="#546E7A" fontSize={12}
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Seuils par médicament
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              Ces seuils remplacent le seuil global pour chaque médicament.
            </Typography>

            <Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #E3F2FD', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A', bgcolor: '#F8FBFF' }}>
                      Médicament
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A', width: 120, bgcolor: '#F8FBFF' }}>
                      Seuil (unités)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A', width: 80, bgcolor: '#F8FBFF' }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medicaments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: 13 }}>
                        Aucun médicament actif.
                      </TableCell>
                    </TableRow>
                  ) : medicaments.map(med => (
                    <TableRow key={med.id} hover>
                      <TableCell>
                        <Typography fontSize={12} fontWeight={600} color="#0D47A1">
                          {med.nom_commercial}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary">{med.dci}</Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" type="number"
                          value={seuilsMeds[med.id] ?? med.seuil_alerte}
                          onChange={e => setSeuilsMeds(p => ({ ...p, [med.id]: Number(e.target.value) }))}
                          inputProps={{ min: 0 }}
                          sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 13 } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained"
                          disabled={savingMed === med.id}
                          onClick={() => saveMedSeuil(med.id, med.nom_commercial)}
                          sx={{
                            borderRadius: 1.5, textTransform: 'none', fontSize: 11,
                            py: 0.5, px: 1.5, minWidth: 60,
                            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                          }}>
                          {savingMed === med.id
                            ? <CircularProgress size={12} color="inherit" />
                            : 'OK'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={handleSaveGlobal} variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
          }}>
          {saving ? 'Sauvegarde...' : 'Enregistrer les seuils globaux'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Carte alerte ──────────────────────────────────────────────────────────────
function AlerteCard({ alerte, onRefresh }: { alerte: Alerte; onRefresh: () => void }) {
  const navigate = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const nc = NIVEAU_CONFIG[alerte.niveau_urgence];

  const handleResolve = async () => {
    if (alerte.type_alerte === 'STOCK_BAS') {
      navigate('/admin/commandes', {
        state: { medicamentId: alerte.medicament_id, medicamentNom: alerte.medicament_nom, openDialog: true },
      });
      return;
    }
    if (alerte.type_alerte === 'PEREMPTION') {
      navigate('/admin/inventaire', {
        state: { action: 'mouvement', medicamentId: alerte.medicament_id },
      });
      return;
    }
    setLoading(true);
    try {
      await alerteService.resolve(alerte.id);
      toast.success('Alerte résolue.');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la résolution.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommander = () => {
    navigate('/admin/commandes', {
      state: { medicamentId: alerte.medicament_id, medicamentNom: alerte.medicament_nom, openDialog: true },
    });
  };

  return (
    <>
      <Card elevation={0} sx={{
        border:     `1px solid ${nc.border}`,
        borderLeft: `4px solid ${nc.color}`,
        borderRadius: 2, mb: 1.5,
        bgcolor:  alerte.est_lue ? '#FAFAFA' : nc.bg,
        opacity:  alerte.est_lue ? 0.75 : 1,
        transition: 'all 0.3s',
      }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Icône */}
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: alerte.est_lue ? '#E0E0E0' : `${nc.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {nc.icon}
          </Box>

          {/* Contenu */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography fontWeight={700} fontSize={14} color={alerte.est_lue ? '#757575' : nc.color}>
                {alerte.message.split('—')[0].split(':')[0].trim()}
              </Typography>
              <Chip label={nc.label} size="small"
                sx={{ bgcolor: nc.color, color: 'white', fontWeight: 700, fontSize: 11, height: 20 }} />
              {alerte.est_lue && (
                <Chip label="TRAITÉ" size="small"
                  sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: 11, height: 20 }} />
              )}
            </Box>
            <Typography fontSize={12} color={alerte.est_lue ? '#9E9E9E' : '#555'} sx={{ mb: 1, lineHeight: 1.6 }}>
              {alerte.message}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule sx={{ fontSize: 12 }} />
                {tempsEcoule(alerte.date_creation)}
              </Typography>
              <Chip label={TYPE_LABEL[alerte.type_alerte]} size="small"
                sx={{ bgcolor: '#F5F5F5', color: '#546E7A', fontSize: 11, height: 18 }} />
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {alerte.type_alerte === 'STOCK_BAS' && (
              <Button size="small" variant="outlined"
                startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                onClick={handleCommander}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5,
                  borderColor: '#1565C0', color: '#1565C0' }}>
                Commander
              </Button>
            )}

            {/* Vérifier — toujours visible */}
            <Button size="small" variant="outlined"
              startIcon={<VerifiedUser sx={{ fontSize: 14 }} />}
              onClick={() => setVerifierOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5,
                borderColor: '#9C27B0', color: '#6A1B9A' }}>
              Vérifier
            </Button>

            {/* Résoudre — seulement si non résolue */}
            {!alerte.est_lue && (
              <Button size="small" variant="outlined"
                startIcon={loading
                  ? <CircularProgress size={12} />
                  : <CheckCircle sx={{ fontSize: 14 }} />}
                onClick={handleResolve} disabled={loading}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, py: 0.5,
                  borderColor: '#4CAF50', color: '#2E7D32' }}>
                Résoudre
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      <VerifierModal
        alerte={alerte}
        open={verifierOpen}
        onClose={() => setVerifierOpen(false)}
      />
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AlertesPage() {
  const [alertes,       setAlertes]       = useState<Alerte[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [tabValue,      setTabValue]      = useState(0);
  const [seuilOpen,     setSeuilOpen]     = useState(false);
  const [nettoyLoading, setNettoyLoading] = useState(false);

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
    const interval = setInterval(fetchAlertes, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertes]);

  const handleMarkAllRead = async () => {
    try {
      const res = await alerteService.markAllRead();
      toast.success((res.data as any).message);
      fetchAlertes();
    } catch { toast.error('Erreur.'); }
  };

  const handleNettoyer = async () => {
    if (!confirm('Supprimer définitivement toutes les alertes traitées de plus de 30 jours ?')) return;
    setNettoyLoading(true);
    try {
      const res = await alerteService.nettoyer();
      toast.success((res.data as any).message);
      fetchAlertes();
    } catch { toast.error('Erreur.'); }
    finally { setNettoyLoading(false); }
  };

  const tabs = [
    { label: 'Toutes',         filter: (_: Alerte) => true },
    { label: 'Critiques',      filter: (a: Alerte) => a.niveau_urgence === 'CRITIQUE' && !a.est_lue },
    { label: 'Avertissements', filter: (a: Alerte) => ['MOYEN', 'ELEVE'].includes(a.niveau_urgence) && !a.est_lue },
    { label: 'Traitées',       filter: (a: Alerte) => a.est_lue },
  ];

  const alertesFiltrees  = alertes.filter(tabs[tabValue].filter);
  const critiques        = alertes.filter(a => a.niveau_urgence === 'CRITIQUE' && !a.est_lue).length;
  const avertissements   = alertes.filter(a => ['MOYEN', 'ELEVE'].includes(a.niveau_urgence) && !a.est_lue).length;
  const logistiques      = alertes.filter(a => a.niveau_urgence === 'BAS' && !a.est_lue).length;

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">Alertes & Notifications</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Surveillez l'état critique de votre inventaire et réagissez aux urgences.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small"
            startIcon={<NotificationsOff sx={{ fontSize: 16 }} />}
            onClick={handleMarkAllRead}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0', fontSize: 13 }}>
            Tout marquer comme lu
          </Button>
          <Button variant="outlined" size="small" color="error"
            startIcon={nettoyLoading
              ? <CircularProgress size={14} color="inherit" />
              : <DeleteSweep sx={{ fontSize: 16 }} />}
            onClick={handleNettoyer} disabled={nettoyLoading}
            sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
            Nettoyer les alertes
          </Button>
          <Button variant="contained" size="small"
            startIcon={<Settings sx={{ fontSize: 16 }} />}
            onClick={() => setSeuilOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            Configurer les seuils
          </Button>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchAlertes} size="small" sx={{ color: '#2196F3' }}>
              <Refresh />
            </IconButton>
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
            <Typography variant="caption" fontWeight={700} color={color} sx={{ letterSpacing: 0.8 }}>
              {label}
            </Typography>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Onglets */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 2, borderBottom: '1px solid #E3F2FD' }}>
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>

      {/* Liste des alertes */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : alertesFiltrees.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 2, p: 6, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 48, color: '#4CAF50', mb: 2 }} />
          <Typography fontWeight={700} color="#2E7D32">Aucune alerte dans cette catégorie !</Typography>
          <Typography variant="body2" color="text.secondary">Votre inventaire est sous contrôle.</Typography>
        </Card>
      ) : (
        alertesFiltrees.map(alerte => (
          <AlerteCard key={alerte.id} alerte={alerte} onRefresh={fetchAlertes} />
        ))
      )}

      {/* Informations seuils */}
      <Box sx={{ mt: 4 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#0D47A1"
          sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          ℹ️ Informations sur les seuils
        </Typography>
        {[
          {
            q: 'Comment sont calculés les seuils de stock ?',
            r: 'Le seuil d\'alerte est défini pour chaque médicament lors de sa création. Une alerte est déclenchée automatiquement dès que le stock disponible descend en dessous de ce seuil.',
          },
          {
            q: 'Personnaliser mes préférences de notification',
            r: 'Utilisez le bouton "Configurer les seuils" pour définir des seuils globaux ou par médicament.',
          },
        ].map(({ q, r }) => (
          <Accordion key={q} elevation={0}
            sx={{ border: '1px solid #E3F2FD', borderRadius: '8px !important', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography fontWeight={600} fontSize={14} color="#546E7A">{q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography fontSize={13} color="#555">{r}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Modal seuils */}
      <SeuilConfigModal
        open={seuilOpen}
        onClose={() => setSeuilOpen(false)}
        onSaved={fetchAlertes}
      />
    </Box>
  );
}