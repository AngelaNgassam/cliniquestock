import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, Button, TextField, Tabs, Tab,
  Divider, CircularProgress, Alert, Switch, FormControlLabel,
  InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import {
  Settings, Notifications, Inventory2, Save,
  Refresh, Draw, Delete, Undo, CheckCircle,
  Visibility, VisibilityOff,
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

// ── Service signature ─────────────────────────────────────────────────────────
const signatureService = {
  get:  ()          => api.get('/signature/'),
  save: (data: any) => api.post('/signature/', data),
};

// ── Onglet Notifications ──────────────────────────────────────────────────────
function OngletNotifications() {
  const [prefs, setPrefs] = useState({
    stocks_faibles_email:    true,
    stocks_faibles_sms:      true,
    peremption_email:        true,
    peremption_sms:          false,
    retards_livraison_email: false,
    retards_livraison_sms:   true,
    email_admin:             '',
    telephone_urgence:       '',
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) =>
    setPrefs(p => ({ ...p, [key]: !(p as any)[key] }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Simulé
    toast.success('Préférences de notification enregistrées.');
    setSaving(false);
  };

  const NotifRow = ({ label, desc, keyEmail, keySms }: {
    label: string; desc: string; keyEmail: string; keySms: string;
  }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2,
      borderBottom: '1px solid #F0F4FF' }}>
      <Box>
        <Typography fontSize={14} fontWeight={600} color="#0D47A1">{label}</Typography>
        <Typography fontSize={12} color="text.secondary">{desc}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography fontSize={10} color="text.secondary">✉️</Typography>
          <Switch checked={(prefs as any)[keyEmail]} onChange={() => toggle(keyEmail)} size="small" />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography fontSize={10} color="text.secondary">📱</Typography>
          <Switch checked={(prefs as any)[keySms]} onChange={() => toggle(keySms)} size="small" />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box>
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Notifications sx={{ color: '#1565C0', fontSize: 20 }} />
          <Typography fontWeight={700} color="#0D47A1" fontSize={15}>Alertes d'inventaire</Typography>
        </Box>
        <Typography fontSize={12} color="text.secondary" sx={{ mb: 2 }}>
          Choisissez comment être informé des variations de stock critiques.
        </Typography>
        <NotifRow label="Stocks Faibles" desc="Notifier quand un médicament passe sous le seuil d'alerte."
          keyEmail="stocks_faibles_email" keySms="stocks_faibles_sms" />
        <NotifRow label="Dates de Péremption" desc="Alerte pour les produits expirant dans les 30 jours."
          keyEmail="peremption_email" keySms="peremption_sms" />
        <NotifRow label="Retards de Livraison" desc="Alerte si un bon de commande dépasse la date prévue de 48h."
          keyEmail="retards_livraison_email" keySms="retards_livraison_sms" />
      </Card>

      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Typography fontWeight={700} color="#0D47A1" fontSize={15} sx={{ mb: 2 }}>
          Canaux de communication
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Email Administrateur Principal" value={prefs.email_admin}
            onChange={e => setPrefs(p => ({ ...p, email_admin: e.target.value }))}
            placeholder="contact@clinique.fr"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Numéro d'Urgence (SMS)" value={prefs.telephone_urgence}
            onChange={e => setPrefs(p => ({ ...p, telephone_urgence: e.target.value }))}
            placeholder="+237 6XX XXX XXX"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            helperText="Les notifications critiques ignorent les horaires de silence." />
        </Box>
      </Card>

      <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
        onClick={handleSave} disabled={saving}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </Button>
    </Box>
  );
}

// ── Onglet Seuils de stock ────────────────────────────────────────────────────
function OngletSeuils() {
  const [seuils, setSeuils] = useState({
    seuil_stock_global: 10,
    seuil_critique:     5,
    seuil_peremption_warning:  7,
    seuil_peremption_critique: 3,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/config/seuils/', seuils);
      toast.success('Seuils enregistrés.');
    } catch { toast.error('Erreur.'); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Inventory2 sx={{ color: '#1565C0', fontSize: 20 }} />
          <Typography fontWeight={700} color="#0D47A1" fontSize={15}>Seuils de stock</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Seuil de stock global (unités)', key: 'seuil_stock_global', color: '#F57F17',
              desc: 'Déclenche une alerte Avertissement.' },
            { label: 'Seuil critique (unités)',        key: 'seuil_critique',     color: '#C62828',
              desc: 'Déclenche une alerte Critique.' },
            { label: 'Avertissement péremption (jours)', key: 'seuil_peremption_warning', color: '#F57F17',
              desc: 'Alerte si lot expire dans moins de X jours.' },
            { label: 'Critique péremption (jours)',    key: 'seuil_peremption_critique', color: '#C62828',
              desc: 'Alerte critique si lot expire dans moins de X jours.' },
          ].map(({ label, key, color, desc }) => (
            <Box key={key} sx={{ p: 2, border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`,
              borderRadius: 2, bgcolor: `${color}08` }}>
              <Typography fontSize={13} fontWeight={700} color={color} sx={{ mb: 0.5 }}>{label}</Typography>
              <Typography fontSize={12} color="text.secondary" sx={{ mb: 1.5 }}>{desc}</Typography>
              <TextField type="number" size="small"
                value={(seuils as any)[key]}
                onChange={e => setSeuils(p => ({ ...p, [key]: Number(e.target.value) }))}
                inputProps={{ min: 0 }}
                sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
          ))}
        </Box>
      </Card>
      <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
        onClick={handleSave} disabled={saving}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer les seuils'}
      </Button>
    </Box>
  );
}

// ── Onglet Signature ──────────────────────────────────────────────────────────
function OngletSignature() {
  const { user }      = useAuthStore();
  const sigRef        = useRef<SignatureCanvas>(null);
  const [nom,         setNom]         = useState(user ? `${user.prenom} ${user.nom}` : '');
  const [fonction,    setFonction]    = useState('Pharmacien en chef');
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [sigExistante, setSigExistante] = useState<string | null>(null);
  const [modeDessin,  setModeDessin]  = useState(false);

  useEffect(() => {
    signatureService.get().then(r => {
      const data = r.data as any;
      if (data.exists) {
        setNom(data.nom);
        setFonction(data.fonction);
        setSigExistante(data.image_b64);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleEffacer = () => sigRef.current?.clear();

  const handleEnregistrer = async () => {
    if (!nom.trim()) { toast.error('Nom du signataire requis.'); return; }

    let imageB64 = '';
    if (modeDessin && sigRef.current) {
      if (sigRef.current.isEmpty()) { toast.error('Veuillez dessiner votre signature.'); return; }
      imageB64 = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    } else if (sigExistante) {
      imageB64 = sigExistante;
    } else {
      toast.error('Veuillez dessiner votre signature.'); return;
    }

    setSaving(true);
    try {
      await signatureService.save({ nom, fonction, image: imageB64 });
      setSigExistante(imageB64);
      setModeDessin(false);
      toast.success('✅ Signature enregistrée avec succès !', { duration: 4000 });
    } catch { toast.error('Erreur lors de l\'enregistrement.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      {/* Informations du signataire */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Typography fontWeight={700} color="#0D47A1" fontSize={15} sx={{ mb: 2 }}>
          Informations du signataire
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Nom du signataire *" value={nom} onChange={e => setNom(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Fonction" value={fonction} onChange={e => setFonction(e.target.value)}
            placeholder="ex: Pharmacien en chef, Propriétaire"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
      </Card>

      {/* Zone de signature */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Draw sx={{ color: '#1565C0', fontSize: 20 }} />
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>
              Zone de signature
            </Typography>
          </Box>
          {sigExistante && !modeDessin && (
            <Button size="small" variant="outlined" onClick={() => setModeDessin(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Modifier la signature
            </Button>
          )}
        </Box>

        {/* Signature existante */}
        {sigExistante && !modeDessin && (
          <Box sx={{ border: '2px solid #E3F2FD', borderRadius: 2, p: 2, bgcolor: '#FAFCFF',
            display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
            <Box sx={{ textAlign: 'center' }}>
              <img src={sigExistante} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%' }} />
              <Typography fontSize={13} fontWeight={700} color="#0D47A1" sx={{ mt: 1 }}>{nom}</Typography>
              <Typography fontSize={12} color="text.secondary">{fonction}</Typography>
            </Box>
          </Box>
        )}

        {/* Canvas dessin */}
        {(!sigExistante || modeDessin) && (
          <>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Dessinez votre signature dans la zone ci-dessous (souris ou doigt sur mobile).
            </Alert>
            <Box sx={{
              border: '2px dashed #90CAF9', borderRadius: 2, bgcolor: 'white',
              cursor: 'crosshair', overflow: 'hidden',
              '&:hover': { borderColor: '#1565C0' },
            }}>
              <SignatureCanvas
                ref={sigRef}
                penColor="black"
                canvasProps={{
                  width:  600,
                  height: 160,
                  style: { width: '100%', height: 160, display: 'block' },
                }}
                backgroundColor="white"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button size="small" variant="outlined" startIcon={<Delete />}
                onClick={handleEffacer} color="error"
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
                Effacer
              </Button>
              {modeDessin && (
                <Button size="small" variant="outlined"
                  onClick={() => setModeDessin(false)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
                  Annuler
                </Button>
              )}
            </Box>
          </>
        )}
      </Card>

      {/* Aperçu PDF */}
      {(sigExistante || modeDessin) && (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
          <Typography fontWeight={700} color="#0D47A1" fontSize={15} sx={{ mb: 2 }}>
            Aperçu dans le document
          </Typography>
          <Box sx={{
            bgcolor: '#F8FBFF', border: '1px solid #E3F2FD', borderRadius: 2,
            p: 3, display: 'inline-block', minWidth: 200,
          }}>
            <Box sx={{ borderBottom: '1px solid #CFD8DC', pb: 1, mb: 1, minWidth: 180, minHeight: 80,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {sigExistante && !modeDessin && (
                <img src={sigExistante} alt="Signature" style={{ maxHeight: 70, maxWidth: 180 }} />
              )}
              {modeDessin && (
                <Typography fontSize={11} color="text.secondary" fontStyle="italic">
                  (signature en cours)
                </Typography>
              )}
            </Box>
            <Typography fontSize={13} fontWeight={700} color="#0D47A1" sx={{ textAlign: 'center' }}>{nom}</Typography>
            <Typography fontSize={12} color="text.secondary" sx={{ textAlign: 'center' }}>{fonction}</Typography>
          </Box>
        </Card>
      )}

      <Button variant="contained"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
        onClick={handleEnregistrer} disabled={saving}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer la signature'}
      </Button>
    </Box>
  );
}

// ── Onglet Système ────────────────────────────────────────────────────────────
function OngletSysteme() {
  return (
    <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3 }}>
      <Typography fontWeight={700} color="#0D47A1" fontSize={15} sx={{ mb: 2 }}>
        Informations système
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          ['Nom du système',   'CliniqueStock Enterprise'],
          ['Version',          'v1.0.4'],
          ['Environnement',    'Production'],
          ['Base de données',  'PostgreSQL 16'],
          ['Backend',          'Django 6.0.3 + DRF'],
          ['Frontend',         'React 18 + TypeScript'],
        ].map(([label, value]) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between',
            p: 1.5, bgcolor: '#F8FBFF', borderRadius: 2 }}>
            <Typography fontSize={13} fontWeight={600} color="#546E7A">{label}</Typography>
            <Typography fontSize={13} color="#0D47A1" fontWeight={600}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ParametresPage() {
  const [onglet, setOnglet] = useState(0);

  const onglets = [
    { label: 'Notifications',  icon: <Notifications sx={{ fontSize: 18 }} /> },
    { label: 'Seuils de Stock', icon: <Inventory2   sx={{ fontSize: 18 }} /> },
    { label: 'Signature',       icon: <Draw         sx={{ fontSize: 18 }} /> },
    { label: 'Système & API',   icon: <Settings     sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D47A1">Paramètres du Système</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gérez les préférences de votre clinique, les seuils d'inventaire et les connexions API.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, mb: 3 }}>
        <Tabs value={onglet} onChange={(_, v) => setOnglet(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}>
          {onglets.map((o, i) => (
            <Tab key={i} label={o.label} icon={o.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      {/* Contenu */}
      {onglet === 0 && <OngletNotifications />}
      {onglet === 1 && <OngletSeuils />}
      {onglet === 2 && <OngletSignature />}
      {onglet === 3 && <OngletSysteme />}
    </Box>
  );
}