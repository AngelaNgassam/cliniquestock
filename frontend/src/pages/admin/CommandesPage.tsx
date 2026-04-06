import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Divider, Collapse, Stepper, Step, StepLabel,
} from '@mui/material';
import {
  Add, Send, Cancel, Lock,
  ExpandMore, ExpandLess, Refresh, ShoppingCart,
  LocalShipping, CheckCircle,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import commandeService from '../../services/commandeService';
import type { Commande, StatutCommande } from '../../services/commandeService';
import fournisseurService from '../../services/fournisseurService';
import { medicamentService } from '../../services/medicamentService';
import api from '../../services/authService';

const STATUT_CONFIG: Record<StatutCommande, { label: string; bg: string; color: string }> = {
  BROUILLON:  { label: 'Brouillon',  bg: '#F5F5F5', color: '#607D8B' },
  EN_ATTENTE: { label: 'En attente', bg: '#E3F2FD', color: '#1565C0' },
  PARTIELLE:  { label: 'Partielle',  bg: '#FFF9C4', color: '#F57F17' },
  LIVREE:     { label: 'Livrée',     bg: '#E8F5E9', color: '#2E7D32' },
  ANNULEE:    { label: 'Annulée',    bg: '#FFEBEE', color: '#C62828' },
};

// ── Dialog Enregistrer une Réception ─────────────────────────────────────────
function ReceptionDialog({
  commande,
  open,
  onClose,
  onDone,
}: {
  commande: Commande;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [numeroBon, setNumeroBon] = useState('');
  const [dateReception, setDateReception] = useState(
    new Date().toISOString().slice(0, 16)
  );

  // Une ligne par médicament commandé, pré-remplie
  const [lignes, setLignes] = useState<{
    medicament: number;
    medicament_nom: string;
    quantite_commandee: number;
    quantite_recue: number;
    numero_lot: string;
    date_peremption: string;
    prix_achat_reel: string;
    has_anomalie: boolean;
    type_anomalie: string;
    description_anomalie: string;
  }[]>([]);

  useEffect(() => {
    if (!open) return;
    // Pré-remplir avec les lignes de la commande
    setLignes(
      commande.lignes.map(l => ({
        medicament:           l.medicament,
        medicament_nom:       l.medicament_nom || `Médicament #${l.medicament}`,
        quantite_commandee:   l.quantite_commandee,
        quantite_recue:       l.quantite_commandee, // pré-rempli avec qté commandée
        numero_lot:           '',
        date_peremption:      '',
        prix_achat_reel:      l.prix_unitaire_estime,
        has_anomalie:         false,
        type_anomalie:        '',
        description_anomalie: '',
      }))
    );
    setNumeroBon('');
    setDateReception(new Date().toISOString().slice(0, 16));
  }, [open, commande]);

  const updateLigne = (i: number, key: string, value: any) =>
    setLignes(p => p.map((l, idx) => idx === i ? { ...l, [key]: value } : l));

  const handleSubmit = async () => {
    if (!numeroBon.trim()) {
      toast.error('Le numéro de bon de livraison est obligatoire.');
      return;
    }
    const lignesInvalides = lignes.filter(l => !l.numero_lot || !l.date_peremption);
    if (lignesInvalides.length > 0) {
      toast.error('Remplissez le numéro de lot et la date de péremption pour chaque médicament.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        commande:            commande.id,
        numero_bon_livraison: numeroBon.trim(),
        date_reception:      new Date(dateReception).toISOString(),
        lignes: lignes.map(l => ({
          medicament:       l.medicament,
          quantite_recue:   l.quantite_recue,
          numero_lot:       l.numero_lot,
          date_peremption:  l.date_peremption,
          prix_achat_reel:  l.prix_achat_reel,
          has_anomalie:     l.has_anomalie,
        })),
      };

      await api.post('/receptions/', payload);

      // Créer les anomalies si nécessaire
      const reception = await api.get('/receptions/');
      const receptionsCrees = (reception.data as any).results || reception.data;

      toast.success('✅ Réception enregistrée ! Stock mis à jour.', { duration: 5000 });
      onDone();
      onClose();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        JSON.stringify(err.response?.data) ||
        'Erreur lors de l\'enregistrement.';
      toast.error(detail);
      console.error('Erreur réception:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const TYPES_ANOMALIE = [
    'PRODUIT_NON_CONFORME',
    'MEDICAMENT_ENDOMMAGE',
    'PEREMPTION_INSUFFISANTE',
    'QUANTITE_MANQUANTE',
  ];

  const LABELS_ANOMALIE: Record<string, string> = {
    PRODUIT_NON_CONFORME:    'Produit non conforme',
    MEDICAMENT_ENDOMMAGE:    'Médicament endommagé',
    PEREMPTION_INSUFFISANTE: 'Péremption insuffisante (< 6 mois)',
    QUANTITE_MANQUANTE:      'Quantité manquante',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShipping sx={{ color: '#2E7D32' }} />
          <Box>
            <Typography fontWeight={700} color="#1B5E20">
              Enregistrer une réception
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Commande {commande.reference} — {commande.fournisseur_nom}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Informations générales */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <TextField
            label="N° bon de livraison *"
            value={numeroBon}
            onChange={e => setNumeroBon(e.target.value)}
            placeholder="ex: BL-2026-001"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Date de réception *"
            type="datetime-local"
            value={dateReception}
            onChange={e => setDateReception(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#1B5E20" sx={{ mb: 2 }}>
          Médicaments reçus
        </Typography>

        {lignes.map((ligne, i) => (
          <Card key={i} elevation={0} sx={{
            border: ligne.has_anomalie ? '1px solid #FFCDD2' : '1px solid #E8F5E9',
            borderRadius: 2, p: 2, mb: 2,
            bgcolor: ligne.has_anomalie ? '#FFF8F8' : '#F9FBF9',
          }}>
            {/* En-tête médicament */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography fontWeight={700} color="#1B5E20" fontSize={14}>
                {ligne.medicament_nom}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Commandé : {ligne.quantite_commandee} unités
              </Typography>
            </Box>

            {/* Champs de réception */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <TextField
                label="Qté reçue *"
                type="number"
                value={ligne.quantite_recue}
                onChange={e => {
                  const val = Number(e.target.value);
                  updateLigne(i, 'quantite_recue', val);
                  // Si qté reçue < commandée → anomalie quantité manquante automatique
                  if (val < ligne.quantite_commandee && val > 0) {
                    updateLigne(i, 'has_anomalie', true);
                    updateLigne(i, 'type_anomalie', 'QUANTITE_MANQUANTE');
                  }
                }}
                inputProps={{ min: 0, max: ligne.quantite_commandee }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                label="N° lot *"
                value={ligne.numero_lot}
                onChange={e => updateLigne(i, 'numero_lot', e.target.value)}
                placeholder="ex: LOT-2026A"
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                label="Date péremption *"
                type="date"
                value={ligne.date_peremption}
                onChange={e => {
                  updateLigne(i, 'date_peremption', e.target.value);
                  // Péremption < 6 mois → alerte automatique
                  const datePerem = new Date(e.target.value);
                  const dans6Mois = new Date();
                  dans6Mois.setMonth(dans6Mois.getMonth() + 6);
                  if (datePerem < dans6Mois) {
                    updateLigne(i, 'has_anomalie', true);
                    updateLigne(i, 'type_anomalie', 'PEREMPTION_INSUFFISANTE');
                  }
                }}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                label="Prix achat réel (FCFA) *"
                type="number"
                value={ligne.prix_achat_reel}
                onChange={e => updateLigne(i, 'prix_achat_reel', e.target.value)}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Box>

            {/* Signaler une anomalie */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: ligne.has_anomalie ? 1.5 : 0 }}>
              <Button
                size="small"
                variant={ligne.has_anomalie ? 'contained' : 'outlined'}
                color={ligne.has_anomalie ? 'error' : 'inherit'}
                onClick={() => updateLigne(i, 'has_anomalie', !ligne.has_anomalie)}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: 12 }}
              >
                {ligne.has_anomalie ? '⚠️ Anomalie signalée' : '+ Signaler une anomalie'}
              </Button>
              {ligne.has_anomalie && (
                <Typography variant="caption" color="error">
                  Ce médicament sera traité selon le type d'anomalie
                </Typography>
              )}
            </Box>

            {ligne.has_anomalie && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5 }}>
                <FormControl size="small">
                  <InputLabel>Type d'anomalie</InputLabel>
                  <Select
                    value={ligne.type_anomalie}
                    label="Type d'anomalie"
                    onChange={e => updateLigne(i, 'type_anomalie', e.target.value)}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {TYPES_ANOMALIE.map(t => (
                      <MenuItem key={t} value={t}>{LABELS_ANOMALIE[t]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Description"
                  size="small"
                  value={ligne.description_anomalie}
                  onChange={e => updateLigne(i, 'description_anomalie', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Box>
            )}
          </Card>
        ))}

        {/* Légende anomalies */}
        <Card elevation={0} sx={{ bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 2, p: 1.5 }}>
          <Typography variant="caption" color="#F57F17" fontWeight={600}>
            ℹ️ Règles automatiques :
          </Typography>
          <Typography variant="caption" color="#795548" display="block">
            • Produit non conforme → bon de retour automatique, non intégré au stock
          </Typography>
          <Typography variant="caption" color="#795548" display="block">
            • Médicament endommagé → placé en stock quarantaine
          </Typography>
          <Typography variant="caption" color="#795548" display="block">
            • Péremption &lt; 6 mois → alerte bloquante, confirmation requise
          </Typography>
          <Typography variant="caption" color="#795548" display="block">
            • Quantité manquante → commande passe en statut "Partielle"
          </Typography>
        </Card>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#A5D6A7', color: '#2E7D32' }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #43A047, #1B5E20)',
          }}>
          {loading ? 'Enregistrement...' : 'Enregistrer la réception'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Ligne commande dans le tableau ────────────────────────────────────────────
function CommandeRow({
  commande,
  medicaments,
  onRefresh,
}: {
  commande: Commande;
  medicaments: any[];
  onRefresh: () => void;
}) {
  const [open,           setOpen]           = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [receptionOpen,  setReceptionOpen]  = useState(false);
  const sc = STATUT_CONFIG[commande.statut];

  const handleAction = async (action: () => Promise<any>, msg: string) => {
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      await action();
      toast.success('Action effectuée avec succès !');
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'action.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TableRow hover sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
        <TableCell>
          <Typography fontWeight={700} fontSize={14} color="#0D47A1">{commande.reference}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(commande.date_creation).toLocaleDateString('fr-FR')}
          </Typography>
        </TableCell>
        <TableCell><Typography fontSize={13}>{commande.fournisseur_nom}</Typography></TableCell>
        <TableCell>
          <Typography fontSize={13}>
            {commande.date_livraison_prevue
              ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR')
              : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography fontWeight={700} color="#1565C0">
            {Number(commande.montant_total).toLocaleString()} FCFA
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label={sc.label} size="small"
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Voir lignes */}
            <Tooltip title={open ? 'Masquer' : 'Voir les lignes'}>
              <IconButton size="small" sx={{ color: '#2196F3' }} onClick={() => setOpen(!open)}>
                {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Envoyer */}
            {['BROUILLON', 'EN_ATTENTE'].includes(commande.statut) && commande.modifiable && (
              <Tooltip title="Envoyer au fournisseur (email + SMS)">
                <IconButton size="small" sx={{ color: '#4CAF50' }} disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.envoyer(commande.id),
                    `Envoyer la commande ${commande.reference} ? Le fournisseur sera notifié.`
                  )}>
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Enregistrer réception ← NOUVEAU */}
            {commande.statut === 'EN_ATTENTE' && (
              <Tooltip title="Enregistrer une réception / livraison">
                <IconButton
                  size="small"
                  sx={{ color: '#2E7D32' }}
                  disabled={loading}
                  onClick={() => setReceptionOpen(true)}
                >
                  <LocalShipping fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Réception partielle → aussi accessible */}
            {commande.statut === 'PARTIELLE' && (
              <Tooltip title="Enregistrer une réception complémentaire">
                <IconButton
                  size="small"
                  sx={{ color: '#F57F17' }}
                  disabled={loading}
                  onClick={() => setReceptionOpen(true)}
                >
                  <LocalShipping fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Annuler */}
            {!['LIVREE', 'ANNULEE'].includes(commande.statut) && (
              <Tooltip title="Annuler la commande">
                <IconButton size="small" sx={{ color: '#F44336' }} disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.annuler(commande.id),
                    `Annuler la commande ${commande.reference} ? Le fournisseur sera notifié par email. Action irréversible.`
                  )}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Clôturer */}
            {['LIVREE', 'PARTIELLE'].includes(commande.statut) && (
              <Tooltip title="Clôturer la commande">
                <IconButton size="small" sx={{ color: '#9C27B0' }} disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.cloture(commande.id),
                    `Clôturer la commande ${commande.reference} ?`
                  )}>
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Cadenas non modifiable */}
            {!commande.modifiable && commande.statut === 'EN_ATTENTE' && (
              <Tooltip title="Non modifiable (plus de 24h)">
                <Lock fontSize="small" sx={{ color: '#BDBDBD', ml: 0.5 }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>

      {/* Lignes détail */}
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, bgcolor: '#F8FBFF', borderRadius: 2, p: 2 }}>
              <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 1.5 }}>
                Lignes de commande
              </Typography>
              {commande.lignes.length === 0 ? (
                <Typography color="text.secondary" fontSize={13}>Aucune ligne.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Médicament', 'Qté commandée', 'Qté reçue', 'Prix unitaire', 'Total'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commande.lignes.map((ligne, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Typography fontSize={13} fontWeight={600}>
                            {ligne.medicament_nom || `Médicament #${ligne.medicament}`}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography fontSize={13}>{ligne.quantite_commandee}</Typography></TableCell>
                        <TableCell>
                          <Typography
                            fontSize={13}
                            color={(ligne.quantite_recue ?? 0) >= ligne.quantite_commandee ? '#2E7D32' : '#F57F17'}
                          >
                            {ligne.quantite_recue ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13}>
                            {Number(ligne.prix_unitaire_estime).toLocaleString()} FCFA
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13} fontWeight={600} color="#1565C0">
                            {(ligne.quantite_commandee * Number(ligne.prix_unitaire_estime)).toLocaleString()} FCFA
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {/* Dialog réception */}
      <ReceptionDialog
        commande={commande}
        open={receptionOpen}
        onClose={() => setReceptionOpen(false)}
        onDone={onRefresh}
      />
    </>
  );
}

// ── Dialog Nouvelle Commande ──────────────────────────────────────────────────
function NouvelleCommandeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fournisseurs,  setFournisseurs]  = useState<any[]>([]);
  const [medicaments,   setMedicaments]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [fournisseur,   setFournisseur]   = useState<number | ''>('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [lignes, setLignes] = useState([
    { medicament: '' as number | '', quantite_commandee: 1, prix_unitaire_estime: '' },
  ]);

  useEffect(() => {
    if (!open) return;
    fournisseurService.getAll().then(r => {
      const data = r.data as any;
      setFournisseurs(Array.isArray(data) ? data : data.results ?? []);
    }).catch(() => {});
    medicamentService.getAll().then((r: any) => {
      const data = r.data;
      setMedicaments(Array.isArray(data) ? data : data.results ?? []);
    }).catch(() => {});
  }, [open]);

  const addLigne    = () => setLignes(p => [...p, { medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);
  const removeLigne = (i: number) => setLignes(p => p.filter((_, idx) => idx !== i));

  const updateLigne = (i: number, key: string, value: any) => {
    setLignes(p => p.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [key]: value };

      // ← AUTO-REMPLISSAGE DU PRIX quand on change le médicament
      if (key === 'medicament') {
        const med = medicaments.find(m => m.id === value);
        if (med) {
          // Utilise prix_achat si disponible, sinon prix_vente
          const prix = med.prix_achat ?? med.prix_vente ?? med.prix_unitaire ?? '';
          updated.prix_unitaire_estime = prix ? String(prix) : '';
        }
      }
      return updated;
    }));
  };

  const totalGeneral = lignes.reduce(
    (sum, l) => sum + (l.quantite_commandee * Number(l.prix_unitaire_estime || 0)), 0
  );

  const handleSubmit = async (action: 'brouillon' | 'envoyer') => {
    if (!fournisseur) { toast.error('Sélectionnez un fournisseur.'); return; }
    const lignesValides = lignes.filter(l => l.medicament && l.prix_unitaire_estime);
    if (lignesValides.length === 0) { toast.error('Ajoutez au moins une ligne valide.'); return; }

    setLoading(true);
    try {
      const res = await commandeService.create({
        fournisseur: Number(fournisseur),
        date_livraison_prevue: dateLivraison || undefined,
        lignes: lignesValides.map(l => ({
          medicament:           Number(l.medicament),
          quantite_commandee:   l.quantite_commandee,
          prix_unitaire_estime: String(l.prix_unitaire_estime),
        })),
      });

      const commandeId = (res.data as any).id;

      if (action === 'envoyer' && commandeId) {
        await commandeService.envoyer(commandeId);
        toast.success('✅ Commande envoyée ! Le fournisseur est notifié par email.', { duration: 5000 });
      } else {
        toast.success('📋 Commande enregistrée en brouillon.');
      }

      setFournisseur('');
      setDateLivraison('');
      setLignes([{ medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);
      onCreated();
      onClose();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        JSON.stringify(err.response?.data) ||
        'Erreur lors de la création.';
      toast.error(detail);
      console.error('Erreur commande:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">Nouveau bon de commande</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Fournisseur *</InputLabel>
            <Select value={fournisseur} label="Fournisseur *"
              onChange={e => setFournisseur(e.target.value as number)}
              sx={{ borderRadius: 2 }}>
              {fournisseurs.filter(f => f.est_actif).map(f => (
                <MenuItem key={f.id} value={f.id}>{f.nom_societe}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Date de livraison prévue" type="date" value={dateLivraison}
            onChange={e => setDateLivraison(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2 }}>Lignes de commande</Typography>

        {lignes.map((ligne, i) => (
          <Box key={i} sx={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: 1.5, mb: 1.5, alignItems: 'center',
          }}>
            <FormControl>
              <InputLabel>Médicament *</InputLabel>
              <Select value={ligne.medicament} label="Médicament *"
                onChange={e => updateLigne(i, 'medicament', e.target.value)}
                sx={{ borderRadius: 2 }}>
                {medicaments.filter(m => m.est_actif).map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.nom_commercial}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Quantité *" type="number" value={ligne.quantite_commandee}
              onChange={e => updateLigne(i, 'quantite_commandee', Number(e.target.value))}
              inputProps={{ min: 1 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField
              label="Prix unitaire (FCFA) *"
              type="number"
              value={ligne.prix_unitaire_estime}
              onChange={e => updateLigne(i, 'prix_unitaire_estime', e.target.value)}
              // Helpertext discret si auto-rempli
              helperText={ligne.medicament && ligne.prix_unitaire_estime ? '✓ auto-rempli' : ''}
              FormHelperTextProps={{ sx: { color: '#43A047', fontSize: 10 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button size="small" color="error" onClick={() => removeLigne(i)}
              disabled={lignes.length === 1}>✕</Button>
          </Box>
        ))}

        <Button variant="outlined" size="small" onClick={addLigne}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}>
          + Ajouter une ligne
        </Button>

        <Box sx={{
          mt: 3, p: 2, bgcolor: '#E3F2FD', borderRadius: 2,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Typography fontWeight={600} color="#0D47A1">Total estimé</Typography>
          <Typography variant="h5" fontWeight={800} color="#1565C0">
            {totalGeneral.toLocaleString()} FCFA
          </Typography>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={() => handleSubmit('brouillon')} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', color: '#607D8B', borderColor: '#B0BEC5' }}>
          Enregistrer brouillon
        </Button>
        <Button onClick={() => handleSubmit('envoyer')} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
          }}>
          {loading ? 'Envoi...' : 'Valider et envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommandesPage() {
  const [commandes,    setCommandes]    = useState<Commande[]>([]);
  const [medicaments,  setMedicaments]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [dialogOpen,   setDialogOpen]   = useState(false);

  const fetchCommandes = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await commandeService.getAll();
      const data = res.data as any;
      setCommandes(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      setError('Erreur lors du chargement des commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandes();
    medicamentService.getAll().then((r: any) => {
      const data = r.data;
      setMedicaments(Array.isArray(data) ? data : data.results ?? []);
    }).catch(() => {});
  }, []);

  const commandesFiltrees = commandes.filter(c =>
    filterStatut === 'tous' ? true : c.statut === filterStatut
  );

  const kpis = {
    total:      commandes.length,
    en_attente: commandes.filter(c => c.statut === 'EN_ATTENTE').length,
    livrees:    commandes.filter(c => c.statut === 'LIVREE').length,
    montant:    commandes.reduce((s, c) => s + Number(c.montant_total), 0),
  };

  return (
    <Box>
      <Toaster position="top-right" />

      <Box sx={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">Gestion des Commandes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Créez et suivez vos bons de commande fournisseurs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchCommandes} sx={{ color: '#2196F3' }}><Refresh /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)',
              boxShadow: '0 4px 15px rgba(33,150,243,0.3)',
            }}>
            Nouveau bon de commande
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total commandes', value: kpis.total,      color: '#2196F3' },
          { label: 'En attente',      value: kpis.en_attente, color: '#1565C0' },
          { label: 'Livrées',         value: kpis.livrees,    color: '#2E7D32' },
        ].map(({ label, value, color }) => (
          <Card key={label} elevation={0} sx={{
            p: 2.5, border: '1px solid #E3F2FD', borderRadius: 3, flex: 1, minWidth: 140,
          }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
            <Typography variant="h4" fontWeight={900} color={color} sx={{ my: 0.5 }}>{value}</Typography>
          </Card>
        ))}
        <Card elevation={0} sx={{
          p: 2.5, border: '1px solid #E3F2FD', borderRadius: 3, flex: 2, minWidth: 200,
        }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>Volume total</Typography>
          <Typography variant="h5" fontWeight={900} color="#1565C0" sx={{ my: 0.5 }}>
            {kpis.montant.toLocaleString()} FCFA
          </Typography>
        </Card>
      </Box>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
            Filtrer :
          </Typography>
          {[
            { value: 'tous',       label: 'Toutes' },
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'PARTIELLE',  label: 'Partielle' },
            { value: 'LIVREE',     label: 'Livrée' },
            { value: 'ANNULEE',    label: 'Annulée' },
          ].map(({ value, label }) => (
            <Chip key={value} label={label} onClick={() => setFilterStatut(value)}
              sx={{
                cursor: 'pointer',
                fontWeight: filterStatut === value ? 700 : 400,
                bgcolor:    filterStatut === value ? '#1565C0' : '#F5F5F5',
                color:      filterStatut === value ? 'white'   : '#546E7A',
              }} />
          ))}
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                {['Référence', 'Fournisseur', 'Livraison prévue', 'Montant', 'Statut', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: '#546E7A', fontSize: 12, py: 1.5 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : commandesFiltrees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Aucune commande trouvée.
                  </TableCell>
                </TableRow>
              ) : commandesFiltrees.map(commande => (
                <CommandeRow
                  key={commande.id}
                  commande={commande}
                  medicaments={medicaments}
                  onRefresh={fetchCommandes}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <NouvelleCommandeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchCommandes}
      />
    </Box>
  );
}