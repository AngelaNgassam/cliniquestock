import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Divider, Collapse,
} from '@mui/material';
import {
  Add, Send, Cancel, Lock,
  ExpandMore, ExpandLess, Refresh, ShoppingCart,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import commandeService from '../../services/commandeService';
import type { Commande, StatutCommande } from '../../services/commandeService';
// ✅ Imports statiques — plus d'imports dynamiques
import fournisseurService from '../../services/fournisseurService';
import { medicamentService } from '../../services/medicamentService';

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<StatutCommande, { label: string; bg: string; color: string }> = {
  BROUILLON:  { label: 'Brouillon',  bg: '#F5F5F5', color: '#607D8B' },
  EN_ATTENTE: { label: 'En attente', bg: '#E3F2FD', color: '#1565C0' },
  PARTIELLE:  { label: 'Partielle',  bg: '#FFF9C4', color: '#F57F17' },
  LIVREE:     { label: 'Livrée',     bg: '#E8F5E9', color: '#2E7D32' },
  ANNULEE:    { label: 'Annulée',    bg: '#FFEBEE', color: '#C62828' },
};

// ── Ligne expandable ──────────────────────────────────────────────────────────
function CommandeRow({
  commande, onRefresh,
}: { commande: Commande; onRefresh: () => void }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
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
        {/* Référence */}
        <TableCell>
          <Typography fontWeight={700} fontSize={14} color="#0D47A1">
            {commande.reference}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(commande.date_creation).toLocaleDateString('fr-FR')}
          </Typography>
        </TableCell>

        {/* Fournisseur */}
        <TableCell>
          <Typography fontSize={13}>{commande.fournisseur_nom}</Typography>
        </TableCell>

        {/* Livraison prévue */}
        <TableCell>
          <Typography fontSize={13}>
            {commande.date_livraison_prevue
              ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR')
              : '—'}
          </Typography>
        </TableCell>

        {/* Montant */}
        <TableCell>
          <Typography fontWeight={700} color="#1565C0">
            {Number(commande.montant_total).toLocaleString()} FCFA
          </Typography>
        </TableCell>

        {/* Statut */}
        <TableCell>
          <Chip label={sc.label} size="small"
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
        </TableCell>

        {/* Actions */}
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Voir les lignes */}
            <Tooltip title={open ? 'Masquer les lignes' : 'Voir les lignes'}>
              <IconButton size="small" sx={{ color: '#2196F3' }}
                onClick={() => setOpen(!open)}>
                {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Envoyer */}
            {commande.statut === 'BROUILLON' && commande.modifiable && (
              <Tooltip title="Envoyer la commande">
                <IconButton size="small" sx={{ color: '#4CAF50' }}
                  disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.envoyer(commande.id),
                    `Envoyer la commande ${commande.reference} au fournisseur ?`
                  )}>
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Annuler */}
            {!['LIVREE', 'ANNULEE'].includes(commande.statut) && (
              <Tooltip title="Annuler la commande">
                <IconButton size="small" sx={{ color: '#F44336' }}
                  disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.annuler(commande.id),
                    `Annuler la commande ${commande.reference} ? Cette action est irréversible.`
                  )}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Clôturer */}
            {['LIVREE', 'PARTIELLE'].includes(commande.statut) && (
              <Tooltip title="Clôturer la commande">
                <IconButton size="small" sx={{ color: '#9C27B0' }}
                  disabled={loading}
                  onClick={() => handleAction(
                    () => commandeService.cloture(commande.id),
                    `Clôturer la commande ${commande.reference} ?`
                  )}>
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Non modifiable après 24h */}
            {!commande.modifiable && commande.statut === 'BROUILLON' && (
              <Tooltip title="Non modifiable (plus de 24h)">
                <Lock fontSize="small" sx={{ color: '#BDBDBD', ml: 0.5 }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>

      {/* Lignes expandable */}
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
                      {['Médicament', 'Qté commandée', 'Qté reçue', 'Prix unitaire', 'Total ligne'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A' }}>
                          {h}
                        </TableCell>
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
                        <TableCell>
                          <Typography fontSize={13}>{ligne.quantite_commandee}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13}
                            color={(ligne.quantite_recue ?? 0) >= ligne.quantite_commandee ? '#2E7D32' : '#F57F17'}>
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
    </>
  );
}

// ── Dialog Nouvelle Commande ──────────────────────────────────────────────────
function NouvelleCommandeDialog({
  open, onClose, onCreated,
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

  // ✅ Imports statiques — plus d'imports dynamiques
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

  const addLigne = () =>
    setLignes(prev => [...prev, { medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);

  const removeLigne = (i: number) =>
    setLignes(prev => prev.filter((_, idx) => idx !== i));

  const updateLigne = (i: number, key: string, value: any) =>
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: value } : l));

  const totalGeneral = lignes.reduce(
    (sum, l) => sum + (l.quantite_commandee * Number(l.prix_unitaire_estime || 0)), 0
  );

  const handleSubmit = async (statut: 'BROUILLON' | 'EN_ATTENTE') => {
    if (!fournisseur) { toast.error('Sélectionnez un fournisseur.'); return; }
    const lignesValides = lignes.filter(l => l.medicament && l.prix_unitaire_estime);
    if (lignesValides.length === 0) { toast.error('Ajoutez au moins une ligne valide.'); return; }

    setLoading(true);
    try {
      await commandeService.create({
        fournisseur: Number(fournisseur),
        date_livraison_prevue: dateLivraison || undefined,
        statut,
        lignes: lignesValides.map(l => ({
          medicament:           Number(l.medicament),
          quantite_commandee:   l.quantite_commandee,
          prix_unitaire_estime: l.prix_unitaire_estime,
        })),
      });
      toast.success(
        statut === 'BROUILLON'
          ? 'Commande enregistrée en brouillon !'
          : 'Commande envoyée au fournisseur !'
      );
      // Reset le formulaire
      setFournisseur('');
      setDateLivraison('');
      setLignes([{ medicament: '', quantite_commandee: 1, prix_unitaire_estime: '' }]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">
            Nouveau bon de commande
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Fournisseur + date */}
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
          <TextField
            label="Date de livraison prévue"
            type="date"
            value={dateLivraison}
            onChange={e => setDateLivraison(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2 }}>
          Lignes de commande
        </Typography>

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
                {medicaments.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.nom_commercial}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantité *" type="number"
              value={ligne.quantite_commandee}
              onChange={e => updateLigne(i, 'quantite_commandee', Number(e.target.value))}
              inputProps={{ min: 1 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Prix unitaire (FCFA) *" type="number"
              value={ligne.prix_unitaire_estime}
              onChange={e => updateLigne(i, 'prix_unitaire_estime', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button size="small" color="error"
              onClick={() => removeLigne(i)}
              disabled={lignes.length === 1}>
              ✕
            </Button>
          </Box>
        ))}

        <Button variant="outlined" size="small" onClick={addLigne}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}>
          + Ajouter une ligne
        </Button>

        {/* Total */}
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
        <Button onClick={() => handleSubmit('BROUILLON')} variant="outlined"
          disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', color: '#607D8B', borderColor: '#B0BEC5' }}>
          Enregistrer brouillon
        </Button>
        <Button onClick={() => handleSubmit('EN_ATTENTE')} variant="contained"
          disabled={loading}
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

  useEffect(() => { fetchCommandes(); }, []);

  const commandesFiltrees = commandes.filter(c =>
    filterStatut === 'tous' ? true : c.statut === filterStatut
  );

  const kpis = {
    total:      commandes.length,
    brouillon:  commandes.filter(c => c.statut === 'BROUILLON').length,
    en_attente: commandes.filter(c => c.statut === 'EN_ATTENTE').length,
    livrees:    commandes.filter(c => c.statut === 'LIVREE').length,
    montant:    commandes.reduce((s, c) => s + Number(c.montant_total), 0),
  };

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Gestion des Commandes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Créez et suivez vos bons de commande fournisseurs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchCommandes} sx={{ color: '#2196F3' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
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
          { label: 'Brouillons',      value: kpis.brouillon,  color: '#607D8B' },
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

      {/* Filtres statut */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
            Filtrer :
          </Typography>
          {[
            { value: 'tous',       label: 'Toutes' },
            { value: 'BROUILLON',  label: 'Brouillon' },
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'PARTIELLE',  label: 'Partielle' },
            { value: 'LIVREE',     label: 'Livrée' },
            { value: 'ANNULEE',    label: 'Annulée' },
          ].map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              onClick={() => setFilterStatut(value)}
              sx={{
                cursor: 'pointer',
                fontWeight: filterStatut === value ? 700 : 400,
                bgcolor:    filterStatut === value ? '#1565C0' : '#F5F5F5',
                color:      filterStatut === value ? 'white'   : '#546E7A',
              }}
            />
          ))}
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau */}
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
                  onRefresh={fetchCommandes}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog */}
      <NouvelleCommandeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchCommandes}
      />
    </Box>
  );
}