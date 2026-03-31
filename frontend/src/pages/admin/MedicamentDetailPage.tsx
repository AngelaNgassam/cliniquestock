import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent,
  Chip, CircularProgress, Grid, Divider, IconButton,
} from '@mui/material';
import {
  ArrowBack, Inventory2, Analytics, Notes,
  QrCode, LocalPharmacy, CheckCircle, Archive,
} from '@mui/icons-material';
// ✅ On utilise api (axios) au lieu de fetch natif → token envoyé automatiquement
import api from '../../services/authService';

interface Medicament {
  id: number;
  nom_commercial: string;
  dci: string;
  forme_galenique: string;
  dosage: string;
  unite_stock: string;
  prix_unitaire: string;
  seuil_alerte: number;
  conditions_stockage: string;
  indications_therapeutiques: string;
  code_barres: string;
  est_actif: boolean;
  categorie: number;
  categorie_nom: string;
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={500} color="#1A1A2E" sx={{ mt: 0.3 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'rgba(33,150,243,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </Box>
          <Typography fontWeight={700} color="#0D47A1" fontSize={16}>{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2.5 }} />
        {children}
      </CardContent>
    </Card>
  );
}

export default function MedicamentDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const [med, setMed]         = useState<Medicament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // ✅ api (axios) envoie automatiquement le token JWT via l'intercepteur
    api.get(`/medicaments/${id}/`)
      .then((res) => {
        setMed(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.status === 404
            ? 'Médicament introuvable.'
            : 'Erreur lors du chargement.'
        );
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress />
    </Box>
  );

  if (error || !med) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography color="error" variant="h6">{error || 'Médicament introuvable.'}</Typography>
      <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/inventaire')} startIcon={<ArrowBack />}>
        Retour à l'inventaire
      </Button>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate('/admin/inventaire')}
          sx={{ bgcolor: '#E3F2FD', '&:hover': { bgcolor: '#BBDEFB' } }}
        >
          <ArrowBack sx={{ color: '#1565C0' }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">INVENTAIRE</Typography>
            <Typography variant="caption" color="text.secondary">›</Typography>
            <Typography variant="caption" color="text.secondary">DÉTAIL MÉDICAMENT</Typography>
          </Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            {med.nom_commercial}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {med.dci} • {med.forme_galenique} • {med.dosage}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={med.est_actif ? 'Actif' : 'Archivé'}
            icon={med.est_actif
              ? <CheckCircle sx={{ fontSize: 16 }} />
              : <Archive sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: med.est_actif ? '#E8F5E9' : '#ECEFF1',
              color:   med.est_actif ? '#2E7D32' : '#607D8B',
              fontWeight: 700,
            }}
          />
          <Chip
            label={`ID: ${med.id}`}
            sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700 }}
          />
        </Box>
      </Box>

      {/* ── Actions rapides ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => navigate(`/admin/inventaire/${med.id}/modifier`)}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)',
          }}
        >
          Modifier
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/inventaire')}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}
        >
          Retour à l'inventaire
        </Button>
      </Box>

      {/* ── Section 1 — Informations générales ─────────────────────────────── */}
      <Section icon={<Inventory2 sx={{ color: '#2196F3' }} />} title="Informations Générales">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <InfoRow label="Nom Commercial"     value={med.nom_commercial} />
            <InfoRow label="DCI"                value={med.dci} />
            <InfoRow label="Catégorie"          value={med.categorie_nom} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoRow label="Forme Galénique"    value={med.forme_galenique} />
            <InfoRow label="Dosage"             value={med.dosage} />
            <InfoRow label="Unité de Stock"     value={med.unite_stock} />
          </Grid>
        </Grid>
      </Section>

      {/* ── Section 2 — Code-barres & Prix ─────────────────────────────────── */}
      <Section icon={<QrCode sx={{ color: '#2196F3' }} />} title="Identification & Prix">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <InfoRow label="Code-barres (SKU/CIP)" value={med.code_barres} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Prix Unitaire
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#1565C0" sx={{ mt: 0.3 }}>
                {Number(med.prix_unitaire).toLocaleString()} FCFA
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Section>

      {/* ── Section 3 — Stock & Alertes ────────────────────────────────────── */}
      <Section icon={<Analytics sx={{ color: '#2196F3' }} />} title="Stock & Niveaux d'Alerte">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Seuil d'Alerte Critique
              </Typography>
              <Typography variant="h5" fontWeight={800}
                color={med.seuil_alerte > 50 ? '#F44336' : '#4CAF50'} sx={{ mt: 0.3 }}>
                {med.seuil_alerte} unités
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoRow label="Conditions de Stockage" value={med.conditions_stockage} />
          </Grid>
        </Grid>
      </Section>

      {/* ── Section 4 — Notes ──────────────────────────────────────────────── */}
      <Section icon={<Notes sx={{ color: '#2196F3' }} />} title="Notes & Observations">
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Indications Thérapeutiques
          </Typography>
          <Typography variant="body1" color="#444" sx={{ mt: 0.5, lineHeight: 1.8 }}>
            {med.indications_therapeutiques || 'Aucune indication renseignée.'}
          </Typography>
        </Box>
      </Section>

      {/* ── Section 5 — Pharmacien (icône MUI, pas lucide) ─────────────────── */}
      <Card elevation={0} sx={{
        border: '1px solid #E8F5E9', borderRadius: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F9FFF9',
      }}>
        <LocalPharmacy sx={{ color: '#4CAF50', fontSize: 32 }} />
        <Box>
          <Typography fontWeight={700} color="#2E7D32">Informations Pharmacien</Typography>
          <Typography variant="body2" color="text.secondary">
            Ce médicament est {med.est_actif ? 'disponible' : 'archivé'} dans le catalogue.
            Seuil d'alerte fixé à {med.seuil_alerte} unités.
          </Typography>
        </Box>
      </Card>

    </Box>
  );
}