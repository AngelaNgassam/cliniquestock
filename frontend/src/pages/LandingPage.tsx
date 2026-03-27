import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Container, Card,
  CardContent, AppBar, Toolbar, Chip,
} from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';
import {
  Inventory2, Analytics, Security, Speed,
  CheckCircle, ArrowForward, LocalHospital,
  Notifications, Assessment,
} from '@mui/icons-material';

const features = [
  { icon: <Inventory2 sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Gestion des stocks', desc: 'Suivi en temps réel des médicaments avec alertes automatiques de rupture et de péremption.' },
  { icon: <Analytics sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Analytique avancée', desc: 'Tableaux de bord interactifs pour visualiser consommations, tendances et prévisions.' },
  { icon: <Security sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Sécurité & Audit', desc: 'Journal d\'audit complet, contrôle d\'accès par rôle et traçabilité totale des opérations.' },
  { icon: <Speed sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Performance optimale', desc: 'Interface rapide et intuitive, accessible depuis n\'importe quel appareil connecté.' },
  { icon: <Notifications sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Alertes intelligentes', desc: 'Notifications automatiques pour les stocks critiques, péremptions et anomalies détectées.' },
  { icon: <Assessment sx={{ fontSize: 36, color: '#2196F3' }} />, title: 'Rapports détaillés', desc: 'Génération automatique de rapports de consommation, inventaire et valorisation du stock.' },
];

const stats = [
  { value: '500+', label: 'Cliniques partenaires' },
  { value: '99.9%', label: 'Disponibilité garantie' },
  { value: '< 2s', label: 'Temps de réponse' },
  { value: '24/7', label: 'Support technique' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#F8FBFF', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <AppBar position="sticky" elevation={0} sx={{
        bgcolor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E3F2FD',
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 6 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: '#2196F3', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <LocalHospital sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} color="#1565C0">
              CliniqueStock
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #2196F3, #1565C0)',
              px: 3, boxShadow: '0 4px 15px rgba(33,150,243,0.3)',
            }}
          >
            Se connecter
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Hero ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #E3F2FD 0%, #F8FBFF 60%, #BBDEFB 100%)',
        pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 14 },
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Cercles décoratifs */}
        <Box sx={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(33,150,243,0.08) 0%, transparent 70%)',
          top: -200, right: -100, pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(21,101,192,0.06) 0%, transparent 70%)',
          bottom: -150, left: -50, pointerEvents: 'none',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Chip
              label="✨ Plateforme de nouvelle génération"
              sx={{
                bgcolor: 'rgba(33,150,243,0.1)', color: '#1565C0',
                fontWeight: 600, mb: 3, px: 2,
              }}
            />

            <Typography
              variant="h2" fontWeight={900} color="#0D47A1"
              sx={{ mb: 3, lineHeight: 1.15, fontSize: { xs: '2.2rem', md: '3.2rem' } }}
            >
              Gérez votre stock médical{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                avec intelligence
              </Box>
            </Typography>

            <Typography variant="h6" color="#546E7A" sx={{ mb: 5, lineHeight: 1.8, fontWeight: 400 }}>
              CliniqueStock centralise la gestion de vos inventaires pharmaceutiques,
              automatise vos commandes et garantit la conformité réglementaire de votre établissement.
            </Typography>

            <Button
              variant="contained" size="large"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/login')}
              sx={{
                borderRadius: 3, textTransform: 'none', fontWeight: 700,
                fontSize: 17, px: 5, py: 1.8,
                background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                boxShadow: '0 8px 30px rgba(33,150,243,0.4)',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(33,150,243,0.5)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Accéder à la plateforme
            </Button>

            {/* Points de confiance */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 5, flexWrap: 'wrap' }}>
              {['Certifié ISO 27001', 'Conforme RGPD', 'Hébergement HDS'].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle sx={{ color: '#4CAF50', fontSize: 18 }} />
                  <Typography variant="body2" color="#546E7A" fontWeight={500}>{item}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ bgcolor: '#1565C0', py: 5 }}>
        <Container maxWidth="lg">
          <Grid2 container spacing={4} justifyContent="center">
            {stats.map((stat) => (
              <Grid2 xs={6} md={3} key={stat.label} sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={900} color="white" sx={{ mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)" fontWeight={500}>
                  {stat.label}
                </Typography>
              </Grid2>
            ))}
          </Grid2>
        </Container>
      </Box>

      {/* ── Features ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={800} color="#0D47A1" gutterBottom>
            Tout ce dont votre clinique a besoin
          </Typography>
          <Typography variant="body1" color="#546E7A" sx={{ maxWidth: 600, mx: 'auto' }}>
            Une solution complète conçue spécifiquement pour les établissements de santé.
          </Typography>
        </Box>

        <Grid2 container spacing={4}>
          {features.map((feature) => (
            <Grid2 xs={12} sm={6} md={4} key={feature.title}>
              <Card elevation={0} sx={{
                height: '100%',
                border: '1px solid #E3F2FD',
                borderRadius: 3, p: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 20px 60px rgba(33,150,243,0.15)',
                  borderColor: '#90CAF9',
                },
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{
                    width: 64, height: 64, borderRadius: 3,
                    bgcolor: 'rgba(33,150,243,0.08)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', mb: 2.5,
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#0D47A1" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="#607D8B" lineHeight={1.7}>
                    {feature.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>

      {/* ── CTA final ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1565C0, #2196F3)',
        py: { xs: 8, md: 10 }, textAlign: 'center',
      }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} color="white" gutterBottom>
            Prêt à transformer votre gestion ?
          </Typography>
          <Typography variant="h6" color="rgba(255,255,255,0.8)" sx={{ mb: 5, fontWeight: 400 }}>
            Rejoignez les 500+ établissements qui font confiance à CliniqueStock.
          </Typography>
          <Button
            variant="contained" size="large"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/login')}
            sx={{
              bgcolor: 'white', color: '#1565C0',
              borderRadius: 3, textTransform: 'none',
              fontWeight: 700, fontSize: 17, px: 5, py: 1.8,
              '&:hover': { bgcolor: '#E3F2FD', transform: 'translateY(-2px)' },
              transition: 'all 0.3s ease',
            }}
          >
            Accéder à la plateforme
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ bgcolor: '#0D47A1', py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="rgba(255,255,255,0.5)">
          © 2026 CliniqueStock — Tous droits réservés
        </Typography>
      </Box>

    </Box>
  );
}