import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, FormHelperText, Card, CardContent,
  Alert, CircularProgress, Chip, IconButton, Tooltip, Divider,
} from '@mui/material';
import {
  ArrowBack, Save, QrCodeScanner, Close,
  Inventory2, Analytics, Notes, Warning,
  LocalShipping, Lightbulb,
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast, { Toaster } from 'react-hot-toast';
import { medicamentService } from '../../services/medicamentService';
import type { MedicamentPayload, Categorie } from '../../services/medicamentService';
import { fetchMedicamentByBarcode } from '../../services/barcodeService';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/authService';

const FORMES = [
  'Comprimé', 'Capsule', 'Solution huileuse', 'Gélule', 'Sirop', 'Injectable', 'Crème',
  'Pommade', 'Suppositoire', 'Patch', 'Inhalateur', 'Gouttes', 'Sachet', 'Solution injectable', 'Comprimé effervescent',
];

interface FormData {
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
  categorie: number | '';
  // ── Traçabilité (nouveaux champs) ──
  numero_lot_initial: string;
  date_peremption_initiale: string;
  fournisseur_associe: number | '';
}

function Section({ icon, title, subtitle, children, accent = '#2196F3' }: {
  icon: React.ReactNode; title: string; subtitle: string;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <Card elevation={0} sx={{
      border: '1px solid #E3F2FD', borderRadius: 3, mb: 3,
      overflow: 'hidden',
    }}>
      <Box sx={{
        px: 3, py: 2,
        borderBottom: '1px solid #E3F2FD',
        background: 'linear-gradient(135deg, #F8FBFF, #EEF4FF)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          bgcolor: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Box>
          <Typography fontWeight={700} color="#0D47A1" fontSize={15}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Box>
      <CardContent sx={{ p: 3 }}>
        {children}
      </CardContent>
    </Card>
  );
}

export default function MedicamentFormPage() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  const token       = useAuthStore((s) => s.token);

  const [categories,   setCategories]   = useState<Categorie[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingInit,  setLoadingInit]  = useState(isEdit);
  const [doublonAlert, setDoublonAlert] = useState('');
  const [scanOpen,     setScanOpen]     = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [lotSuggere,   setLotSuggere]   = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scanDivId  = 'qr-scanner-div';

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      nom_commercial: '', dci: '', forme_galenique: 'Comprimé',
      dosage: '', unite_stock: '', prix_unitaire: '',
      seuil_alerte: 10, conditions_stockage: '',
      indications_therapeutiques: '', code_barres: '', categorie: '',
      numero_lot_initial: '', date_peremption_initiale: '', fournisseur_associe: '',
    },
  });

  useEffect(() => {
    medicamentService.getCategories().then(setCategories);
    api.get('/fournisseurs/').then(r => {
      const d = r.data;
      setFournisseurs(Array.isArray(d) ? d : d.results ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      medicamentService.getById(Number(id)).then(res => {
        const m = res.data;
        setValue('nom_commercial',             m.nom_commercial);
        setValue('dci',                        m.dci);
        setValue('forme_galenique',            m.forme_galenique);
        setValue('dosage',                     m.dosage);
        setValue('unite_stock',                m.unite_stock);
        setValue('prix_unitaire',              m.prix_unitaire);
        setValue('seuil_alerte',               m.seuil_alerte);
        setValue('conditions_stockage',        m.conditions_stockage || '');
        setValue('indications_therapeutiques', m.indications_therapeutiques || '');
        setValue('code_barres',                m.code_barres);
        setValue('categorie',                  m.categorie);
        setLoadingInit(false);
      });
    }
  }, [id, isEdit, setValue]);

  // Suggérer un numéro de lot
  const suggererNumeroLot = async (medId?: number) => {
    try {
      const year = new Date().getFullYear();
      if (medId) {
        const r = await api.get(`/receptions/numeros_lot/?medicament_id=${medId}`);
        setLotSuggere(r.data.prochain_numero || `LOT-${year}A`);
      } else {
        // Pas encore créé → juste une suggestion générique
        setLotSuggere(`LOT-${year}A`);
      }
    } catch {
      setLotSuggere(`LOT-${new Date().getFullYear()}A`);
    }
  };

  useEffect(() => {
    if (!isEdit) suggererNumeroLot();
  }, [isEdit]);

  const handleBarcodeDetected = async (code: string) => {
    setValue('code_barres', code);
    checkDoublon(code);
    closeScanner();
    setFetchingInfo(true);
    try {
      const info = await fetchMedicamentByBarcode(code, token ?? '');
      if (info.nom_commercial)             setValue('nom_commercial', info.nom_commercial);
      if (info.dci)                        setValue('dci', info.dci);
      if (info.forme_galenique)            setValue('forme_galenique', info.forme_galenique);
      if (info.conditions_stockage)        setValue('conditions_stockage', info.conditions_stockage);
      if (info.indications_therapeutiques) setValue('indications_therapeutiques', info.indications_therapeutiques);
      if (info.source === 'catalogue') {
        toast.success('✅ Médicament trouvé dans le catalogue !');
      } else if (info.source === 'rxnorm') {
        toast('🔵 DCI trouvée via RxNorm.', { icon: 'ℹ️', style: { background: '#E3F2FD', color: '#0D47A1' } });
      } else {
        toast('📋 Nouveau médicament — remplissez manuellement.', { icon: '📝' });
      }
    } finally { setFetchingInfo(false); }
  };

  const openScanner  = () => setScanOpen(true);
  useEffect(() => {
    if (!scanOpen) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(scanDivId);
      if (!el || scannerRef.current) return;
      scannerRef.current = new Html5QrcodeScanner(scanDivId, { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 2.5 }, false);
      scannerRef.current.render(decodedText => handleBarcodeDetected(decodedText), () => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [scanOpen]);

  const closeScanner = () => {
    if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; }
    setScanOpen(false);
  };

  const checkDoublon = async (code: string) => {
    if (!code) return;
    try {
      const res     = await medicamentService.checkDoublon(code);
      const results = res.data.results || [];
      const doublon = results.find((m: any) => m.code_barres === code && (!isEdit || m.id !== Number(id)));
      setDoublonAlert(doublon ? `⚠️ Ce code-barres existe déjà : "${doublon.nom_commercial}"` : '');
    } catch { /**/ }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload: MedicamentPayload = {
        ...data,
        categorie:    Number(data.categorie),
        seuil_alerte: Number(data.seuil_alerte),
        est_actif:    true,
      };
      if (isEdit) {
        await medicamentService.update(Number(id), payload);
        toast.success('Médicament modifié avec succès !');
      } else {
        await medicamentService.create(payload);
        toast.success('Médicament ajouté avec succès !');
      }
      setTimeout(() => navigate('/admin/inventaire'), 1500);
    } catch (err: any) {
      toast.error(
        err.response?.data?.code_barres?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Erreur lors de l'enregistrement."
      );
    } finally { setLoading(false); }
  };

  if (loadingInit) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/inventaire')}
          sx={{ bgcolor: '#E3F2FD', '&:hover': { bgcolor: '#BBDEFB' } }}>
          <ArrowBack sx={{ color: '#1565C0' }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            INVENTAIRE › {isEdit ? 'MODIFIER' : 'AJOUTER UN MÉDICAMENT'}
          </Typography>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            {isEdit ? 'Modifier le médicament' : 'Fiche Médicament'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit ? 'Modifiez les informations du médicament.' : 'Saisissez les détails pour intégrer une nouvelle référence au stock.'}
          </Typography>
        </Box>
        <Chip label={isEdit ? `ID: ${id}` : 'ID: NOUVEAU'}
          sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700 }} />
      </Box>

      {doublonAlert && <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} icon={<Warning />}>{doublonAlert}</Alert>}
      {fetchingInfo && <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }} icon={<CircularProgress size={18} />}>Recherche d'informations...</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>

        {/* ── Section 1 : Informations Générales ── */}
        <Section icon={<Inventory2 sx={{ color: '#2196F3', fontSize: 20 }} />}
          title="Informations Générales"
          subtitle="Détails d'identification du produit médical.">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>

            <Controller name="nom_commercial" control={control} rules={{ required: 'Nom commercial obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Nom Commercial *" placeholder="ex: Paracétamol 500mg"
                  error={!!errors.nom_commercial} helperText={errors.nom_commercial?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="dci" control={control} rules={{ required: 'DCI obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="DCI *" placeholder="ex: Paracétamol"
                  error={!!errors.dci} helperText={errors.dci?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="categorie" control={control} rules={{ required: 'Catégorie obligatoire' }}
              render={({ field }) => (
                <FormControl error={!!errors.categorie}>
                  <InputLabel>Catégorie *</InputLabel>
                  <Select {...field} label="Catégorie *" sx={{ borderRadius: 2 }}>
                    {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>)}
                  </Select>
                  <FormHelperText>{errors.categorie?.message as string}</FormHelperText>
                </FormControl>
              )} />

            <Controller name="forme_galenique" control={control} rules={{ required: 'Forme obligatoire' }}
              render={({ field }) => (
                <FormControl error={!!errors.forme_galenique}>
                  <InputLabel>Forme Galénique *</InputLabel>
                  <Select {...field} label="Forme Galénique *" sx={{ borderRadius: 2 }}>
                    {FORMES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                  <FormHelperText>{errors.forme_galenique?.message}</FormHelperText>
                </FormControl>
              )} />

            <Controller name="dosage" control={control} rules={{ required: 'Dosage obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Dosage *" placeholder="ex: 500mg"
                  error={!!errors.dosage} helperText={errors.dosage?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="unite_stock" control={control} rules={{ required: 'Unité obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Unité de Conditionnement *" placeholder="ex: Boîte de 30"
                  error={!!errors.unite_stock} helperText={errors.unite_stock?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="code_barres" control={control}
              rules={{ required: 'Code-barres obligatoire', pattern: { value: /^[0-9]{8,14}$/, message: 'Code invalide (8-14 chiffres)' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Code-barres (SKU/CIP) *"
                  placeholder="ex: 3400936111005"
                  error={!!errors.code_barres}
                  helperText={errors.code_barres?.message}
                  onChange={e => {
                    field.onChange(e);
                    if (e.target.value.length >= 8) handleBarcodeDetected(e.target.value);
                  }}
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="Scanner avec la caméra">
                        <IconButton onClick={openScanner} edge="end" sx={{ color: '#2196F3' }}>
                          <QrCodeScanner />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )} />

            <Controller name="prix_unitaire" control={control} rules={{ required: 'Prix obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Prix Unitaire (FCFA) *" type="number" placeholder="ex: 2500"
                  error={!!errors.prix_unitaire} helperText={errors.prix_unitaire?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />
          </Box>
        </Section>

        {/* ── Section 2 : Stock & Alertes ── */}
        <Section icon={<Analytics sx={{ color: '#2196F3', fontSize: 20 }} />}
          title="Stock & Niveaux d'Alerte"
          subtitle="Paramétrez les seuils critiques pour éviter les ruptures.">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <Controller name="seuil_alerte" control={control} rules={{ required: 'Seuil obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Seuil d'Alerte Critique *" type="number" placeholder="ex: 10"
                  error={!!errors.seuil_alerte} helperText={errors.seuil_alerte?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />
            <Controller name="conditions_stockage" control={control}
              render={({ field }) => (
                <TextField {...field} label="Conditions de Stockage"
                  placeholder="ex: Conserver entre 15°C et 25°C"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />
          </Box>
        </Section>

        {/* ── Section 3 : Traçabilité & Logistique (NOUVEAU) ── */}
        {!isEdit && (
          <Section
            icon={<LocalShipping sx={{ color: '#2E7D32', fontSize: 20 }} />}
            title="Traçabilité & Logistique"
            subtitle="Informations relatives aux lots et à l'approvisionnement."
            accent="#2E7D32"
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>

              {/* Numéro de lot */}
              <Box>
                <Controller name="numero_lot_initial" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Numéro de Lot (Batch)"
                      placeholder="ex: LOT-2026A"
                      helperText={field.value ? '' : lotSuggere ? `Suggéré : ${lotSuggere}` : ''}
                      FormHelperTextProps={{ sx: { color: '#1565C0' } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, width: '100%' }} />
                  )} />
                {lotSuggere && !watch('numero_lot_initial') && (
                  <Button size="small" startIcon={<Lightbulb sx={{ fontSize: 14 }} />}
                    onClick={() => setValue('numero_lot_initial', lotSuggere)}
                    sx={{ mt: 0.5, textTransform: 'none', fontSize: 11, color: '#1565C0', py: 0 }}>
                    Utiliser : {lotSuggere}
                  </Button>
                )}
              </Box>

              {/* Date de péremption */}
              <Controller name="date_peremption_initiale" control={control}
                render={({ field }) => (
                  <TextField {...field} label="Date d'Expiration" type="date"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )} />

              {/* Fournisseur associé */}
              <Controller name="fournisseur_associe" control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Fournisseur Associé</InputLabel>
                    <Select {...field} label="Fournisseur Associé" sx={{ borderRadius: 2 }}>
                      <MenuItem value="">Aucun</MenuItem>
                      {fournisseurs.filter(f => f.est_actif).map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.nom_societe}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )} />

              {/* Info box */}
              <Box sx={{
                p: 2, bgcolor: '#F0FFF4', borderRadius: 2,
                border: '1px solid #C8E6C9',
                display: 'flex', alignItems: 'flex-start', gap: 1,
              }}>
                <Lightbulb sx={{ color: '#2E7D32', fontSize: 18, mt: 0.2 }} />
                <Typography variant="caption" color="#388E3C">
                  Le numéro de lot et la date de péremption seront automatiquement associés
                  au premier stock de ce médicament lors de la réception.
                </Typography>
              </Box>
            </Box>
          </Section>
        )}

        {/* ── Section 4 : Notes ── */}
        <Section icon={<Notes sx={{ color: '#2196F3', fontSize: 20 }} />}
          title="Notes & Observations"
          subtitle="Instructions spéciales ou précautions de stockage.">
          <Controller name="indications_therapeutiques" control={control}
            render={({ field }) => (
              <TextField {...field} label="Indications Thérapeutiques" multiline rows={3}
                placeholder="Interactions médicamenteuses, notes de conservation..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, width: '100%' }} />
            )} />
        </Section>

        {/* ── Footer ── */}
        <Card elevation={0} sx={{
          border: '1px solid #E3F2FD', borderRadius: 3,
          p: 2.5, bgcolor: '#F8FBFF',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Typography variant="caption" color="text.secondary">
            • Les champs marqués d'un (*) sont obligatoires.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/inventaire')}
              sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#90CAF9', color: '#1565C0' }}>
              Annuler
            </Button>
            <Button type="submit" variant="contained" disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
              sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #1976D2, #0D47A1)', px: 3,
                boxShadow: '0 4px 12px rgba(13,71,161,0.3)',
              }}>
              {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le médicament'}
            </Button>
          </Box>
        </Card>
      </Box>

      {/* ── Scanner ── */}
      {scanOpen && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 3, width: 480, maxWidth: '90vw' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCodeScanner sx={{ color: '#2196F3' }} />
                <Typography fontWeight={700}>Scanner un code-barres</Typography>
              </Box>
              <IconButton onClick={closeScanner}><Close /></IconButton>
            </Box>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Pointez la caméra vers le code-barres. Les informations seront remplies automatiquement.
            </Alert>
            <div id={scanDivId} style={{ width: '100%' }} />
            <Button onClick={closeScanner} sx={{ mt: 2, textTransform: 'none' }}>Annuler</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}