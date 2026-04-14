import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Card, Button, TextField, Tabs, Tab,
  Divider, CircularProgress, Alert, Switch,
} from '@mui/material';
import {
  Settings, Notifications, Inventory2, Save,
  Draw, Delete, CheckCircle,
} from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

// ── Service signature ─────────────────────────────────────────────────────────
const signatureService = {
  get:  ()          => api.get('/signature/'),
  save: (data: any) => api.post('/signature/', data),
};

// ── Canvas signature maison (sans lib externe pour éviter le bug) ────────────
function SignaturePad({
  onSave, onClear, sigExistante,
}: {
  onSave:        (dataUrl: string) => void;
  onClear:       () => void;
  sigExistante?: string | null;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing     = useRef(false);
  const isEmpty     = useRef(true);

  // ── Redimensionner le canvas quand le conteneur change de taille ───────────
  const resizeCanvas = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Sauvegarder le contenu actuel
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);

    // Ajuster la taille réelle du canvas
    const rect    = container.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = 180;

    // Fond blanc
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Restaurer le contenu
      if (!isEmpty.current) ctx.drawImage(tempCanvas, 0, 0);
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // ── Coordonnées correctes (tient compte du scale CSS) ─────────────────────
  const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: ((e as MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as MouseEvent).clientY - rect.top)  * scaleY,
    };
  };

  // ── Dessin ─────────────────────────────────────────────────────────────────
  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    isEmpty.current = false;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => {
    drawing.current = false;
  }, []);

  // ── Attacher les événements ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown',  startDraw, { passive: false });
    canvas.addEventListener('mousemove',  draw,      { passive: false });
    canvas.addEventListener('mouseup',    stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove',  draw,      { passive: false });
    canvas.addEventListener('touchend',   stopDraw);

    return () => {
      canvas.removeEventListener('mousedown',  startDraw);
      canvas.removeEventListener('mousemove',  draw);
      canvas.removeEventListener('mouseup',    stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove',  draw);
      canvas.removeEventListener('touchend',   stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleEffacer = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isEmpty.current = true;
    onClear();
  };

  const handleSauvegarder = () => {
    if (isEmpty.current) {
      toast.error('Veuillez dessiner votre signature.');
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
    onSave(dataUrl);
  };

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <Alert severity="info" icon={false}
        sx={{ mb: 1.5, borderRadius: 2, fontSize: 12, py: 0.5 }}>
        ✏️ Dessinez votre signature ci-dessous (souris ou doigt sur mobile)
      </Alert>
      <Box sx={{
        border: '2px dashed #90CAF9', borderRadius: 2, overflow: 'hidden',
        cursor: 'crosshair', bgcolor: 'white', width: '100%',
        '&:hover': { borderColor: '#1565C0', borderStyle: 'solid' },
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: 180, touchAction: 'none' }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" startIcon={<Delete />}
          onClick={handleEffacer} color="error"
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
          Effacer
        </Button>
        <Button size="small" variant="contained" startIcon={<CheckCircle />}
          onClick={handleSauvegarder}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
          Utiliser cette signature
        </Button>
      </Box>
    </Box>
  );
}

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
    await new Promise(r => setTimeout(r, 600));
    toast.success('Préférences enregistrées.');
    setSaving(false);
  };

  const NotifRow = ({ label, desc, keyEmail, keySms }: {
    label: string; desc: string; keyEmail: string; keySms: string;
  }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      py: 2, borderBottom: '1px solid #F0F4FF' }}>
      <Box>
        <Typography fontSize={14} fontWeight={600} color="#0D47A1">{label}</Typography>
        <Typography fontSize={12} color="text.secondary">{desc}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography fontSize={10} color="text.secondary">✉️ Email</Typography>
          <Switch checked={(prefs as any)[keyEmail]} onChange={() => toggle(keyEmail)} size="small" />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography fontSize={10} color="text.secondary">📱 SMS</Typography>
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
            helperText="Les notifications critiques ignorent les horaires de silence."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
      </Card>

      <Button variant="contained"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
        onClick={handleSave} disabled={saving}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </Button>
    </Box>
  );
}

// ── Onglet Seuils ─────────────────────────────────────────────────────────────
function OngletSeuils() {
  const [seuils, setSeuils] = useState({
    seuil_stock_global:        10,
    seuil_critique:            5,
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
            { label: 'Seuil de stock global (unités)', key: 'seuil_stock_global',        color: '#F57F17',
              desc: 'Déclenche une alerte Avertissement.' },
            { label: 'Seuil critique (unités)',        key: 'seuil_critique',             color: '#C62828',
              desc: 'Déclenche une alerte Critique.' },
            { label: 'Avertissement péremption (j)',   key: 'seuil_peremption_warning',   color: '#F57F17',
              desc: 'Alerte si lot expire dans moins de X jours.' },
            { label: 'Critique péremption (j)',        key: 'seuil_peremption_critique',  color: '#C62828',
              desc: 'Alerte critique si lot expire dans moins de X jours.' },
          ].map(({ label, key, color, desc }) => (
            <Box key={key} sx={{ p: 2, border: `1px solid ${color}30`,
              borderLeft: `4px solid ${color}`, borderRadius: 2, bgcolor: `${color}08` }}>
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
      <Button variant="contained"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
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
  const { user }    = useAuthStore();
  const [nom,       setNom]       = useState(user ? `${user.prenom} ${user.nom}` : '');
  const [fonction,  setFonction]  = useState('Pharmacien en chef');
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [sigB64,    setSigB64]    = useState<string | null>(null);  // signature validée
  const [modeDessin, setModeDessin] = useState(false);

  useEffect(() => {
    signatureService.get()
      .then(r => {
        const d = r.data as any;
        if (d.exists) {
          setNom(d.nom);
          setFonction(d.fonction);
          setSigB64(d.image_b64);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSignatureSaved = (dataUrl: string) => {
    setSigB64(dataUrl);
    setModeDessin(false);
    toast.success('Signature prête — cliquez sur "Enregistrer" pour sauvegarder.');
  };

  const handleEnregistrer = async () => {
    if (!nom.trim()) { toast.error('Nom du signataire requis.'); return; }
    if (!sigB64)     { toast.error('Veuillez dessiner votre signature.'); return; }

    setSaving(true);
    try {
      await signatureService.save({ nom, fonction, image: sigB64 });
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
          <TextField label="Nom du signataire *" value={nom}
            onChange={e => setNom(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Fonction" value={fonction}
            onChange={e => setFonction(e.target.value)}
            placeholder="Pharmacien en chef"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>
      </Card>

      {/* Zone de signature */}
      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Draw sx={{ color: '#1565C0', fontSize: 20 }} />
            <Typography fontWeight={700} color="#0D47A1" fontSize={15}>Zone de signature</Typography>
          </Box>
          {sigB64 && !modeDessin && (
            <Button size="small" variant="outlined"
              onClick={() => setModeDessin(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Modifier la signature
            </Button>
          )}
        </Box>

        {/* Afficher la signature validée */}
        {sigB64 && !modeDessin && (
          <Box sx={{ border: '2px solid #E3F2FD', borderRadius: 2, p: 3,
            bgcolor: '#FAFCFF', display: 'flex', justifyContent: 'center',
            alignItems: 'center', minHeight: 150 }}>
            <Box sx={{ textAlign: 'center' }}>
              <img src={sigB64} alt="Signature"
                style={{ maxHeight: 100, maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              <Typography fontSize={13} fontWeight={700} color="#0D47A1" sx={{ mt: 1 }}>{nom}</Typography>
              <Typography fontSize={12} color="text.secondary">{fonction}</Typography>
            </Box>
          </Box>
        )}

        {/* Canvas dessin */}
        {(!sigB64 || modeDessin) && (
          <>
            {modeDessin && sigB64 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Dessinez une nouvelle signature. L'ancienne sera remplacée.
              </Alert>
            )}
            <SignaturePad
              onSave={handleSignatureSaved}
              onClear={() => {}}
              sigExistante={sigB64}
            />
          </>
        )}
      </Card>

      {/* Aperçu PDF */}
      {sigB64 && (
        <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, p: 3, mb: 3 }}>
          <Typography fontWeight={700} color="#0D47A1" fontSize={15} sx={{ mb: 2 }}>
            Aperçu dans le document PDF
          </Typography>
          <Box sx={{ bgcolor: '#F8FBFF', border: '1px solid #E3F2FD', borderRadius: 2,
            p: 3, display: 'inline-block', minWidth: 220 }}>
            <Box sx={{ borderBottom: '1px solid #CFD8DC', pb: 1, mb: 1,
              display: 'flex', justifyContent: 'center', alignItems: 'flex-end', minHeight: 80 }}>
              <img src={sigB64} alt="Signature"
                style={{ maxHeight: 70, maxWidth: 200, display: 'block' }} />
            </Box>
            <Typography fontSize={13} fontWeight={700} color="#0D47A1"
              sx={{ textAlign: 'center' }}>{nom}</Typography>
            <Typography fontSize={12} color="text.secondary"
              sx={{ textAlign: 'center' }}>{fonction}</Typography>
          </Box>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          onClick={handleEnregistrer} disabled={saving || !sigB64}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}>
          {saving ? 'Enregistrement...' : 'Enregistrer la signature'}
        </Button>
        {!sigB64 && !modeDessin && (
          <Button variant="outlined" startIcon={<Draw />}
            onClick={() => setModeDessin(true)}
            sx={{ borderRadius: 2, textTransform: 'none' }}>
            Dessiner ma signature
          </Button>
        )}
      </Box>
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
          ['Nom du système',  'CliniqueStock Enterprise'],
          ['Version',         'v1.0.4'],
          ['Environnement',   'Production'],
          ['Base de données', 'PostgreSQL 16'],
          ['Backend',         'Django 6.0.3 + DRF'],
          ['Frontend',        'React 18 + TypeScript'],
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

  return (
    <Box>
      <Toaster position="top-right" />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0D47A1">Paramètres du Système</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Gérez les préférences de votre clinique, les seuils d'inventaire et les connexions API.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid #E3F2FD', borderRadius: 3, mb: 3 }}>
        <Tabs value={onglet} onChange={(_, v) => setOnglet(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}>
          <Tab label="Notifications"  icon={<Notifications  sx={{ fontSize: 17 }} />} iconPosition="start" />
          <Tab label="Seuils de Stock" icon={<Inventory2    sx={{ fontSize: 17 }} />} iconPosition="start" />
          <Tab label="Signature"      icon={<Draw           sx={{ fontSize: 17 }} />} iconPosition="start" />
          <Tab label="Système & API"  icon={<Settings       sx={{ fontSize: 17 }} />} iconPosition="start" />
        </Tabs>
      </Card>

      {onglet === 0 && <OngletNotifications />}
      {onglet === 1 && <OngletSeuils />}
      {onglet === 2 && <OngletSignature />}
      {onglet === 3 && <OngletSysteme />}
    </Box>
  );
}