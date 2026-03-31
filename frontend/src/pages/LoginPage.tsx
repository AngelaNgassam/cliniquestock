import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper,
  InputAdornment, IconButton, CircularProgress,
  Alert, Divider, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Email, Lock, Visibility, VisibilityOff,
  LocalHospital,
} from '@mui/icons-material';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.login(data.email, data.password);
      const me = await authService.getMe();
      setAuth(me, res.access, res.role);
      if (res.role === 'ADMINISTRATEUR') navigate('/dashboard/admin');
      else navigate('/dashboard/pharmacien');
    } catch {
      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F8FF' }}>
      {/* Panneau gauche */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', justifyContent: 'center',
        alignItems: 'flex-start', px: 8,
        background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Cercles décoratifs */}
        {[...Array(3)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            width: 300 + i * 150, height: 300 + i * 150,
            borderRadius: '50%',
            border: '1px solid rgba(33,150,243,0.15)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }} />
        ))}

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, zIndex: 1 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2,
            bgcolor: '#2196F3', display: 'flex',
            alignItems: 'center', justifyContent: 'center', mr: 2,
          }}>
            <LocalHospital sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="#1565C0">
            CliniqueStock
          </Typography>
        </Box>

        <Typography variant="h3" fontWeight={800} color="#0D47A1" sx={{ mb: 2, zIndex: 1, lineHeight: 1.2 }}>
          Optimisez la gestion de votre{' '}
          <Box component="span" sx={{ color: '#2196F3' }}>stock médical</Box>
          {' '}avec précision.
        </Typography>

        <Typography variant="body1" color="#546E7A" sx={{ mb: 5, zIndex: 1, maxWidth: 480, lineHeight: 1.8 }}>
          Une plateforme intuitive pour centraliser vos inventaires, suivre les péremptions
          et automatiser vos commandes en toute sécurité.
        </Typography>

        {[
          { icon: '📦', title: 'Gestion de Stock', desc: 'Inventaire en temps réel avec suivi par lots et dates d\'expiration.' },
          { icon: '📊', title: 'Analytique Avancée', desc: 'Visualisez vos consommations et prévoyez vos besoins futurs.' },
          { icon: '🔒', title: 'Sécurité & Conformité', desc: 'Accès sécurisé et journal d\'audit complet pour chaque mouvement.' },
        ].map((item) => (
          <Box key={item.title} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2.5, zIndex: 1 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(33,150,243,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mr: 2, flexShrink: 0, fontSize: 18,
            }}>{item.icon}</Box>
            <Box>
              <Typography fontWeight={700} color="#1565C0" variant="body2">{item.title}</Typography>
              <Typography variant="body2" color="#607D8B">{item.desc}</Typography>
            </Box>
          </Box>
        ))}

        <Typography variant="caption" color="#90A4AE" sx={{ mt: 4, zIndex: 1 }}>
          Utilisé par plus de 500 cliniques à travers l'Europe pour une excellence opérationnelle.
        </Typography>
      </Box>

      {/* Panneau droit — formulaire */}
      <Box sx={{
        width: { xs: '100%', md: 480 }, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        px: { xs: 3, md: 6 }, bgcolor: 'white',
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" fontWeight={800} color="#0D47A1" gutterBottom>
            Bon retour 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Connectez-vous pour accéder à votre inventaire clinique.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="body2" fontWeight={600} color="#37474F" sx={{ mb: 1 }}>
              Adresse Email
            </Typography>
            <TextField
              fullWidth
              placeholder="nom@clinique.fr"
              {...register('email', {
                required: 'Email requis',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: '#90CAF9' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600} color="#37474F">
                Mot de passe
              </Typography>
              <Typography variant="body2" color="#2196F3" sx={{ cursor: 'pointer', fontWeight: 500 }}>
                Mot de passe oublié ?
              </Typography>
            </Box>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password', { required: 'Mot de passe requis' })}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#90CAF9' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <FormControlLabel
              control={<Checkbox size="small" sx={{ color: '#2196F3' }} />}
              label={<Typography variant="body2" color="text.secondary">Se souvenir de moi sur cet appareil</Typography>}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit" fullWidth variant="contained"
              disabled={loading}
              sx={{
                py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: 16,
                background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                textTransform: 'none',
                boxShadow: '0 4px 20px rgba(33,150,243,0.4)',
                '&:hover': { boxShadow: '0 6px 25px rgba(33,150,243,0.5)' },
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">OU CONTINUER AVEC</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            {['Google', 'Microsoft'].map((provider) => (
              <Button key={provider} fullWidth variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#E0E0E0', color: '#37474F' }}>
                {provider}
              </Button>
            ))}
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Conditions d'utilisation · Politique de confidentialité · Support technique
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}