import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Card, Chip, IconButton, CircularProgress, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Avatar, Select, MenuItem, FormControl,
} from '@mui/material';
import {
  Search, Add, Edit, Phone, Email, LocationOn,
  CheckCircle, Cancel, Refresh, MoreVert, ShoppingCart,
  VerifiedUser, Business, OpenInNew, LocalShipping,
  PictureAsPdf, Archive, Unarchive, FilterList,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/authService';

interface Fournisseur {
  id: number; nom_societe: string; contact: string;
  email: string; adresse: string; est_actif: boolean;
  total_commandes?: number; volume_affaires?: number;
}

interface Commande {
  id: number; reference: string; date_creation: string;
  statut: string; montant_total: string;
}

const STATUT_CMD: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: '#1565C0', bg: '#E3F2FD' },
  PARTIELLE:  { label: 'Partielle',  color: '#E65100', bg: '#FFF8E1' },
  LIVREE:     { label: 'Livrée',     color: '#2E7D32', bg: '#E8F5E9' },
  ANNULEE:    { label: 'Annulée',    color: '#C62828', bg: '#FFEBEE' },
  BROUILLON:  { label: 'Brouillon',  color: '#607D8B', bg: '#ECEFF1' },
};

function avatarColor(name: string) {
  const colors = ['#1565C0', '#2E7D32', '#6A1B9A', '#E65100', '#C62828', '#00695C', '#283593'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Génération PDF ────────────────────────────────────────────────────────────
async function genererPDFFournisseur(fournisseur: Fournisseur, commandes: Commande[]) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('fr-FR');
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const BLEU     = [13, 71, 161] as [number, number, number];
  const GRIS     = [100, 100, 100] as [number, number, number];
  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();

  const ajouterEntetePied = (numPage: number, totalPages: number) => {
    // En-tête
    doc.setFillColor(...BLEU);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('CliniqueStock', 14, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`Généré le ${dateStr} à ${heureStr}`, W - 14, 12, { align: 'right' });

    // Pied de page
    doc.setFillColor(240, 247, 255);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setTextColor(...GRIS);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('CliniqueStock — Rapport Fournisseur', 14, H - 5);
    doc.text(`Page ${numPage} / ${totalPages}`, W - 14, H - 5, { align: 'right' });
    doc.text(`${dateStr} ${heureStr}`, W / 2, H - 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  // ── Page 1 : Infos fournisseur ──
  ajouterEntetePied(1, 1);

  // Titre
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLEU);
  doc.text('Historique des Commandes', 14, 35);

  // Fiche fournisseur
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text(fournisseur.nom_societe, 14, 50);

  doc.setFillColor(240, 247, 255);
  doc.roundedRect(12, 55, W - 24, 42, 3, 3, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const infos = [
    ['Contact',  fournisseur.contact || '—'],
    ['Email',    fournisseur.email],
    ['Adresse',  fournisseur.adresse || '—'],
    ['Statut',   fournisseur.est_actif ? 'Actif' : 'Inactif'],
  ];
  infos.forEach(([label, val], i) => {
    const y = 63 + i * 9;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRIS);
    doc.text(`${label} :`, 18, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(33, 33, 33);
    doc.text(val, 55, y);
  });

  // Stats
  doc.setFillColor(...BLEU);
  doc.roundedRect(12, 102, (W - 30) / 2, 22, 3, 3, 'F');
  doc.roundedRect(18 + (W - 30) / 2, 102, (W - 30) / 2, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(String(commandes.length), 14 + (W - 30) / 4, 115, { align: 'center' });
  doc.text(`${((commandes.reduce((s, c) => s + Number(c.montant_total), 0)) / 1000).toFixed(1)}K FCFA`, 18 + (W - 30) * 3 / 4, 115, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Total commandes', 14 + (W - 30) / 4, 120, { align: 'center' });
  doc.text('Volume d\'affaires', 18 + (W - 30) * 3 / 4, 120, { align: 'center' });

  // ── Tableau commandes ──
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Liste des Commandes', 14, 138);

  // En-têtes tableau
  const cols = ['Référence', 'Date', 'Montant (FCFA)', 'Statut'];
  const colX = [14, 75, 120, 168];
  const ROW_H = 9;
  let y = 145;

  doc.setFillColor(...BLEU);
  doc.rect(12, y - 6, W - 24, ROW_H, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  cols.forEach((h, i) => doc.text(h, colX[i], y));
  y += ROW_H;

  // Lignes
  commandes.forEach((cmd, idx) => {
    if (y > H - 25) {
      doc.addPage();
      // Re-numéroter — on recalcule les pages après
      ajouterEntetePied(doc.getNumberOfPages(), doc.getNumberOfPages());
      y = 28;
      // Re-dessiner en-têtes
      doc.setFillColor(...BLEU);
      doc.rect(12, y - 6, W - 24, ROW_H, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      cols.forEach((h, i) => doc.text(h, colX[i], y));
      y += ROW_H;
    }

    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
    doc.rect(12, y - 6, W - 24, ROW_H, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(13, 71, 161);
    doc.text(cmd.reference, colX[0], y);
    doc.setTextColor(33, 33, 33);
    doc.text(new Date(cmd.date_creation).toLocaleDateString('fr-FR'), colX[1], y);
    doc.text(Number(cmd.montant_total).toLocaleString('fr-FR'), colX[2], y);
    const s = STATUT_CMD[cmd.statut];
    doc.setTextColor(...(cmd.statut === 'LIVREE' ? [46, 125, 50] : cmd.statut === 'ANNULEE' ? [198, 40, 40] : cmd.statut === 'PARTIELLE' ? [230, 81, 0] : [21, 101, 192]) as [number, number, number]);
    doc.text(s?.label || cmd.statut, colX[3], y);
    y += ROW_H;
  });

  // Corriger numéros de page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    // Réécrire le pied de page avec le bon total
    doc.setFillColor(240, 247, 255);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setTextColor(...GRIS);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('CliniqueStock — Rapport Fournisseur', 14, H - 5);
    doc.text(`Page ${p} / ${total}`, W - 14, H - 5, { align: 'right' });
    doc.text(`${dateStr} ${heureStr}`, W / 2, H - 5, { align: 'center' });
  }

  doc.save(`commandes-${fournisseur.nom_societe.replace(/\s+/g, '-')}-${dateStr}.pdf`);
  toast.success('PDF téléchargé !');
}

// ── Dialog Fournisseur ────────────────────────────────────────────────────────
function FournisseurDialog({ open, onClose, onSaved, fournisseur }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  fournisseur?: Fournisseur | null;
}) {
  const [form, setForm]   = useState({ nom_societe: '', contact: '', email: '', adresse: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    setForm(fournisseur
      ? { nom_societe: fournisseur.nom_societe, contact: fournisseur.contact, email: fournisseur.email, adresse: fournisseur.adresse }
      : { nom_societe: '', contact: '', email: '', adresse: '' }
    );
    setError('');
  }, [fournisseur, open]);

  const handleSave = async () => {
    if (!form.nom_societe || !form.email) { setError('Nom et email sont obligatoires.'); return; }
    setLoading(true);
    try {
      if (fournisseur) {
        await api.patch(`/fournisseurs/${fournisseur.id}/`, form);
        toast.success('Fournisseur modifié !');
      } else {
        await api.post('/fournisseurs/', form);
        toast.success('Fournisseur ajouté !');
      }
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] || 'Erreur lors de l\'enregistrement.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Business sx={{ color: '#1565C0', fontSize: 18 }} />
          </Box>
          <Typography fontWeight={800} color="#0D47A1">
            {fournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Nom de la société *', key: 'nom_societe', placeholder: 'ex: Laborex SA' },
            { label: 'Contact (Nom + Téléphone)', key: 'contact', placeholder: 'ex: Jean Dupont - +237 6XX XXX XXX' },
            { label: 'Email *', key: 'email', placeholder: 'contact@fournisseur.com', type: 'email' },
          ].map(({ label, key, placeholder, type }) => (
            <TextField key={key} label={label} value={(form as any)[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder} type={type}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          ))}
          <TextField label="Adresse" value={form.adresse} multiline rows={2}
            onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #1976D2, #0D47A1)' }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : fournisseur ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog Toutes les commandes ───────────────────────────────────────────────
function ToutesCommandesDialog({ fournisseur, open, onClose }: {
  fournisseur: Fournisseur; open: boolean; onClose: () => void;
}) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(`/fournisseurs/${fournisseur.id}/historique/`)
      .then(r => setCommandes(r.data.commandes || []))
      .catch(() => setCommandes([]))
      .finally(() => setLoading(false));
  }, [open, fournisseur.id]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={800} color="#0D47A1">
            Toutes les commandes — {fournisseur.nom_societe}
          </Typography>
          <Button startIcon={<PictureAsPdf />} variant="outlined" size="small"
            onClick={() => genererPDFFournisseur(fournisseur, commandes)}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
            Télécharger PDF
          </Button>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          : commandes.length === 0
            ? <Box sx={{ textAlign: 'center', py: 4 }}>
                <ShoppingCart sx={{ fontSize: 48, color: '#CFD8DC', mb: 1 }} />
                <Typography color="text.secondary">Aucune commande pour ce fournisseur.</Typography>
              </Box>
            : <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F0F7FF' }}>
                      {['Référence', 'Date', 'Montant', 'Statut'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commandes.map(cmd => {
                      const s = STATUT_CMD[cmd.statut] || STATUT_CMD['BROUILLON'];
                      return (
                        <TableRow key={cmd.id} hover>
                          <TableCell><Typography fontWeight={700} fontSize={13} color="#1565C0">{cmd.reference}</Typography></TableCell>
                          <TableCell>{new Date(cmd.date_creation).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell><Typography fontWeight={700} color="#0D47A1">{Number(cmd.montant_total).toLocaleString()} FCFA</Typography></TableCell>
                          <TableCell><Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11 }} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
        }
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Affichage de {commandes.length} sur {commandes.length} commandes
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Vue détaillée fournisseur ─────────────────────────────────────────────────
function FournisseurDetail({ fournisseur, onEdit, onToggle, onArchiver, navigate }: {
  fournisseur: Fournisseur; onEdit: () => void;
  onToggle: () => void; onArchiver: () => void;
  navigate: (path: string) => void;
}) {
  const [commandes,    setCommandes]    = useState<Commande[]>([]);
  const [allCommandes, setAllCommandes] = useState<Commande[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [filterStatut, setFilterStatut] = useState('TOUS');
  const [toutesOpen,   setToutesOpen]   = useState(false);
  const [historique,   setHistorique]   = useState<{ total_commandes: number; volume_affaires: number } | null>(null);

  const chargerCommandes = useCallback(async () => {
    if (!fournisseur) return;
    setLoading(true);
    try {
      const histRes = await api.get(`/fournisseurs/${fournisseur.id}/historique/`);
      const toutes: Commande[] = histRes.data.commandes || [];
      setAllCommandes(toutes);
      setHistorique({ total_commandes: histRes.data.total_commandes, volume_affaires: histRes.data.volume_affaires });
      setCommandes(toutes);
    } catch {
      setCommandes([]);
    } finally { setLoading(false); }
  }, [fournisseur.id]);

  useEffect(() => { chargerCommandes(); }, [chargerCommandes]);

  // Filtrer côté frontend selon le statut choisi
  const commandesFiltrees = filterStatut === 'TOUS'
    ? commandes
    : commandes.filter(c => c.statut === filterStatut);

  const initiales = fournisseur.nom_societe.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const bgColor   = avatarColor(fournisseur.nom_societe);

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>

      {/* Header fournisseur */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, mb: 3 }}>
        <Avatar sx={{
          width: 68, height: 68, bgcolor: bgColor, fontSize: 24,
          fontWeight: 800, borderRadius: 3, boxShadow: `0 4px 18px ${bgColor}40`,
        }}>
          {initiales}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={800} color="#0D47A1">{fournisseur.nom_societe}</Typography>
            {fournisseur.est_actif
              ? <Chip icon={<VerifiedUser sx={{ fontSize: 13 }} />} label="Fournisseur Vérifié" size="small"
                  sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, border: '1px solid #C8E6C9' }} />
              : <Chip label="Archivé" size="small" sx={{ bgcolor: '#ECEFF1', color: '#607D8B', fontWeight: 700 }} />
            }
          </Box>
          <Typography variant="body2" color="text.secondary">Médicaments Généraux & Spécialisés</Typography>
          <Button size="small" startIcon={<OpenInNew sx={{ fontSize: 13 }} />}
            sx={{ mt: 0.3, textTransform: 'none', color: '#1565C0', p: 0, fontSize: 11 }}>
            Voir le site institutionnel
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Edit sx={{ fontSize: 16 }} />} onClick={onEdit}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0', fontWeight: 600 }}>
            Modifier
          </Button>
          <Tooltip title={fournisseur.est_actif ? 'Désactiver / Archiver' : 'Réactiver'}>
            <IconButton onClick={onToggle}
              sx={{ border: '1px solid', borderRadius: 2,
                borderColor: fournisseur.est_actif ? '#FFCDD2' : '#C8E6C9',
                color: fournisseur.est_actif ? '#C62828' : '#2E7D32' }}>
              {fournisseur.est_actif ? <Archive /> : <Unarchive />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 2 colonnes : coordonnées + activité */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5 }}>
          <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2, fontSize: 14 }}>
            📋 Coordonnées & Logistique
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {[
            { icon: <Email sx={{ fontSize: 15, color: '#1565C0' }} />, label: 'EMAIL PROFESSIONNEL', val: fournisseur.email },
            { icon: <Phone sx={{ fontSize: 15, color: '#2E7D32' }} />, label: 'LIGNE DIRECTE', val: fournisseur.contact || '—' },
            { icon: <LocationOn sx={{ fontSize: 15, color: '#E65100' }} />, label: 'ADRESSE DU SIÈGE', val: fournisseur.adresse || '—' },
          ].map(({ icon, label, val }) => (
            <Box key={label} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                {icon}
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}
                </Typography>
              </Box>
              <Typography fontSize={13} fontWeight={500}>{val}</Typography>
            </Box>
          ))}
        </Card>

        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2.5 }}>
          <Typography fontWeight={700} color="#0D47A1" sx={{ mb: 2, fontSize: 14 }}>
            📈 Activité Récente
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 2, bgcolor: '#F0F7FF', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: 'uppercase', fontSize: 10 }}>Total Commandes</Typography>
              <Typography variant="h4" fontWeight={900} color="#1565C0">
                {historique?.total_commandes ?? 0}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#F0FFF4', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: 'uppercase', fontSize: 10 }}>Volume d'Affaires</Typography>
              <Typography variant="h5" fontWeight={900} color="#2E7D32">
                {(((historique?.volume_affaires ?? 0) as number) / 1000).toFixed(1)}K
              </Typography>
              <Typography variant="caption" color="text.secondary">FCFA</Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<ShoppingCart sx={{ fontSize: 18 }} />} fullWidth
            onClick={() => navigate('/admin/commandes')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #43A047, #1B5E20)', py: 1.2 }}>
            + Nouvelle Commande
          </Button>
        </Card>
      </Box>

      {/* Historique des commandes */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.8, bgcolor: '#F0F7FF', borderBottom: '1px solid #BBDEFB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping sx={{ color: '#1565C0', fontSize: 18 }} />
            <Typography fontWeight={700} color="#0D47A1" fontSize={14}>Historique des Commandes</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Filtre statut */}
            <FormControl size="small">
              <Select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                sx={{ borderRadius: 2, fontSize: 12, minWidth: 160,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#90CAF9' } }}>
                <MenuItem value="TOUS">Toutes les commandes</MenuItem>
                <MenuItem value="EN_ATTENTE">En attente</MenuItem>
                <MenuItem value="PARTIELLE">Partielles</MenuItem>
                <MenuItem value="LIVREE">Livrées</MenuItem>
                <MenuItem value="ANNULEE">Annulées</MenuItem>
                <MenuItem value="BROUILLON">Brouillons</MenuItem>
              </Select>
            </FormControl>
            {/* Tout voir */}
            <Button size="small" variant="outlined"
              onClick={() => setToutesOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0', fontSize: 12 }}>
              Tout voir
            </Button>
            {/* Télécharger PDF */}
            <Button size="small" variant="outlined" startIcon={<PictureAsPdf sx={{ fontSize: 14 }} />}
              onClick={() => genererPDFFournisseur(fournisseur, allCommandes)}
              sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#C62828', fontSize: 12 }}>
              Télécharger
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : commandesFiltrees.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ShoppingCart sx={{ fontSize: 40, color: '#CFD8DC', mb: 1 }} />
            <Typography color="text.secondary" fontSize={13}>
              {filterStatut === 'TOUS'
                ? 'Aucune commande pour ce fournisseur.'
                : `Aucune commande ${STATUT_CMD[filterStatut]?.label.toLowerCase()} pour ce fournisseur.`}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  {['ID Commande', 'Date', 'Articles', 'Montant Total', 'Statut', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#546E7A', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {commandesFiltrees.slice(0, 8).map(cmd => {
                  const s = STATUT_CMD[cmd.statut] || STATUT_CMD['BROUILLON'];
                  return (
                    <TableRow key={cmd.id} hover sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={700} color="#1565C0">{cmd.reference}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12}>{new Date(cmd.date_creation).toLocaleDateString('fr-FR')}</Typography>
                      </TableCell>
                      <TableCell><Typography fontSize={12} color="text.secondary">—</Typography></TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={700} color="#0D47A1">
                          {Number(cmd.montant_total).toLocaleString()} FCFA
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.label} size="small"
                          sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" sx={{ color: '#90A4AE' }}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {commandesFiltrees.length > 0 && (
          <Box sx={{ px: 3, py: 1.2, bgcolor: '#FAFCFF', borderTop: '1px solid #E3F2FD' }}>
            <Typography variant="caption" color="text.secondary">
              Affichage de {Math.min(8, commandesFiltrees.length)} sur {commandesFiltrees.length} commande(s)
            </Typography>
          </Box>
        )}
      </Card>

      {/* Dialog tout voir */}
      <ToutesCommandesDialog
        fournisseur={fournisseur}
        open={toutesOpen}
        onClose={() => setToutesOpen(false)}
      />
    </Box>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function FournisseursPage() {
  const navigate = useNavigate();
  const [fournisseurs,    setFournisseurs]    = useState<Fournisseur[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [search,          setSearch]          = useState('');
  const [selected,        setSelected]        = useState<Fournisseur | null>(null);
  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [editFournisseur, setEditFournisseur] = useState<Fournisseur | null>(null);
  const [showArchives,    setShowArchives]    = useState(false);

  const fetchFournisseurs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get('/fournisseurs/');
      const data = res.data;
      const list: Fournisseur[] = Array.isArray(data) ? data : data.results ?? [];
      setFournisseurs(list);
      // Sélectionner le premier actif par défaut
      if (!selected) {
        const premier = list.find(f => f.est_actif) || list[0];
        if (premier) setSelected(premier);
      }
    } catch { setError('Erreur de chargement.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFournisseurs(); }, [fetchFournisseurs]);

  const handleToggle = async (f: Fournisseur) => {
    const action = f.est_actif ? 'désactiver' : 'réactiver';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${f.nom_societe}" ?`)) return;
    try {
      // Utiliser l'endpoint toggle_statut du backend
      await api.patch(`/fournisseurs/${f.id}/toggle_statut/`);
      toast.success(`Fournisseur ${f.est_actif ? 'désactivé' : 'réactivé'} !`);
      // Rafraîchir et mettre à jour le sélectionné
      const res  = await api.get('/fournisseurs/');
      const list = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setFournisseurs(list);
      // Mettre à jour le fournisseur sélectionné avec les nouvelles données
      const updated = list.find((ff: Fournisseur) => ff.id === f.id);
      if (updated) setSelected(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la désactivation.');
    }
  };

  const actifs   = fournisseurs.filter(f => f.est_actif);
  const archives = fournisseurs.filter(f => !f.est_actif);
  const listAffichee = showArchives ? archives : actifs;
  const filtered = listAffichee.filter(f =>
    f.nom_societe.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">Gestion des Fournisseurs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Administrez votre répertoire de partenaires et suivez vos approvisionnements.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEditFournisseur(null); setDialogOpen(true); }}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #1976D2, #0D47A1)',
            boxShadow: '0 4px 14px rgba(13,71,161,0.3)', px: 2.5,
          }}>
          + Nouveau Fournisseur
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>

        {/* ── Liste gauche ── */}
        <Box sx={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField placeholder="Chercher un fournisseur..." value={search}
            onChange={e => setSearch(e.target.value)} size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F8FBFF' } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#90A4AE', fontSize: 18 }} /></InputAdornment>,
            }} />

          {/* Toggle actifs / archivés */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" fullWidth variant={!showArchives ? 'contained' : 'outlined'}
              onClick={() => setShowArchives(false)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12,
                ...(showArchives ? { borderColor: '#90CAF9', color: '#1565C0' } : { background: 'linear-gradient(135deg, #1976D2, #0D47A1)' }) }}>
              Actifs ({actifs.length})
            </Button>
            <Button size="small" fullWidth variant={showArchives ? 'contained' : 'outlined'}
              onClick={() => setShowArchives(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12,
                ...(showArchives ? { bgcolor: '#607D8B' } : { borderColor: '#B0BEC5', color: '#607D8B' }) }}>
              Archivés ({archives.length})
            </Button>
          </Box>

          <Box sx={{ overflow: 'auto', flex: 1 }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography fontSize={12} color="text.secondary">
                  {showArchives ? 'Aucun fournisseur archivé.' : 'Aucun fournisseur actif.'}
                </Typography>
              </Box>
            ) : filtered.map(f => {
              const initiales = f.nom_societe.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              const bg = avatarColor(f.nom_societe);
              const isSelected = selected?.id === f.id;
              return (
                <Box key={f.id} onClick={() => setSelected(f)}
                  sx={{
                    p: 1.8, mb: 0.8, borderRadius: 2, cursor: 'pointer',
                    border: isSelected ? `2px solid #1565C0` : '1px solid #E3F2FD',
                    bgcolor: isSelected ? '#EEF4FF' : 'white',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: '#F0F7FF', border: '1px solid #90CAF9' },
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: bg, fontSize: 13, fontWeight: 800, borderRadius: 1.5 }}>
                      {initiales}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} fontSize={12}
                        color={isSelected ? '#0D47A1' : '#1A1A2E'}
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.nom_societe}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={10}
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {f.email}
                      </Typography>
                    </Box>
                    <Chip label={f.est_actif ? 'Actif' : 'Inactif'} size="small"
                      sx={{ fontSize: 9, fontWeight: 700, height: 18,
                        bgcolor: f.est_actif ? '#E8F5E9' : '#ECEFF1',
                        color: f.est_actif ? '#2E7D32' : '#607D8B' }} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Mini stats */}
          <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 2, p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
              {[
                { label: 'Actifs', value: actifs.length, color: '#2E7D32' },
                { label: 'Inactifs', value: archives.length, color: '#607D8B' },
                { label: 'Total', value: fournisseurs.length, color: '#1565C0' },
              ].map(({ label, value, color }, i) => (
                <Box key={label} sx={{ textAlign: 'center', flex: 1 }}>
                  {i > 0 && <Divider orientation="vertical" flexItem sx={{ position: 'absolute' }} />}
                  <Typography variant="h6" fontWeight={900} color={color}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        {/* ── Détail droite ── */}
        <Card elevation={0} sx={{
          flex: 1, border: '1px solid #E3F2FD', borderRadius: 3,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {selected ? (
            <FournisseurDetail
              fournisseur={selected}
              onEdit={() => { setEditFournisseur(selected); setDialogOpen(true); }}
              onToggle={() => handleToggle(selected)}
              onArchiver={() => handleToggle(selected)}
              navigate={navigate}
            />
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Business sx={{ fontSize: 64, color: '#CFD8DC', mb: 2 }} />
                <Typography color="text.secondary">Sélectionnez un fournisseur</Typography>
              </Box>
            </Box>
          )}
        </Card>
      </Box>

      <FournisseurDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { fetchFournisseurs(); setDialogOpen(false); }}
        fournisseur={editFournisseur}
      />
    </Box>
  );
}