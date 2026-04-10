import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TextField, Chip,
  CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, IconButton,
  Tooltip, LinearProgress,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, Warning, Close,
  Inventory2, ArrowBack, Save,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import inventaireService from '../../services/inventaireService';
import type { LigneInventaire, InventaireSession } from '../../services/inventaireService';

export default function InventairePhysiquePage() {
  const navigate = useNavigate();
  const [sessions,        setSessions]        = useState<InventaireSession[]>([]);
  const [sessionActive,   setSessionActive]   = useState<any | null>(null);
  const [lignes,          setLignes]          = useState<LigneInventaire[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [validating,      setValidating]      = useState(false);
  const [error,           setError]           = useState('');
  const [confirmOpen,     setConfirmOpen]      = useState(false);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res  = await inventaireService.getAll();
      const data = Array.isArray(res.data) ? res.data : [];
      setSessions(data);
      const enCours = data.find((s: any) => s.statut === 'EN_COURS');
      if (enCours) {
        const detail = await inventaireService.getById(enCours.id);
        setSessionActive(detail.data);
        setLignes((detail.data.lignes || []).map((l: LigneInventaire) => ({
          ...l, quantite_physique: l.quantite_theorique, justification: '',
        })));
      }
    } catch { setError('Erreur de chargement.'); }
    finally   { setLoading(false); }
  };

  const handleInitier = async () => {
    setSaving(true);
    try {
      const res = await inventaireService.initier();
      toast.success('Inventaire initié !');
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur.');
    } finally { setSaving(false); }
  };

  const updateLigne = (index: number, field: string, value: any) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      if (field === 'quantite_physique') {
        updated.ecart = Number(value) - l.quantite_theorique;
      }
      return updated;
    }));
  };

  const handleSaisir = async () => {
    if (!sessionActive) return;
    setSaving(true);
    try {
      await inventaireService.saisirLignes(sessionActive.id, lignes);
      toast.success('Quantités enregistrées.');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur de saisie.');
    } finally { setSaving(false); }
  };

  const handleValider = async () => {
    if (!sessionActive) return;
    // Vérifier justifications obligatoires
    const lignesAvecEcartSansJustif = lignes.filter(
      l => l.ecart !== 0 && l.ecart !== null && !l.justification.trim()
    );
    if (lignesAvecEcartSansJustif.length > 0) {
      toast.error(`Justification manquante pour : ${lignesAvecEcartSansJustif.map(l => l.medicament_nom).join(', ')}`);
      return;
    }
    setValidating(true);
    try {
      await inventaireService.valider(sessionActive.id, lignes);
      toast.success('✅ Inventaire validé et stock régularisé !', { duration: 5000 });
      setSessionActive(null);
      setLignes([]);
      fetchSessions();
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur de validation.');
    } finally { setValidating(false); }
  };

  const ecartColor = (ecart: number | null) => {
    if (ecart === null) return 'text.secondary';
    if (ecart > 0)  return '#2E7D32';
    if (ecart < 0)  return '#C62828';
    return '#2E7D32';
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Retour inventaire">
            <IconButton onClick={() => navigate('/admin/inventaire')} sx={{ color: '#1565C0' }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#0D47A1">
              Inventaire Physique
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Comptez, saisissez et régularisez votre stock réel.
            </Typography>
          </Box>
        </Box>
        {!sessionActive && (
          <Button variant="contained" startIcon={<PlayArrow />}
            onClick={handleInitier} disabled={saving}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            {saving ? 'Initialisation...' : 'Initier un inventaire'}
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Aucune session en cours */}
      {!sessionActive && (
        <>
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 4, textAlign: 'center', mb: 3 }}>
            <Inventory2 sx={{ fontSize: 56, color: '#90CAF9', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="#0D47A1" sx={{ mb: 1 }}>
              Aucun inventaire en cours
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Initiez une session d'inventaire pour commencer la saisie des quantités physiques.
            </Typography>
            <Button variant="contained" startIcon={<PlayArrow />}
              onClick={handleInitier} disabled={saving}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
              Initier un inventaire physique
            </Button>
          </Card>

          {/* Historique des inventaires */}
          {sessions.filter(s => s.statut === 'CLOTURE').length > 0 && (
            <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
              <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2 }}>
                Historique des inventaires
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                    {['#', 'Initié par', 'Début', 'Fin', 'Statut'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.filter(s => s.statut === 'CLOTURE').map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell>#{s.id}</TableCell>
                      <TableCell>{s.initie_par}</TableCell>
                      <TableCell>{new Date(s.date_debut).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{s.date_fin ? new Date(s.date_fin).toLocaleString('fr-FR') : '—'}</TableCell>
                      <TableCell>
                        <Chip label="Clôturé" size="small"
                          sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Session en cours */}
      {sessionActive && (
        <>
          <Card elevation={0} sx={{ border: '1px solid #FFB74D', borderRadius: 3, p: 2, mb: 3,
            bgcolor: '#FFF8E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography fontWeight={700} color="#E65100" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ fontSize: 18 }} />
                Inventaire #{sessionActive.id} — EN COURS
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Initié le {new Date(sessionActive.date_debut).toLocaleString('fr-FR')} par {sessionActive.initie_par}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" startIcon={<Save />}
                onClick={handleSaisir} disabled={saving}
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#1565C0', color: '#1565C0' }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="contained" startIcon={<CheckCircle />}
                onClick={() => setConfirmOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
                  background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
                Valider & Clôturer
              </Button>
            </Box>
          </Card>

          {/* Info */}
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Saisissez les quantités physiques comptées. Une justification est obligatoire pour tout écart non nul.
          </Alert>

          {/* Tableau de saisie */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                  {['Médicament', 'DCI', 'Qté théorique', 'Qté physique', 'Écart', 'Justification'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#546E7A', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.map((ligne, i) => (
                  <TableRow key={ligne.medicament_id} hover
                    sx={{ bgcolor: ligne.ecart !== null && ligne.ecart !== 0 ? '#FFF8F8' : 'inherit' }}>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600} color="#0D47A1">
                        {ligne.medicament_nom}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={12} color="text.secondary">{ligne.dci}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600} color="#1565C0">
                        {ligne.quantite_theorique}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" type="number"
                        value={ligne.quantite_physique ?? ''}
                        onChange={e => updateLigne(i, 'quantite_physique', Number(e.target.value))}
                        inputProps={{ min: 0 }}
                        sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </TableCell>
                    <TableCell>
                      {ligne.ecart !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography fontSize={13} fontWeight={700} color={ecartColor(ligne.ecart)}>
                            {ligne.ecart > 0 ? '+' : ''}{ligne.ecart}
                          </Typography>
                          {ligne.ecart !== 0 && (
                            <Warning sx={{ fontSize: 14, color: '#F57F17' }} />
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {ligne.ecart !== null && ligne.ecart !== 0 ? (
                        <TextField
                          size="small" fullWidth
                          placeholder="Justification obligatoire..."
                          value={ligne.justification}
                          onChange={e => updateLigne(i, 'justification', e.target.value)}
                          error={!ligne.justification.trim()}
                          helperText={!ligne.justification.trim() ? 'Requis' : ''}
                          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Dialog confirmation validation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} color="#0D47A1">Confirmer la validation</Typography>
          <IconButton onClick={() => setConfirmOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Cette action est irréversible. Le stock sera régularisé selon les quantités saisies.
          </Alert>
          <Typography fontSize={14} color="text.secondary">
            Écarts détectés : <strong>{lignes.filter(l => l.ecart !== 0 && l.ecart !== null).length}</strong> médicament(s)
          </Typography>
          {lignes.filter(l => l.ecart !== 0 && l.ecart !== null).map(l => (
            <Box key={l.medicament_id} sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, p: 1, bgcolor: '#FFF3E0', borderRadius: 1 }}>
              <Typography fontSize={13} fontWeight={600}>{l.medicament_nom}</Typography>
              <Typography fontSize={13} color={ecartColor(l.ecart)} fontWeight={700}>
                {l.ecart! > 0 ? '+' : ''}{l.ecart}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}>
            Annuler
          </Button>
          <Button onClick={handleValider} variant="contained" disabled={validating}
            startIcon={validating ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
            {validating ? 'Validation...' : 'Confirmer et valider'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}