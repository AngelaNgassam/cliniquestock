import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Divider,
} from '@mui/material';
import {
  Add, Edit, CheckCircle, Block, History,
  Business, Close, Save, Refresh,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import fournisseurService from '../../services/fournisseurService';
import type { Fournisseur, FournisseurPayload, Historique } from '../../services/fournisseurService';

// ── Formulaire Fournisseur ────────────────────────────────────────────────────
function FournisseurFormDialog({
  open, onClose, onSaved, fournisseur,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  fournisseur: Fournisseur | null;
}) {
  const isEdit = Boolean(fournisseur);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } =
    useForm<FournisseurPayload>({
      defaultValues: {
        nom_societe: '', contact: '', email: '', adresse: '',
      },
    });

  useEffect(() => {
    if (fournisseur) {
      reset({
        nom_societe: fournisseur.nom_societe,
        contact:     fournisseur.contact,
        email:       fournisseur.email,
        adresse:     fournisseur.adresse,
      });
    } else {
      reset({ nom_societe: '', contact: '', email: '', adresse: '' });
    }
  }, [fournisseur, reset]);

  const onSubmit = async (data: FournisseurPayload) => {
    setLoading(true);
    try {
      if (isEdit && fournisseur) {
        await fournisseurService.update(fournisseur.id, data);
        toast.success('Fournisseur modifié avec succès !');
      } else {
        await fournisseurService.create(data);
        toast.success('Fournisseur créé avec succès !');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.email?.[0] || 'Erreur lors de l\'enregistrement.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">
            {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Controller name="nom_societe" control={control}
            rules={{ required: 'Nom de la société obligatoire' }}
            render={({ field }) => (
              <TextField {...field} label="Nom de la société *"
                placeholder="ex: PharmaDist Cameroun"
                error={!!errors.nom_societe} helperText={errors.nom_societe?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />

          <Controller name="contact" control={control}
            rules={{ required: 'Contact obligatoire' }}
            render={({ field }) => (
              <TextField {...field} label="Contact *"
                placeholder="ex: Jean Mbarga — +237 6XX XXX XXX"
                error={!!errors.contact} helperText={errors.contact?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />

          <Controller name="email" control={control}
            rules={{
              required: 'Email obligatoire',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
            }}
            render={({ field }) => (
              <TextField {...field} label="Email professionnel *"
                placeholder="ex: contact@pharmadist.cm"
                error={!!errors.email} helperText={errors.email?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />

          <Controller name="adresse" control={control}
            rules={{ required: 'Adresse obligatoire' }}
            render={({ field }) => (
              <TextField {...field} label="Adresse *" multiline rows={2}
                placeholder="ex: Rue de la Santé, Yaoundé, Cameroun"
                error={!!errors.adresse} helperText={errors.adresse?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
          }}>
          {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog Historique ─────────────────────────────────────────────────────────
function HistoriqueDialog({
  open, onClose, fournisseurId, fournisseurNom,
}: {
  open: boolean;
  onClose: () => void;
  fournisseurId: number | null;
  fournisseurNom: string;
}) {
  const [historique, setHistorique] = useState<Historique | null>(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!open || !fournisseurId) return;
    setLoading(true);
    fournisseurService.getHistorique(fournisseurId)
      .then((res) => { setHistorique(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, fournisseurId]);

  const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
    BROUILLON:  { bg: '#F5F5F5', color: '#607D8B' },
    EN_ATTENTE: { bg: '#E3F2FD', color: '#1565C0' },
    PARTIELLE:  { bg: '#FFF9C4', color: '#F57F17' },
    LIVREE:     { bg: '#E8F5E9', color: '#2E7D32' },
    ANNULEE:    { bg: '#FFEBEE', color: '#C62828' },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">
            Historique — {fournisseurNom}
          </Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : historique ? (
          <>
            {/* KPIs */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Card elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #E3F2FD', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Total commandes</Typography>
                <Typography variant="h4" fontWeight={800} color="#1565C0">
                  {historique.total_commandes}
                </Typography>
              </Card>
              <Card elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #E8F5E9', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Volume d'affaires</Typography>
                <Typography variant="h5" fontWeight={800} color="#2E7D32">
                  {Number(historique.volume_affaires).toLocaleString()} FCFA
                </Typography>
              </Card>
            </Box>

            {/* Liste des commandes */}
            {historique.commandes.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>
                Aucune commande pour ce fournisseur.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                      {['Référence', 'Date', 'Statut', 'Montant'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historique.commandes.map((cmd) => {
                      const sc = STATUT_COLORS[cmd.statut] || STATUT_COLORS.EN_ATTENTE;
                      return (
                        <TableRow key={cmd.id} hover>
                          <TableCell>
                            <Typography fontWeight={600} fontSize={13} color="#0D47A1">
                              {cmd.reference}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={13}>
                              {new Date(cmd.date_creation).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={cmd.statut} size="small"
                              sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600} color="#1565C0">
                              {Number(cmd.montant_total).toLocaleString()} FCFA
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : (
          <Typography color="error" textAlign="center">
            Impossible de charger l'historique.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Dialogs
  const [formOpen, setFormOpen]             = useState(false);
  const [editTarget, setEditTarget]         = useState<Fournisseur | null>(null);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const [historiqueTarget, setHistoriqueTarget] = useState<{ id: number; nom: string } | null>(null);

  const fetchFournisseurs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fournisseurService.getAll();
      const data = res.data;
      setFournisseurs(Array.isArray(data) ? data : (data as any).results ?? []);
    } catch {
      setError('Erreur lors du chargement des fournisseurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const handleToggleStatut = async (f: Fournisseur) => {
    const action = f.est_actif ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} le fournisseur "${f.nom_societe}" ?`)) return;
    try {
      await fournisseurService.toggleStatut(f.id);
      toast.success(`Fournisseur ${f.est_actif ? 'désactivé' : 'activé'} avec succès.`);
      fetchFournisseurs();
    } catch {
      toast.error('Erreur lors du changement de statut.');
    }
  };

  const openEdit = (f: Fournisseur) => {
    setEditTarget(f);
    setFormOpen(true);
  };

  const openHistorique = (f: Fournisseur) => {
    setHistoriqueTarget({ id: f.id, nom: f.nom_societe });
    setHistoriqueOpen(true);
  };

  const actifs   = fournisseurs.filter((f) => f.est_actif).length;
  const inactifs = fournisseurs.filter((f) => !f.est_actif).length;

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Gestion des Fournisseurs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gérez vos partenaires commerciaux, suivez les commandes et les volumes d'affaires.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
            boxShadow: '0 4px 15px rgba(33,150,243,0.3)',
          }}>
          Nouveau fournisseur
        </Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total fournisseurs', value: fournisseurs.length, color: '#2196F3', sub: 'Dans le système' },
          { label: 'Actifs',             value: actifs,              color: '#4CAF50', sub: 'En activité' },
          { label: 'Inactifs',           value: inactifs,            color: '#FF9800', sub: 'Désactivés' },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} elevation={0} sx={{
            p: 2.5, border: '1px solid #E3F2FD', borderRadius: 3, flex: 1, minWidth: 160,
          }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
            <Typography variant="h4" fontWeight={900} color={color} sx={{ my: 0.5 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          </Card>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                {['Société', 'Contact', 'Email', 'Commandes', 'Volume FCFA', 'Statut', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: '#546E7A', fontSize: 12, py: 1.5 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : fournisseurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Aucun fournisseur enregistré.
                  </TableCell>
                </TableRow>
              ) : fournisseurs.map((f) => (
                <TableRow key={f.id} hover sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2,
                        bgcolor: '#E3F2FD',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Business sx={{ color: '#1565C0', fontSize: 20 }} />
                      </Box>
                      <Typography fontWeight={700} fontSize={14} color="#0D47A1">
                        {f.nom_societe}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13}>{f.contact}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color="#1565C0">{f.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600} color="#546E7A">
                      {f.total_commandes ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600} color="#2E7D32">
                      {Number(f.volume_affaires ?? 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={f.est_actif ? 'Actif' : 'Inactif'}
                      size="small"
                      sx={{
                        bgcolor: f.est_actif ? '#E8F5E9' : '#ECEFF1',
                        color:   f.est_actif ? '#2E7D32' : '#607D8B',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Historique commandes">
                        <IconButton size="small" sx={{ color: '#9C27B0' }}
                          onClick={() => openHistorique(f)}>
                          <History fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" sx={{ color: '#FF9800' }}
                          onClick={() => openEdit(f)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={f.est_actif ? 'Désactiver' : 'Activer'}>
                        <IconButton size="small"
                          sx={{ color: f.est_actif ? '#F44336' : '#4CAF50' }}
                          onClick={() => handleToggleStatut(f)}>
                          {f.est_actif
                            ? <Block fontSize="small" />
                            : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog Formulaire */}
      <FournisseurFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={fetchFournisseurs}
        fournisseur={editTarget}
      />

      {/* Dialog Historique */}
      <HistoriqueDialog
        open={historiqueOpen}
        onClose={() => { setHistoriqueOpen(false); setHistoriqueTarget(null); }}
        fournisseurId={historiqueTarget?.id ?? null}
        fournisseurNom={historiqueTarget?.nom ?? ''}
      />
    </Box>
  );
}