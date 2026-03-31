import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, FormHelperText, Card, CardContent,
  Alert, CircularProgress, Chip, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Save, QrCodeScanner, Close,
  Inventory2, Analytics, Notes, Warning,
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast, { Toaster } from 'react-hot-toast';
import { medicamentService } from '../../services/medicamentService';
import type { MedicamentPayload, Categorie } from '../../services/medicamentService';
// ✅ Import du service barcode
import { fetchMedicamentByBarcode } from '../../services/barcodeService';
import { useAuthStore } from '../../store/authStore';

const FORMES = [
  'Comprimé', 'Gélule', 'Sirop', 'Injectable', 'Crème',
  'Pommade', 'Suppositoire', 'Patch', 'Inhalateur', 'Gouttes', 'Sachet',
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
}

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'rgba(33,150,243,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </Box>
          <Box>
            <Typography fontWeight={700} color="#0D47A1">{title}</Typography>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Box>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

export default function MedicamentFormPage() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  // ✅ Récupérer le token depuis le store
  const token       = useAuthStore((s) => s.token);

  const [categories,   setCategories]   = useState<Categorie[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingInit,  setLoadingInit]  = useState(isEdit);
  const [doublonAlert, setDoublonAlert] = useState('');
  const [scanOpen,     setScanOpen]     = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false); // ✅ loading pendant lookup
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scanDivId  = 'qr-scanner-div';

  const {
    control, handleSubmit, setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nom_commercial: '', dci: '', forme_galenique: 'Comprimé',
      dosage: '', unite_stock: '', prix_unitaire: '',
      seuil_alerte: 10, conditions_stockage: '',
      indications_therapeutiques: '', code_barres: '', categorie: '',
    },
  });

  useEffect(() => {
    medicamentService.getCategories().then((res) => setCategories(res));
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      medicamentService.getById(Number(id)).then((res) => {
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

  // ── ✅ Auto-remplissage après scan ────────────────────────────────────────
  const handleBarcodeDetected = async (code: string) => {
    setValue('code_barres', code);
    checkDoublon(code);
    closeScanner();

    setFetchingInfo(true);
    try {
      const info = await fetchMedicamentByBarcode(code, token ?? '');

      if (info.nom_commercial)
        setValue('nom_commercial', info.nom_commercial);
      if (info.dci)
        setValue('dci', info.dci);
      if (info.forme_galenique)
        setValue('forme_galenique', info.forme_galenique);
      if (info.conditions_stockage)
        setValue('conditions_stockage', info.conditions_stockage);
      if (info.indications_therapeutiques)
        setValue('indications_therapeutiques', info.indications_therapeutiques);

      // Toast selon la source
      if (info.source === 'catalogue') {
        toast.success('✅ Médicament trouvé dans le catalogue ! Champs remplis automatiquement.');
      } else if (info.source === 'rxnorm') {
        toast('🔵 DCI trouvée via RxNorm. Complétez les autres champs.', {
          icon: 'ℹ️',
          style: { background: '#E3F2FD', color: '#0D47A1' },
        });
      } else {
        toast('📋 Nouveau médicament — remplissez les informations manuellement.', {
          icon: '📝',
          style: { background: '#F5F5F5', color: '#333' },
        });
      }
    } finally {
      setFetchingInfo(false);
    }
  };

  // ── Scanner ───────────────────────────────────────────────────────────────
  const openScanner = () => setScanOpen(true);

  useEffect(() => {
    if (!scanOpen) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(scanDivId);
      if (!el || scannerRef.current) return;

      scannerRef.current = new Html5QrcodeScanner(
        scanDivId,
        { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 2.5 },
        false,
      );

      scannerRef.current.render(
        // ✅ Appel handleBarcodeDetected au lieu de juste setValue
        (decodedText) => handleBarcodeDetected(decodedText),
        () => {},
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [scanOpen]);

  const closeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanOpen(false);
  };

  // ── Doublon ───────────────────────────────────────────────────────────────
  const checkDoublon = async (code: string) => {
    if (!code) return;
    try {
      const res = await medicamentService.checkDoublon(code);
      const results = res.data.results || [];
      const doublon = results.find(
        (m: any) => m.code_barres === code && (!isEdit || m.id !== Number(id)),
      );
      setDoublonAlert(
        doublon
          ? `⚠️ Ce code-barres existe déjà : "${doublon.nom_commercial}"`
          : '',
      );
    } catch { /* silencieux */ }
  };

  // ── Soumission ────────────────────────────────────────────────────────────
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
      const msg =
        err.response?.data?.code_barres?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Erreur lors de l'enregistrement.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInit) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate('/admin/inventaire')}
          sx={{ bgcolor: '#E3F2FD', '&:hover': { bgcolor: '#BBDEFB' } }}
        >
          <ArrowBack sx={{ color: '#1565C0' }} />
        </IconButton>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">INVENTAIRE</Typography>
            <Typography variant="caption" color="text.secondary">›</Typography>
            <Typography variant="caption" color="text.secondary">
              {isEdit ? 'MODIFIER' : 'AJOUTER UN MÉDICAMENT'}
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">
            {isEdit ? 'Modifier le médicament' : 'Fiche Médicament'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? 'Modifiez les informations du médicament.'
              : 'Saisissez les détails pour intégrer une nouvelle référence.'}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Chip
            label={isEdit ? `ID: ${id}` : 'ID: NOUVEAU'}
            sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700 }}
          />
        </Box>
      </Box>

      {doublonAlert && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} icon={<Warning />}>
          {doublonAlert}
        </Alert>
      )}

      {/* ✅ Indicateur de recherche en cours */}
      {fetchingInfo && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}
          icon={<CircularProgress size={18} />}>
          Recherche des informations du médicament en cours...
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>

        {/* Section 1 — Informations générales */}
        <Section
          icon={<Inventory2 sx={{ color: '#2196F3' }} />}
          title="Informations Générales"
          subtitle="Détails d'identification du produit médical."
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>

            <Controller name="nom_commercial" control={control}
              rules={{ required: 'Nom commercial obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Nom Commercial *"
                  placeholder="ex: Paracétamol 500mg"
                  error={!!errors.nom_commercial}
                  helperText={errors.nom_commercial?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="dci" control={control}
              rules={{ required: 'DCI obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="DCI *"
                  placeholder="ex: Paracétamol"
                  error={!!errors.dci} helperText={errors.dci?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="categorie" control={control}
              rules={{ required: 'Catégorie obligatoire' }}
              render={({ field }) => (
                <FormControl error={!!errors.categorie}>
                  <InputLabel>Catégorie *</InputLabel>
                  <Select {...field} label="Catégorie *" sx={{ borderRadius: 2 }}>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{errors.categorie?.message as string}</FormHelperText>
                </FormControl>
              )} />

            <Controller name="forme_galenique" control={control}
              rules={{ required: 'Forme galénique obligatoire' }}
              render={({ field }) => (
                <FormControl error={!!errors.forme_galenique}>
                  <InputLabel>Forme Galénique *</InputLabel>
                  <Select {...field} label="Forme Galénique *" sx={{ borderRadius: 2 }}>
                    {FORMES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                  <FormHelperText>{errors.forme_galenique?.message}</FormHelperText>
                </FormControl>
              )} />

            <Controller name="dosage" control={control}
              rules={{ required: 'Dosage obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Dosage *" placeholder="ex: 500mg"
                  error={!!errors.dosage} helperText={errors.dosage?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="unite_stock" control={control}
              rules={{ required: 'Unité obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Unité de Conditionnement *"
                  placeholder="ex: Boîte de 30"
                  error={!!errors.unite_stock} helperText={errors.unite_stock?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

            <Controller name="code_barres" control={control}
              rules={{
                required: 'Code-barres obligatoire',
                pattern: { value: /^[0-9]{8,14}$/, message: 'Code invalide (8-14 chiffres)' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Code-barres (SKU/CIP) *"
                  placeholder="ex: 3400936111005"
                  error={!!errors.code_barres}
                  helperText={errors.code_barres?.message}
                  // ✅ Saisie manuelle : lookup + vérif doublon
                  onChange={(e) => {
                    field.onChange(e);
                    const code = e.target.value;
                    if (code.length >= 8) {
                      handleBarcodeDetected(code);
                    }
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

            <Controller name="prix_unitaire" control={control}
              rules={{ required: 'Prix obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Prix Unitaire (FCFA) *" type="number"
                  placeholder="ex: 2500"
                  error={!!errors.prix_unitaire} helperText={errors.prix_unitaire?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />

          </Box>
        </Section>

        {/* Section 2 — Stock & Alertes */}
        <Section
          icon={<Analytics sx={{ color: '#2196F3' }} />}
          title="Stock & Niveaux d'Alerte"
          subtitle="Paramétrez les seuils critiques pour éviter les ruptures."
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <Controller name="seuil_alerte" control={control}
              rules={{ required: 'Seuil obligatoire' }}
              render={({ field }) => (
                <TextField {...field} label="Seuil d'Alerte Critique *" type="number"
                  placeholder="ex: 10"
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

        {/* Section 3 — Notes */}
        <Section
          icon={<Notes sx={{ color: '#2196F3' }} />}
          title="Notes & Observations"
          subtitle="Instructions spéciales ou précautions de stockage."
        >
          <Controller name="indications_therapeutiques" control={control}
            render={({ field }) => (
              <TextField {...field} label="Indications Thérapeutiques"
                multiline rows={3}
                placeholder="Interactions médicamenteuses, notes de conservation..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, width: '100%' }} />
            )} />
        </Section>

        {/* Footer */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          p: 3, bgcolor: 'white', borderRadius: 3, border: '1px solid #E3F2FD', mt: 1,
        }}>
          <Typography variant="caption" color="text.secondary">
            • Les champs marqués d'un astérisque (*) sont obligatoires.
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
                background: 'linear-gradient(135deg, #2196F3, #1565C0)', px: 3,
              }}>
              {loading
                ? 'Enregistrement...'
                : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le médicament'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Scanner inline */}
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
            <Button onClick={closeScanner} sx={{ mt: 2, textTransform: 'none' }}>
              Annuler
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}