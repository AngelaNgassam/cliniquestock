import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, IconButton, Tooltip, CircularProgress,
  Alert, TextField, InputAdornment, Select, MenuItem, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Avatar, Grid, LinearProgress,
} from '@mui/material';
import {
  Add, Edit, Block, CheckCircle, Search, Refresh,
  People, AdminPanelSettings, LocalPharmacy, Close,
  PersonOff, PersonAdd,
  VisibilityOff,
  Visibility,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import utilisateurService from '../../services/utilisateurService';


import type { Utilisateur, UtilisateurPayload, Stats } from '../../services/utilisateurService';

// ── Dialog Ajouter / Modifier ─────────────────────────────────────────────────
function UtilisateurDialog({
  open, onClose, onSaved, utilisateur,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; utilisateur: Utilisateur | null;
}) {
  const estModif = !!utilisateur;
  const [form,         setForm]         = useState<UtilisateurPayload>({
    nom: '', prenom: '', email: '', role: 'PHARMACIEN', password: '', est_actif: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [pwdErrors,    setPwdErrors]    = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setError(''); setPwdErrors([]); setShowPassword(false);
      if (utilisateur) {
        setForm({ nom: utilisateur.nom, prenom: utilisateur.prenom,
          email: utilisateur.email, role: utilisateur.role,
          est_actif: utilisateur.est_actif, password: '' });
      } else {
        setForm({ nom: '', prenom: '', email: '', role: 'PHARMACIEN', password: '', est_actif: true });
      }
    }
  }, [open, utilisateur]);

  // ── Validation mot de passe ────────────────────────────────────────────────
  const validerMotDePasse = (pwd: string): string[] => {
    const errs: string[] = [];
    if (pwd.length < 6)                          errs.push('Au moins 6 caractères');
    if (!/\d/.test(pwd))                         errs.push('Au moins 1 chiffre');
    if (!/[A-Z]/.test(pwd))                      errs.push('Au moins 1 majuscule');
    if (!/[a-z]/.test(pwd))                      errs.push('Au moins 1 minuscule');
    return errs;
  };

  const handlePwdChange = (val: string) => {
    setForm(p => ({ ...p, password: val }));
    if (val) setPwdErrors(validerMotDePasse(val));
    else     setPwdErrors([]);
  };

  const pwdForce = (): { label: string; color: string; value: number } => {
    const pwd = form.password || '';
    if (!pwd) return { label: '', color: '#E0E0E0', value: 0 };
    const errs = validerMotDePasse(pwd);
    if (errs.length === 0) return { label: 'Fort',   color: '#4CAF50', value: 100 };
    if (errs.length <= 1)  return { label: 'Moyen',  color: '#FF9800', value: 60  };
    return                        { label: 'Faible', color: '#F44336', value: 30  };
  };

  const handleSave = async () => {
    if (!form.nom || !form.prenom || !form.email) {
      setError('Nom, prénom et email sont obligatoires.'); return;
    }
    if (!estModif || form.password) {
      if (!form.password) { setError('Mot de passe obligatoire à la création.'); return; }
      const errs = validerMotDePasse(form.password);
      if (errs.length > 0) { setError('Mot de passe non conforme : ' + errs.join(', ')); return; }
    }
    setLoading(true);
    try {
      if (estModif) {
        const payload: any = { nom: form.nom, prenom: form.prenom, role: form.role, est_actif: form.est_actif };
        if (form.password) payload.password = form.password;
        await utilisateurService.update(utilisateur!.id, payload);
        toast.success('Utilisateur modifié.');
      } else {
        await utilisateurService.create(form);
        toast.success('Compte créé avec succès !');
      }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.response?.data?.email?.[0] || e.response?.data?.detail || 'Erreur.');
    } finally { setLoading(false); }
  };

  const force = pwdForce();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd sx={{ color: '#1565C0' }} />
          <Typography fontWeight={700} color="#0D47A1">
            {estModif ? 'Modifier l\'utilisateur' : 'Ajouter un compte'}
          </Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Prénom *" value={form.prenom}
              onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Nom *" value={form.nom}
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>

          <TextField label="Email *" type="email" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            disabled={estModif}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

          <FormControl>
            <Select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="PHARMACIEN">Pharmacien</MenuItem>
              <MenuItem value="ADMINISTRATEUR">Administrateur</MenuItem>
            </Select>
          </FormControl>

          {/* ── Mot de passe avec oeil ──────────────────────────────────────── */}
          <Box>
            <TextField
              fullWidth
              label={estModif ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe *'}
              type={showPassword ? 'text' : 'password'}
              value={form.password || ''}
              onChange={e => handlePwdChange(e.target.value)}
              error={pwdErrors.length > 0 && !!form.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {/* Force du mot de passe */}
            {form.password && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography fontSize={11} color="text.secondary">Force</Typography>
                  <Typography fontSize={11} fontWeight={700} color={force.color}>{force.label}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={force.value}
                  sx={{ height: 4, borderRadius: 2, bgcolor: '#E0E0E0',
                    '& .MuiLinearProgress-bar': { bgcolor: force.color } }} />
                {pwdErrors.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {pwdErrors.map(e => (
                      <Typography key={e} fontSize={11} color="#F44336">✗ {e}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {estModif && (
            <FormControl>
              <Select value={form.est_actif ? 'actif' : 'inactif'}
                onChange={e => setForm(p => ({ ...p, est_actif: e.target.value === 'actif' }))}
                sx={{ borderRadius: 2 }}>
                <MenuItem value="actif">Actif</MenuItem>
                <MenuItem value="inactif">Inactif</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
          {loading ? 'Enregistrement...' : estModif ? 'Modifier' : 'Créer le compte'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [stats,        setStats]        = useState<Stats>({ total: 0, admins: 0, pharmaciens: 0, actifs: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [filtreRole,   setFiltreRole]   = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [userEdite,    setUserEdite]    = useState<Utilisateur | null>(null);

  const fetchUtilisateurs = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search)       params.append('search', search);
      if (filtreRole)   params.append('role',   filtreRole);
      if (filtreStatut) params.append('statut', filtreStatut);

      const res  = await utilisateurService.getAll(params.toString());
      setUtilisateurs(res.data.utilisateurs ?? []);
      setStats(res.data.stats ?? { total: 0, admins: 0, pharmaciens: 0, actifs: 0 });
    } catch {
      setError('Erreur lors du chargement des utilisateurs.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUtilisateurs(); }, [search, filtreRole, filtreStatut]);

  const handleToggle = async (u: Utilisateur) => {
    if (!confirm(`${u.est_actif ? 'Désactiver' : 'Activer'} le compte de ${u.prenom} ${u.nom} ?`)) return;
    try {
      await utilisateurService.toggle(u.id);
      toast.success(`Compte ${u.est_actif ? 'désactivé' : 'activé'}.`);
      fetchUtilisateurs();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erreur.');
    }
  };

  const handleOuvrir = (u: Utilisateur | null) => {
    setUserEdite(u);
    setDialogOpen(true);
  };

  const getInitiales = (u: Utilisateur) =>
    `${u.prenom[0] || ''}${u.nom[0] || ''}`.toUpperCase();

  const getRoleColor = (role: string) =>
    role === 'ADMINISTRATEUR' ? '#1565C0' : '#2E7D32';

  const getRoleBg = (role: string) =>
    role === 'ADMINISTRATEUR' ? '#E3F2FD' : '#E8F5E9';

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Gestion des Utilisateurs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Administrez les accès, rôles et auditez les activités du personnel.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchUtilisateurs} sx={{ color: '#2196F3' }}><Refresh /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => handleOuvrir(null)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
            Ajouter un compte
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Utilisateurs', value: stats.total,       color: '#2196F3', bg: '#E3F2FD', icon: <People sx={{ color: '#2196F3', fontSize: 22 }} />, sub: '+2 ce mois' },
          { label: 'Administrateurs',    value: stats.admins,      color: '#9C27B0', bg: '#F3E5F5', icon: <AdminPanelSettings sx={{ color: '#9C27B0', fontSize: 22 }} />, sub: 'accès complet' },
          { label: 'Pharmaciens',        value: stats.pharmaciens, color: '#4CAF50', bg: '#E8F5E9', icon: <LocalPharmacy sx={{ color: '#4CAF50', fontSize: 22 }} />, sub: 'accès limité' },
          { label: 'Comptes actifs',     value: stats.actifs,      color: '#FF9800', bg: '#FFF3E0', icon: <CheckCircle sx={{ color: '#FF9800', fontSize: 22 }} />, sub: 'actuellement actifs' },
        ].map(({ label, value, color, bg, icon, sub }) => (
          <Grid item xs={12} sm={6} md={3} key={label}>
            <Card elevation={0} sx={{ border: `1px solid ${bg}`, borderRadius: 3, p: 2.5,
              background: `linear-gradient(145deg, white, ${bg}40)` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}
                    sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 }}>
                    {label}
                  </Typography>
                  <Typography variant="h3" fontWeight={900} color={color} sx={{ my: 0.5, lineHeight: 1 }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{sub}</Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField placeholder="Rechercher par nom ou email..." value={search}
            onChange={e => setSearch(e.target.value)} size="small"
            sx={{ flex: 1, minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#90A4AE', fontSize: 20 }} /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={filtreRole} onChange={e => setFiltreRole(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous les rôles</MenuItem>
              <MenuItem value="ADMINISTRATEUR">Administrateur</MenuItem>
              <MenuItem value="PHARMACIEN">Pharmacien</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="actif">Actifs</MenuItem>
              <MenuItem value="inactif">Inactifs</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F0F7FF' }}>
              {['Utilisateur', 'Rôle', 'Statut', 'Dernière connexion', 'Date création', 'Actions'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#455A64',
                  textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && utilisateurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <People sx={{ fontSize: 48, color: '#CFD8DC', mb: 1 }} />
                  <Typography color="text.secondary">Aucun utilisateur trouvé.</Typography>
                </TableCell>
              </TableRow>
            ) : utilisateurs.map((u, i) => (
              <TableRow key={u.id} hover
                sx={{ '&:hover': { bgcolor: '#F8FBFF' }, bgcolor: i % 2 === 0 ? 'white' : '#FAFCFF' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{
                      width: 36, height: 36, fontSize: 13, fontWeight: 700,
                      bgcolor: u.role === 'ADMINISTRATEUR' ? '#1565C0' : '#2E7D32',
                    }}>
                      {getInitiales(u)}
                    </Avatar>
                    <Box>
                      <Typography fontSize={13} fontWeight={700} color="#0D47A1">
                        {u.prenom} {u.nom}
                      </Typography>
                      <Typography fontSize={11} color="text.secondary">{u.email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={u.role === 'ADMINISTRATEUR' ? 'Admin' : 'Pharmacien'} size="small"
                    sx={{ bgcolor: getRoleBg(u.role), color: getRoleColor(u.role), fontWeight: 700, fontSize: 11 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.est_actif ? 'Actif' : 'Inactif'}
                    size="small"
                    sx={{
                      bgcolor:    u.est_actif ? '#E8F5E9' : '#FFEBEE',
                      color:      u.est_actif ? '#2E7D32' : '#C62828',
                      fontWeight: 700, fontSize: 11,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography fontSize={12} color={u.dernier_connexion ? '#424242' : 'text.secondary'}>
                    {u.dernier_connexion
                      ? new Date(u.dernier_connexion).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Jamais'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize={12} color="text.secondary">
                    {new Date(u.date_creation).toLocaleDateString('fr-FR')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.3 }}>
                    <Tooltip title="Modifier">
                      <IconButton size="small" sx={{ color: '#FF9800' }} onClick={() => handleOuvrir(u)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.est_actif ? 'Désactiver le compte' : 'Activer le compte'}>
                      <IconButton size="small" sx={{ color: u.est_actif ? '#F44336' : '#4CAF50' }}
                        onClick={() => handleToggle(u)}>
                        {u.est_actif
                          ? <PersonOff fontSize="small" />
                          : <CheckCircle fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UtilisateurDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchUtilisateurs}
        utilisateur={userEdite}
      />
    </Box>
  );
}