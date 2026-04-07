import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Chip, CircularProgress,
  Divider, IconButton, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Alert, Tooltip, Badge,
} from '@mui/material';
import {
  ArrowBack, Edit, QrCode, LocalPharmacy, CheckCircle,
  Archive, Unarchive, Add, TrendingDown, TrendingUp,
  SwapHoriz, DeleteForever, BrokenImage, Science,
  Inventory2, Warning, WarningAmber, Send,
  Download,
} from '@mui/icons-material';
import api from '../../services/authService';

interface Medicament {
  id: number; nom_commercial: string; dci: string;
  forme_galenique: string; dosage: string; unite_stock: string;
  prix_unitaire: string; seuil_alerte: number;
  conditions_stockage: string; indications_therapeutiques: string;
  code_barres: string; est_actif: boolean;
  categorie: number; categorie_nom: string;
}

interface LotStock {
  id: number; numero_lot: string; date_peremption: string;
  quantite_disponible: number; prix_achat: number;
  statut: string; expire: boolean; proche_peremption: boolean;
}

interface Mouvement {
  id: number; type_mouvement: string; motif: string;
  quantite: number; date_operation: string; operateur: string;
  numero_lot: string; numero_ordre?: string; patient_nom?: string;
}

const TYPE_SORTIE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode; description: string;
}> = {
  DISPENSATION: {
    label: 'Dispensation', color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9',
    icon: <LocalPharmacy sx={{ fontSize: 20, color: '#1565C0' }} />,
    description: 'Remise à un patient sur ordonnance ou vente directe',
  },
  DESTRUCTION: {
    label: 'Destruction', color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A',
    icon: <DeleteForever sx={{ fontSize: 20, color: '#C62828' }} />,
    description: 'Médicament périmé ou non utilisable retiré du stock',
  },
  TRANSFERT: {
    label: 'Transfert', color: '#6A1B9A', bg: '#F3E5F5', border: '#CE93D8',
    icon: <SwapHoriz sx={{ fontSize: 20, color: '#6A1B9A' }} />,
    description: 'Envoi vers une autre unité ou clinique',
  },
  CASSE: {
    label: 'Casse', color: '#E65100', bg: '#FFF3E0', border: '#FFCC02',
    icon: <BrokenImage sx={{ fontSize: 20, color: '#E65100' }} />,
    description: 'Médicament accidentellement endommagé ou inutilisable',
  },
};

const MVT_STYLE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ENTREE:     { color: '#2E7D32', bg: '#E8F5E9', icon: <TrendingUp  sx={{ fontSize: 16, color: '#2E7D32' }} /> },
  SORTIE:     { color: '#C62828', bg: '#FFEBEE', icon: <TrendingDown sx={{ fontSize: 16, color: '#C62828' }} /> },
  AJUSTEMENT: { color: '#F57F17', bg: '#FFF8E1', icon: <Science      sx={{ fontSize: 16, color: '#F57F17' }} /> },
  TRANSFERT:  { color: '#6A1B9A', bg: '#F3E5F5', icon: <SwapHoriz   sx={{ fontSize: 16, color: '#6A1B9A' }} /> },
};

// ── Dialog Sortie de Stock ────────────────────────────────────────────────────
function SortieStockDialog({
  med, lots, open, onClose, onDone,
}: {
  med: Medicament; lots: LotStock[]; open: boolean;
  onClose: () => void; onDone: () => void;
}) {
  const [typeSortie,   setTypeSortie]   = useState('DISPENSATION');
  const [lotId,        setLotId]        = useState<number | ''>('');
  const [quantite,     setQuantite]     = useState(1);
  const [patientNom,   setPatientNom]   = useState('');
  const [prescripteur, setPrescripteur] = useState('');
  const [ordonnance,   setOrdonnance]   = useState('');
  const [destination,  setDestination]  = useState('');
  const [motif,        setMotif]        = useState('');
  const [commentaire,  setCommentaire]  = useState('');
  const [confirme,     setConfirme]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const config = TYPE_SORTIE_CONFIG[typeSortie];
  const lotsDispos = lots.filter(l => l.statut === 'DISPONIBLE' && l.quantite_disponible > 0);
  const lotSelectionne = lotsDispos.find(l => l.id === lotId);
  const needsConfirm = ['DESTRUCTION', 'CASSE'].includes(typeSortie);

  const handleSubmit = async () => {
    if (needsConfirm && !confirme) { setConfirme(true); return; }
    setLoading(true);
    setError('');
    try {
      const payload: any = {
        medicament_id: med.id,
        quantite,
        commentaire,
      };
      if (lotId)        payload.lot_id        = lotId;
      if (patientNom)   payload.patient_nom   = patientNom;
      if (prescripteur) payload.prescripteur  = prescripteur;
      if (ordonnance)   payload.num_ordonnance = ordonnance;

      // Motif selon type
      const motifMap: Record<string, string> = {
        DISPENSATION: 'Dispensation',
        DESTRUCTION:  `Destruction — ${motif}`,
        TRANSFERT:    `Transfert → ${destination}`,
        CASSE:        `Casse — ${commentaire}`,
      };
      payload.commentaire = motifMap[typeSortie] + (commentaire ? ` | ${commentaire}` : '');

      await api.post('/sorties/', payload);
      onDone();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.quantite?.[0] ||
        err.response?.data?.medicament_id?.[0] ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Erreur lors de la sortie.'
      );
      setConfirme(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: config.bg, border: `1px solid ${config.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {config.icon}
          </Box>
          <Box>
            <Typography fontWeight={800} color="#1A1A2E">Enregistrer une sortie</Typography>
            <Typography variant="caption" color="text.secondary">{med.nom_commercial}</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        {confirme && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            ⚠️ <strong>Opération irréversible.</strong> Une fois validée, cette sortie ne peut pas être annulée et impacte définitivement le stock.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* Type de sortie */}
        <Typography fontWeight={700} fontSize={13} color="#546E7A" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Type de sortie
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 3 }}>
          {Object.entries(TYPE_SORTIE_CONFIG).map(([val, cfg]) => (
            <Box key={val} onClick={() => { setTypeSortie(val); setConfirme(false); }}
              sx={{
                p: 1.5, borderRadius: 2, cursor: 'pointer',
                border: `2px solid ${typeSortie === val ? cfg.color : '#E0E0E0'}`,
                bgcolor: typeSortie === val ? cfg.bg : 'white',
                transition: 'all 0.15s',
                '&:hover': { border: `2px solid ${cfg.color}`, bgcolor: cfg.bg },
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {cfg.icon}
                <Box>
                  <Typography fontWeight={700} fontSize={12} color={typeSortie === val ? cfg.color : '#424242'}>
                    {cfg.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    {cfg.description.slice(0, 38)}…
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Lot & Quantité */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Lot (optionnel — FEFO auto)</InputLabel>
            <Select value={lotId} label="Lot (optionnel — FEFO auto)"
              onChange={e => setLotId(e.target.value as number)}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="">Sélection automatique (FEFO)</MenuItem>
              {lotsDispos.map(l => (
                <MenuItem key={l.id} value={l.id}>
                  {l.numero_lot} — {l.quantite_disponible} unités
                  {l.proche_peremption && ' ⚠️'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Quantité *" type="number" size="small" value={quantite}
            onChange={e => setQuantite(Number(e.target.value))}
            inputProps={{ min: 1, max: lotSelectionne?.quantite_disponible }}
            helperText={lotSelectionne ? `Stock lot : ${lotSelectionne.quantite_disponible}` : ''}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>

        {/* Champs selon type */}
        {typeSortie === 'DISPENSATION' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Nom du patient" size="small" value={patientNom}
              onChange={e => setPatientNom(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Prescripteur" size="small" value={prescripteur}
              onChange={e => setPrescripteur(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="N° Ordonnance (optionnel)" size="small" value={ordonnance}
              onChange={e => setOrdonnance(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
        )}

        {typeSortie === 'TRANSFERT' && (
          <TextField label="Destination (unité ou clinique) *" size="small" fullWidth value={destination}
            onChange={e => setDestination(e.target.value)} sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        )}

        {['DESTRUCTION', 'CASSE'].includes(typeSortie) && (
          <TextField label={typeSortie === 'DESTRUCTION' ? 'Motif de destruction *' : 'Description de l\'incident *'}
            size="small" fullWidth value={motif} onChange={e => setMotif(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        )}

        <TextField label="Commentaire (optionnel)" size="small" fullWidth multiline rows={2}
          value={commentaire} onChange={e => setCommentaire(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#B0BEC5', color: '#546E7A' }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            bgcolor: confirme ? '#C62828' : config.color,
            '&:hover': { bgcolor: confirme ? '#B71C1C' : config.color },
          }}>
          {loading ? <CircularProgress size={18} color="inherit" />
            : confirme ? '⚠️ Confirmer définitivement'
            : needsConfirm ? 'Suivant — Confirmer'
            : 'Enregistrer la sortie'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function MedicamentDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const [med,       setMed]       = useState<Medicament | null>(null);
  const [lots,      setLots]      = useState<LotStock[]>([]);
  const [mvts,      setMvts]      = useState<Mouvement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [sortieOpen, setSortieOpen] = useState(false);
  const [stockTotal, setStockTotal] = useState<number | null>(null);

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [medRes, lotRes, mvtRes] = await Promise.all([
        api.get(`/medicaments/${id}/`),
        api.get(`/stock/${id}/`).catch(() => ({ data: { lots: [] } })),
        api.get(`/mouvements/?medicament_id=${id}`).catch(() => ({ data: [] })),
      ]);
      setMed(medRes.data);
      const lotsData: LotStock[] = lotRes.data.lots || [];
      setLots(lotsData);
      setStockTotal(lotsData.filter(l => l.statut === 'DISPONIBLE').reduce((s, l) => s + l.quantite_disponible, 0));
      const mvtData = mvtRes.data;
      setMvts(Array.isArray(mvtData) ? mvtData : mvtData.results ?? []);
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Médicament introuvable.' : 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleToggle = async () => {
    if (!med) return;
    if (!confirm(med.est_actif ? `Archiver "${med.nom_commercial}" ?` : `Désarchiver "${med.nom_commercial}" ?`)) return;
    await api.post(`/medicaments/${med.id}/${med.est_actif ? 'archiver' : 'restaurer'}/`);
    fetchAll();
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress />
    </Box>
  );
  if (error || !med) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography color="error">{error || 'Médicament introuvable.'}</Typography>
      <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/inventaire')} startIcon={<ArrowBack />}>Retour</Button>
    </Box>
  );

  const en_alerte = stockTotal !== null && stockTotal <= med.seuil_alerte;
  const lotsDispo = lots.filter(l => l.statut === 'DISPONIBLE');
  const lotsQuarantaine = lots.filter(l => l.statut === 'QUARANTAINE');
  const lotsExpires = lots.filter(l => l.expire);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/inventaire')}
          sx={{ bgcolor: '#E3F2FD', '&:hover': { bgcolor: '#BBDEFB' }, mt: 0.5 }}>
          <ArrowBack sx={{ color: '#1565C0' }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            INVENTAIRE › DÉTAIL MÉDICAMENT
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" fontWeight={800} color="#0D47A1">
              {med.nom_commercial}
            </Typography>
            {en_alerte && (
              <Chip icon={<Warning sx={{ fontSize: 14 }} />} label="Stock Faible"
                size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 700, border: '1px solid #FFB300' }} />
            )}
            <Chip label={med.est_actif ? 'Actif' : 'Archivé'} size="small"
              icon={med.est_actif ? <CheckCircle sx={{ fontSize: 14 }} /> : <Archive sx={{ fontSize: 14 }} />}
              sx={{ bgcolor: med.est_actif ? '#E8F5E9' : '#ECEFF1',
                color: med.est_actif ? '#2E7D32' : '#607D8B', fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {med.dci} • {med.forme_galenique} • {med.dosage} • {med.categorie_nom}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => setSortieOpen(true)}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #1976D2, #0D47A1)',
              boxShadow: '0 4px 12px rgba(13,71,161,0.3)',
            }}>
            Ajouter mouvement
          </Button>
          <Button variant="outlined" startIcon={<Edit />}
            onClick={() => navigate(`/admin/inventaire/${med.id}/modifier`)}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
            Modifier
          </Button>
          <Tooltip title={med.est_actif ? 'Archiver' : 'Désarchiver'}>
            <IconButton onClick={handleToggle}
              sx={{ border: '1px solid #E0E0E0', borderRadius: 2,
                color: med.est_actif ? '#F44336' : '#4CAF50' }}>
              {med.est_actif ? <Archive /> : <Unarchive />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── KPIs stock ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card elevation={0} sx={{
          p: 2.5, borderRadius: 3, flex: 1, minWidth: 160,
          border: en_alerte ? '1px solid #FFB300' : '1px solid #C8E6C9',
          background: en_alerte ? 'linear-gradient(135deg, white, #FFF8E1)' : 'linear-gradient(135deg, white, #F1F8E9)',
        }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>
            Stock Actuel
          </Typography>
          <Typography variant="h3" fontWeight={900}
            color={en_alerte ? '#E65100' : '#2E7D32'} sx={{ lineHeight: 1.1, my: 0.5 }}>
            {stockTotal ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Seuil d'alerte : {med.seuil_alerte} unités
          </Typography>
          {en_alerte && (
            <Chip icon={<WarningAmber sx={{ fontSize: 12 }} />} label="En alerte"
              size="small" sx={{ ml: 0, mt: 0.5, bgcolor: '#FFF3E0', color: '#E65100', fontSize: 10 }} />
          )}
        </Card>
        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 130, border: '1px solid #E3F2FD' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>Lots Disponibles</Typography>
          <Typography variant="h3" fontWeight={900} color="#1565C0" sx={{ lineHeight: 1.1, my: 0.5 }}>{lotsDispo.length}</Typography>
          <Typography variant="caption" color="text.secondary">numéros de lot</Typography>
        </Card>
        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 130, border: '1px solid #F3E5F5' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>Quarantaine</Typography>
          <Typography variant="h3" fontWeight={900} color="#6A1B9A" sx={{ lineHeight: 1.1, my: 0.5 }}>{lotsQuarantaine.length}</Typography>
          <Typography variant="caption" color="text.secondary">lots bloqués</Typography>
        </Card>
        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 130, border: '1px solid #FFEBEE' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>Expirés</Typography>
          <Typography variant="h3" fontWeight={900} color="#C62828" sx={{ lineHeight: 1.1, my: 0.5 }}>{lotsExpires.length}</Typography>
          <Typography variant="caption" color="text.secondary">lots périmés</Typography>
        </Card>
        <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, flex: 1.5, minWidth: 160, border: '1px solid #E3F2FD' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>Prix Unitaire</Typography>
          <Typography variant="h4" fontWeight={900} color="#1565C0" sx={{ lineHeight: 1.1, my: 0.5 }}>
            {Number(med.prix_unitaire).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">FCFA</Typography>
        </Card>
      </Box>

      {/* ── Layout 2 colonnes ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>

        {/* Informations techniques */}
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inventory2 sx={{ color: '#1565C0', fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700} color="#0D47A1">Informations Techniques</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {[
            ['Code-barres', med.code_barres],
            ['Unité de stock', med.unite_stock],
            ['Conditions de stockage', med.conditions_stockage || '—'],
            ['Seuil d\'alerte', `${med.seuil_alerte} unités`],
          ].map(([label, val]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F5F5F5' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>
                {label}
              </Typography>
              <Typography fontSize={13} fontWeight={500} color="#1A1A2E">{val}</Typography>
            </Box>
          ))}
        </Card>

        {/* Fournisseur & Notes */}
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LocalPharmacy sx={{ color: '#2E7D32', fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700} color="#0D47A1">Note Clinique</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography fontSize={13} color="#444" sx={{ lineHeight: 1.8 }}>
            {med.indications_therapeutiques || 'Aucune indication renseignée.'}
          </Typography>
          {en_alerte && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFB300' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Warning sx={{ color: '#E65100', fontSize: 18 }} />
                <Typography fontWeight={700} color="#E65100" fontSize={13}>Zone d'alerte</Typography>
              </Box>
              <Typography fontSize={12} color="#795548">
                Le niveau de stock actuel ({stockTotal}) est passé sous le seuil critique de {med.seuil_alerte}.
                Une commande de réapprovisionnement est suggérée immédiatement.
              </Typography>
              <Button size="small" variant="contained" startIcon={<Send sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/admin/commandes')}
                sx={{ mt: 1.5, borderRadius: 1.5, textTransform: 'none', fontSize: 12,
                  bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}>
                Lancer commande automatique
              </Button>
            </Box>
          )}
        </Card>
      </Box>

      {/* ── Lots de stock ── */}
      {lots.length > 0 && (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, bgcolor: '#F0F7FF', borderBottom: '1px solid #BBDEFB',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode sx={{ color: '#1565C0', fontSize: 18 }} />
              <Typography fontWeight={700} color="#0D47A1">Numéro de lot actuel</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{lots.length} lot(s)</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  {['N° de Lot', 'Date d\'expiration', 'Qté disponible', 'Prix achat', 'Statut'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#546E7A', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map(lot => (
                  <TableRow key={lot.id} sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
                    <TableCell>
                      <Typography fontFamily="monospace" fontSize={13} fontWeight={700} color="#1565C0">
                        {lot.numero_lot}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13}
                        color={lot.expire ? '#C62828' : lot.proche_peremption ? '#E65100' : '#424242'}
                        fontWeight={lot.expire || lot.proche_peremption ? 700 : 400}>
                        {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}
                        {lot.expire && ' ⚠️ Expiré'}
                        {!lot.expire && lot.proche_peremption && ' ⚡ < 90j'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={700}>{lot.quantite_disponible}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13}>{Number(lot.prix_achat).toLocaleString()} FCFA</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={lot.statut} size="small"
                        sx={{
                          bgcolor: lot.statut === 'DISPONIBLE' ? '#E8F5E9'
                            : lot.statut === 'QUARANTAINE' ? '#F3E5F5'
                            : lot.statut === 'EPUISE' ? '#ECEFF1' : '#FFEBEE',
                          color: lot.statut === 'DISPONIBLE' ? '#2E7D32'
                            : lot.statut === 'QUARANTAINE' ? '#6A1B9A'
                            : lot.statut === 'EPUISE' ? '#607D8B' : '#C62828',
                          fontWeight: 700, fontSize: 11,
                        }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ── Historique des mouvements ── */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: '#F0F7FF', borderBottom: '1px solid #BBDEFB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown sx={{ color: '#1565C0', fontSize: 18 }} />
            <Typography fontWeight={700} color="#0D47A1">Historique des mouvements</Typography>
            <Typography variant="caption" color="text.secondary">
              Suivi complet des entrées, sorties et ajustements de stock.
            </Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<Download sx={{ fontSize: 14 }} />}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0', fontSize: 12 }}>
            Exporter (PDF)
          </Button>
        </Box>

        {mvts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Aucun mouvement enregistré.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  {['Date', 'Type', 'Quantité', 'Raison', 'Utilisateur'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#546E7A', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {mvts.slice(0, 15).map(mvt => {
                  const style = MVT_STYLE[mvt.type_mouvement] || MVT_STYLE.AJUSTEMENT;
                  const isEntree = mvt.type_mouvement === 'ENTREE';
                  return (
                    <TableRow key={mvt.id} sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
                      <TableCell>
                        <Typography fontSize={12}>
                          {new Date(mvt.date_operation).toLocaleDateString('fr-FR')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(mvt.date_operation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={style.icon as any}
                          label={mvt.type_mouvement}
                          size="small"
                          sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={800} fontSize={14}
                          color={isEntree ? '#2E7D32' : '#C62828'}>
                          {isEntree ? '+' : '-'}{mvt.quantite}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12}>{mvt.motif}</Typography>
                        {mvt.patient_nom && (
                          <Typography variant="caption" color="text.secondary">
                            Patient : {mvt.patient_nom}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} color="text.secondary">{mvt.operateur}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Dialog sortie stock */}
      {med && (
        <SortieStockDialog
          med={med} lots={lots}
          open={sortieOpen}
          onClose={() => setSortieOpen(false)}
          onDone={() => { setSortieOpen(false); fetchAll(); }}
        />
      )}
    </Box>
  );
}