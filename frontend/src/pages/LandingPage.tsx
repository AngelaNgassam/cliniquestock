import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, Container, AppBar, Toolbar, Chip,
} from '@mui/material';
import {
  Inventory2, Analytics, Security, Speed,
  CheckCircle, ArrowForward, LocalHospital,
  Notifications, Assessment,
} from '@mui/icons-material';
import {
  motion, useScroll, useTransform, useInView,
  type Variants, type Transition,
} from 'framer-motion';

// ── Ease cubic-bezier typé correctement ──────────────────────────────────────
const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

// ── Données ───────────────────────────────────────────────────────────────────
const features = [
  { icon: Inventory2,     title: 'Gestion des stocks',    desc: 'Suivi en temps réel avec alertes automatiques de rupture et de péremption.',        accent: '#2196F3' },
  { icon: Analytics,     title: 'Analytique avancée',     desc: 'Tableaux de bord interactifs pour visualiser consommations et tendances.',           accent: '#3F51B5' },
  { icon: Security,      title: 'Sécurité & Audit',       desc: "Journal d'audit complet, contrôle d'accès par rôle et traçabilité totale.",          accent: '#0D47A1' },
  { icon: Speed,         title: 'Performance optimale',   desc: "Interface rapide et intuitive, accessible depuis n'importe quel appareil.",          accent: '#1565C0' },
  { icon: Notifications, title: 'Alertes intelligentes',  desc: 'Notifications automatiques pour stocks critiques, péremptions et anomalies.',        accent: '#1976D2' },
  { icon: Assessment,    title: 'Rapports détaillés',     desc: 'Génération automatique de rapports de consommation, inventaire et valorisation.',    accent: '#2196F3' },
];

const stats = [
  { value: 500,  suffix: '+',  label: 'Cliniques partenaires'  },
  { value: 99,   suffix: '%',  label: 'Disponibilité garantie' },
  { value: 2,    suffix: 's',  label: 'Temps de réponse'       },
  { value: 24,   suffix: '/7', label: 'Support technique'      },
];

// ── Hook compteur animé ───────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const id = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration, started]);
  return count;
}

// ── Variants d'animation (ease correctement typé) ────────────────────────────
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.1,
      ease: EASE_OUT,
    } as Transition,
  }),
};

const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
};

const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: EASE_OUT,
    } as Transition,
  }),
};

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ value, suffix, label, started }: {
  value: number; suffix: string; label: string; started: boolean;
}) {
  const count = useCounter(value, 1800, started);
  return (
    <Box sx={{ textAlign: 'center', px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="h2" fontWeight={900} color="white"
          sx={{ lineHeight: 1, fontSize: { xs: '2.4rem', md: '3rem' } }}>
          {count}
        </Typography>
        <Typography variant="h4" fontWeight={800} color="rgba(255,255,255,0.9)" sx={{ lineHeight: 1 }}>
          {suffix}
        </Typography>
      </Box>
      <Typography variant="body2" color="rgba(255,255,255,0.65)" fontWeight={500} sx={{ mt: 0.8 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ── FeatureCard ───────────────────────────────────────────────────────────────
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const IconCmp = feature.icon;

  return (
    <motion.div
      custom={index}
      variants={scaleIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ height: '100%' }}
    >
      <Box sx={{
        height: '100%',
        border: '1px solid',
        borderColor: hovered ? 'rgba(33,150,243,0.35)' : 'rgba(33,150,243,0.12)',
        borderRadius: '20px',
        p: 3.5,
        bgcolor: hovered ? 'rgba(33,150,243,0.04)' : 'white',
        cursor: 'default',
        transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 24px 60px rgba(33,150,243,0.15), 0 8px 20px rgba(0,0,0,0.06)'
          : '0 2px 12px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: 0, right: 0,
          width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle, ${feature.accent}18 0%, transparent 70%)`,
          transform: hovered ? 'scale(2)' : 'scale(1)',
          transition: 'transform 0.5s ease',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          width: 56, height: 56, borderRadius: '14px',
          bgcolor: hovered ? `${feature.accent}18` : 'rgba(33,150,243,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 2.5, transition: 'all 0.35s ease',
          border: `1px solid ${feature.accent}20`,
        }}>
          <IconCmp sx={{
            fontSize: 26, color: feature.accent,
            transition: 'all 0.3s ease',
            transform: hovered ? 'scale(1.15)' : 'scale(1)',
          }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="#0D47A1" sx={{ mb: 1, fontSize: '1.05rem' }}>
          {feature.title}
        </Typography>
        <Typography variant="body2" color="#607D8B" sx={{ lineHeight: 1.75, fontSize: '0.88rem' }}>
          {feature.desc}
        </Typography>
      </Box>
    </motion.div>
  );
}

// ── Bouton magnétique ─────────────────────────────────────────────────────────
function MagneticButton({ children, onClick, variant = 'primary', size = 'large' }: {
  children: React.ReactNode; onClick: () => void;
  variant?: 'primary' | 'white'; size?: 'large' | 'medium';
}) {
  const [pos, setPos]       = useState({ x: 0, y: 0 });
  const [hovered, setHov]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3 });
  };

  const isPrimary = variant === 'primary';

  return (
    <Box ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPos({ x: 0, y: 0 }); }}
      sx={{ display: 'inline-block' }}
    >
      <motion.div
        animate={{ x: hovered ? pos.x : 0, y: hovered ? pos.y : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <Button onClick={onClick} size={size}
          endIcon={<ArrowForward sx={{
            fontSize: 18, transition: 'transform 0.3s ease',
            transform: hovered ? 'translateX(4px)' : 'none',
          }} />}
          sx={{
            borderRadius: '14px', textTransform: 'none', fontWeight: 700,
            fontSize: size === 'large' ? 16 : 14,
            px: size === 'large' ? 4.5 : 3, py: size === 'large' ? 1.8 : 1.3,
            background: isPrimary ? 'linear-gradient(135deg, #2196F3, #1565C0)' : 'white',
            color: isPrimary ? 'white' : '#1565C0',
            boxShadow: isPrimary
              ? (hovered ? '0 16px 40px rgba(33,150,243,0.5)' : '0 8px 24px rgba(33,150,243,0.35)')
              : (hovered ? '0 8px 24px rgba(0,0,0,0.15)'      : '0 4px 12px rgba(0,0,0,0.1)'),
            border: isPrimary ? 'none' : '1px solid rgba(33,150,243,0.15)',
            transition: 'box-shadow 0.3s ease, background 0.3s ease',
            '&:hover': {
              background: isPrimary ? 'linear-gradient(135deg, #42A5F5, #1976D2)' : '#EEF4FF',
            },
          }}
        >
          {children}
        </Button>
      </motion.div>
    </Box>
  );
}

// ── Particules flottantes ─────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 10 + (i * 7.5) % 85,
    y: 5  + (i * 11.3) % 85,
    size: 3 + (i % 4) * 2,
    duration: 6 + (i % 5) * 2,
    delay: (i % 6) * -1.5,
  }));

  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div key={p.id}
          style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'rgba(33,150,243,0.25)',
          }}
          animate={{ y: [-12, 12, -12], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </Box>
  );
}

// ── Séparateur animé ──────────────────────────────────────────────────────────
function AnimatedDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: EASE_OUT }}
      style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(33,150,243,0.3), transparent)',
        margin: '0 auto', maxWidth: '80%', transformOrigin: 'center',
      }}
    />
  );
}

// ── Badge pulsant ─────────────────────────────────────────────────────────────
function PulseBadge({ children }: { children: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, position: 'relative' }}>
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4CAF50', position: 'absolute', left: 12,
        }}
      />
      <Chip label={children} sx={{
        bgcolor: 'rgba(33,150,243,0.08)', color: '#1565C0',
        fontWeight: 600, fontSize: '0.8rem', px: 1.5, pl: 3.5,
        border: '1px solid rgba(33,150,243,0.2)', borderRadius: '20px',
        '& .MuiChip-label': { px: 0 },
      }} />
    </Box>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  const { scrollYProgress } = useScroll();
  const heroY       = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });

  return (
    <Box
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY, visible: true })}
      sx={{ bgcolor: '#F8FBFF', minHeight: '100vh', overflow: 'hidden' }}
    >
      {/* Cursor glow */}
      <motion.div
        animate={{ x: cursor.x - 200, y: cursor.y - 200, opacity: cursor.visible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 30, mass: 0.5 }}
        style={{
          position: 'fixed', width: 400, height: 400, borderRadius: '50%',
          pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(circle, rgba(33,150,243,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Navbar ── */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        style={{ position: 'sticky', top: 0, zIndex: 1100 }}
      >
        <AppBar elevation={0} sx={{
          bgcolor: 'rgba(248,251,255,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(33,150,243,0.1)', position: 'static',
        }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 6 }, py: 0.5 }}>
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(33,150,243,0.35)',
                }}>
                  <LocalHospital sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={800} color="#1565C0" letterSpacing="-0.3px">
                  CliniqueStock
                </Typography>
              </Box>
            </motion.div>
            <MagneticButton onClick={() => navigate('/login')} size="medium">
              Se connecter
            </MagneticButton>
          </Toolbar>
        </AppBar>
      </motion.div>

      {/* ── Hero ── */}
      <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #E3F2FD 0%, #F8FBFF 50%, #BBDEFB 100%)',
        }} />
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: 'linear-gradient(rgba(33,150,243,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(33,150,243,0.07) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        }} />

        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(33,150,243,0.1) 0%, transparent 70%)',
            top: -250, right: -150, pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(21,101,192,0.08) 0%, transparent 70%)',
            bottom: -200, left: -100, pointerEvents: 'none',
          }}
        />

        <FloatingParticles />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <Box sx={{ textAlign: 'center', maxWidth: 820, mx: 'auto' }}>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                <PulseBadge>✦ Plateforme de nouvelle génération</PulseBadge>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                <Typography variant="h1" fontWeight={900} color="#0D47A1" sx={{
                  mt: 3, mb: 2.5, lineHeight: 1.1,
                  fontSize: { xs: '2.4rem', sm: '3rem', md: '3.8rem' },
                  letterSpacing: '-1.5px',
                }}>
                  Gérez votre stock médical{' '}
                  <Box component="span" sx={{
                    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 50%, #3F51B5 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', display: 'inline-block',
                  }}>
                    avec intelligence
                  </Box>
                </Typography>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                <Typography variant="h6" color="#546E7A" sx={{
                  mb: 5, lineHeight: 1.85, fontWeight: 400,
                  fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 640, mx: 'auto',
                }}>
                  CliniqueStock centralise vos inventaires pharmaceutiques,
                  automatise vos commandes et garantit la conformité de votre établissement.
                </Typography>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <MagneticButton onClick={() => navigate('/login')}>
                    Accéder à la plateforme
                  </MagneticButton>
                </Box>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 4 }, mt: 5, flexWrap: 'wrap' }}>
                  {['Certifié ISO 27001', 'Conforme RGPD', 'Hébergement HDS'].map((item, i) => (
                    <motion.div key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.15 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <CheckCircle sx={{ color: '#4CAF50', fontSize: 17 }} />
                        <Typography variant="body2" color="#607D8B" fontWeight={500} fontSize="0.85rem">
                          {item}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>

              {/* Mini dashboard flottant */}
              <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8, duration: 1, ease: EASE_OUT }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Box sx={{
                    mt: 8, mx: 'auto', maxWidth: 700,
                    bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
                    borderRadius: '20px', border: '1px solid rgba(33,150,243,0.2)',
                    boxShadow: '0 30px 80px rgba(33,150,243,0.15), 0 8px 20px rgba(0,0,0,0.06)',
                    p: 3,
                  }}>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                      {[
                        { label: 'Stock total', val: '1 248', color: '#2196F3' },
                        { label: 'Alertes',     val: '5',     color: '#FF9800' },
                        { label: 'Commandes',   val: '12',    color: '#4CAF50' },
                      ].map(({ label, val, color }) => (
                        <Box key={label} sx={{
                          flex: 1, bgcolor: `${color}10`, border: `1px solid ${color}30`,
                          borderRadius: '10px', p: 1.5, textAlign: 'center',
                        }}>
                          <Typography fontSize={18} fontWeight={900} color={color}>{val}</Typography>
                          <Typography fontSize={10} color="#90A4AE" fontWeight={500}>{label}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-end', height: 48 }}>
                      {[65, 40, 75, 55, 85, 45, 70].map((h, i) => (
                        <motion.div key={i}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 1.2 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                          style={{ transformOrigin: 'bottom', flex: 1 }}
                        >
                          <Box sx={{
                            height: h * 0.5, borderRadius: '4px 4px 0 0',
                            background: `linear-gradient(180deg, #2196F3, #1565C0)`,
                            opacity: 0.6 + h * 0.004,
                          }} />
                        </motion.div>
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              </motion.div>

            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ── Stats ── */}
      <Box ref={statsRef} sx={{ bgcolor: '#1565C0', py: { xs: 6, md: 7 }, position: 'relative', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: [0, 60, 0], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: -80, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
            {stats.map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true }}>
                <StatCard {...stat} started={statsInView} />
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      <AnimatedDivider />

      {/* ── Features ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 14 } }}>
        <Box sx={{ textAlign: 'center', mb: 9 }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
            <Box sx={{
              display: 'inline-block', bgcolor: 'rgba(33,150,243,0.08)',
              border: '1px solid rgba(33,150,243,0.2)',
              borderRadius: '20px', px: 2.5, py: 0.7, mb: 3,
            }}>
              <Typography variant="body2" color="#1565C0" fontWeight={600}
                fontSize="0.8rem" letterSpacing="1px" textTransform="uppercase">
                Fonctionnalités
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} color="#0D47A1"
              sx={{ mb: 2, letterSpacing: '-0.8px', fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
              Tout ce dont votre clinique{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                a besoin
              </Box>
            </Typography>
            <Typography variant="body1" color="#546E7A"
              sx={{ maxWidth: 520, mx: 'auto', lineHeight: 1.8, fontSize: '0.95rem' }}>
              Une solution complète conçue spécifiquement pour les établissements de santé africains.
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </Box>
      </Container>

      <AnimatedDivider />

      {/* ── CTA final ── */}
      <Box sx={{ py: { xs: 10, md: 14 }, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1565C0 0%, #2196F3 60%, #0D47A1 100%)',
        }} />
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: -100, right: -100,
            width: 400, height: 400, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 0] }}
          transition={{ duration: 12, delay: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: -80, left: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Typography variant="h3" fontWeight={900} color="white"
              sx={{ mb: 2, letterSpacing: '-0.8px', fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
              Prêt à transformer votre gestion ?
            </Typography>
            <Typography variant="h6" color="rgba(255,255,255,0.75)"
              sx={{ mb: 6, fontWeight: 400, maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              Rejoignez les 500+ établissements qui font confiance à CliniqueStock.
            </Typography>
            <MagneticButton onClick={() => navigate('/login')} variant="white">
              Accéder à la plateforme
            </MagneticButton>
          </motion.div>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ bgcolor: '#0D47A1', py: 2.5, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="body2" color="rgba(255,255,255,0.4)" fontSize="0.8rem">
          © 2026 CliniqueStock — Tous droits réservés
        </Typography>
      </Box>
    </Box>
  );
}