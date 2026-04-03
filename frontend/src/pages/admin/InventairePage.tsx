import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Select, MenuItem, FormControl, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Card, Alert, Tooltip, Pagination, CircularProgress,
} from '@mui/material';
import {
  Search, Add, Download, Visibility, Edit, Delete,
  Refresh, Inventory2, Warning, Error as ErrorIcon, CheckCircle,
} from '@mui/icons-material';
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
  code_barres: string;
  est_actif: boolean;
  categorie: number;
  categorie_nom: string;
}

function KpiCard({ title, value, sub, color, icon }: {
  title: string; value: number | string; sub: string;
  color: string; icon: React.ReactNode;
}) {
  return (
    <Card elevation={0} sx={{
      p: 2.5, border: '1px solid #E3F2FD', borderRadius: 3, flex: 1, minWidth: 160,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
          <Typography variant="h4" fontWeight={900} color={color} sx={{ my: 0.5 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        </Box>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
      </Box>
    </Card>
  );
}

export default function InventairePage() {
  const navigate = useNavigate();
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  // Remplace le bloc fetchMedicaments par :
  const fetchMedicaments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      //  N'envoyer est_actif que si filtre explicite
      if (filterStatut === 'actif')   params.append('est_actif', 'true');
      if (filterStatut === 'inactif') params.append('est_actif', 'false');
      // filterStatut === 'tous' → pas de filtre est_actif → API retourne tout
      params.append('page', String(page));

      const res = await api.get(`/medicaments/?${params}`);
      const data = res.data;

      const results: Medicament[] = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data) ? data : [];
      const count: number = data.count ?? results.length;

      setMedicaments(results);
      setTotal(count);
      setTotalPages(Math.ceil(count / 20) || 1);
    } catch (err: any) {
      // ✅ Afficher l'erreur précise dans la console
      console.error('Erreur inventaire:', err.response?.status, err.response?.data);
      setError('Erreur lors du chargement des médicaments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicaments(); }, [search, filterStatut, page]);

  // Remplace handleArchiver par cette version
  const handleToggleArchivage = async (med: Medicament) => {
    const action   = med.est_actif ? 'archiver' : 'restaurer';
    const message  = med.est_actif
      ? `Archiver "${med.nom_commercial}" ?`
      : `Désarchiver "${med.nom_commercial}" et le remettre en stock ?`;

    if (!confirm(message)) return;

    try {
      if (med.est_actif) {
        await api.post(`/medicaments/${med.id}/archiver/`);
      } else {
        await api.post(`/medicaments/${med.id}/restaurer/`);
      }
      fetchMedicaments();
    } catch {
      alert(`Erreur lors de l'opération ${action}.`);
    }
  };

  // ✅ Navigation vers la page détail
  const handleVoirDetail = (id: number) => {
    navigate(`/admin/inventaire/${id}`);
  };

  const actifs   = medicaments.filter((m) => m.est_actif).length;
  const inactifs = medicaments.filter((m) => !m.est_actif).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            Inventaire des Médicaments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gérez vos stocks, surveillez les seuils d'alerte et suivez les dates de péremption.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<Download />}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
            Exporter (CSV)
          </Button>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => navigate('/admin/inventaire/nouveau')}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)',
              boxShadow: '0 4px 15px rgba(33,150,243,0.3)',
            }}>
            Ajouter un médicament
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KpiCard title="Médicaments totaux" value={total} sub="+12 depuis le mois dernier"
          color="#2196F3" icon={<Inventory2 sx={{ color: '#2196F3' }} />} />
        <KpiCard title="Médicaments Actifs" value={actifs} sub="En stock"
          color="#4CAF50" icon={<CheckCircle sx={{ color: '#4CAF50' }} />} />
        <KpiCard title="Archivés" value={inactifs} sub="Hors stock"
          color="#FF9800" icon={<Warning sx={{ color: '#FF9800' }} />} />
        <KpiCard title="Alertes Stock" value="—" sub="Vérification en cours"
          color="#F44336" icon={<ErrorIcon sx={{ color: '#F44336' }} />} />
      </Box>

      {/* Filtres */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Rechercher par nom, code ou DCI..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            size="small"
            sx={{ flex: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#90A4AE' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}>
              <MenuItem value="tous">Tous les statuts</MenuItem>
              <MenuItem value="actif">Actifs</MenuItem>
              <MenuItem value="inactif">Archivés</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchMedicaments} sx={{ color: '#2196F3' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FBFF' }}>
                {['Médicament', 'Catégorie', 'Dosage / Forme', 'Prix Unitaire', 'Seuil Alerte', 'Statut', 'Actions'].map((h) => (
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
              ) : medicaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Aucun médicament trouvé.
                  </TableCell>
                </TableRow>
              ) : medicaments.map((med) => (
                <TableRow key={med.id} hover sx={{ '&:hover': { bgcolor: '#F8FBFF' } }}>
                  <TableCell>
                    <Typography fontWeight={700} fontSize={14} color="#0D47A1">
                      {med.nom_commercial}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {med.dci} • {med.code_barres}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={med.categorie_nom || '—'} size="small"
                      sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13}>{med.dosage}</Typography>
                    <Typography variant="caption" color="text.secondary">{med.forme_galenique}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600} color="#1565C0">
                      {Number(med.prix_unitaire).toLocaleString()} FCFA
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}
                      color={med.seuil_alerte > 50 ? '#F44336' : '#4CAF50'}>
                      {med.seuil_alerte} unités
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={med.est_actif ? 'Actif' : 'Archivé'}
                      size="small"
                      sx={{
                        bgcolor: med.est_actif ? '#E8F5E9' : '#ECEFF1',
                        color: med.est_actif ? '#2E7D32' : '#607D8B',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {/* ✅ Bouton œil corrigé */}
                      <Tooltip title="Voir détails">
                        <IconButton
                          size="small"
                          sx={{ color: '#2196F3' }}
                          onClick={() => handleVoirDetail(med.id)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" sx={{ color: '#FF9800' }}
                          onClick={() => navigate(`/admin/inventaire/${med.id}/modifier`)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={med.est_actif ? 'Archiver' : 'Désarchiver'}>
                        <IconButton
                          size="small"
                          sx={{ color: med.est_actif ? '#F44336' : '#4CAF50' }}
                          onClick={() => handleToggleArchivage(med)}
                        >
                          {med.est_actif ? <Delete fontSize="small" /> : <Refresh fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderTop: '1px solid #E3F2FD' }}>
            <Typography variant="body2" color="text.secondary">
              Affichage de {((page - 1) * 20) + 1} à {Math.min(page * 20, total)} sur {total} médicaments
            </Typography>
            <Pagination count={totalPages} page={page}
              onChange={(_, v) => setPage(v)} color="primary" size="small" />
          </Box>
        )}
      </Card>
    </Box>
  );
}