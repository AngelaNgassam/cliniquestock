import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight, Package, BarChart3, ShieldCheck, Zap,
  Bell, FileText, ChevronRight, Star, Play, Check,
  TrendingUp, Clock, Users, Award, Pill, Menu, X,
} from 'lucide-react';

import heroIllustration from '../assets/hero-illustration.png';
import testimonial1 from '../assets/testimonial-1.jpg';
import testimonial2 from '../assets/testimonial-2.jpg';
import testimonial3 from '../assets/testimonial-3.jpg';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Feature { icon: React.ElementType; title: string; desc: string; accent: string; }
interface StatItem { value: string; label: string; icon: React.ElementType; }
interface Testimonial { name: string; role: string; clinic: string; quote: string; avatar: string; rating: number; }

/* ── Data ──────────────────────────────────────────────────────────────── */
const features: Feature[] = [
  { icon: Package,     title: 'Gestion des stocks',    desc: "Suivi en temps réel avec alertes automatiques de rupture et de péremption pour chaque médicament.",            accent: '#0EA5E9' },
  { icon: BarChart3,   title: 'Analytique avancée',    desc: "Tableaux de bord interactifs pour visualiser consommations, tendances et prévisions de réapprovisionnement.",  accent: '#6366F1' },
  { icon: ShieldCheck, title: 'Sécurité & Audit',      desc: "Journal d'audit complet, contrôle d'accès par rôle et traçabilité totale de chaque mouvement de stock.",      accent: '#10B981' },
  { icon: Zap,         title: 'Performance optimale',  desc: "Interface ultra-rapide et intuitive, accessible depuis n'importe quel appareil, même en faible connectivité.", accent: '#F59E0B' },
  { icon: Bell,        title: 'Alertes intelligentes', desc: "Notifications automatiques pour stocks critiques, péremptions imminentes et anomalies de consommation.",       accent: '#EC4899' },
  { icon: FileText,    title: 'Rapports détaillés',    desc: "Génération automatique de rapports de consommation, d'inventaire et de valorisation en un clic.",              accent: '#8B5CF6' },
];

const stats: StatItem[] = [
  { value: '500+',  label: 'Cliniques partenaires',  icon: Users      },
  { value: '99.9%', label: 'Disponibilité garantie', icon: TrendingUp },
  { value: '<2s',   label: 'Temps de réponse',       icon: Clock      },
  { value: '24/7',  label: 'Support technique',      icon: Award      },
];

const testimonials: Testimonial[] = [
  { name: 'Dr. Amina Nkomo',      role: 'Directrice médicale', clinic: 'Clinique Sainte-Marie, Yaoundé', quote: "CliniqueStock a transformé notre gestion pharmaceutique. Les ruptures de stock ont chuté de 80% et nos équipes gagnent 3h par jour.", avatar: testimonial1, rating: 5 },
  { name: 'Jean-Baptiste Mvondo', role: 'Pharmacien chef',     clinic: 'Hôpital Central de Douala',      quote: "L'interface est d'une clarté remarquable. Les alertes automatiques nous ont évité plusieurs crises de stock.", avatar: testimonial2, rating: 5 },
  { name: 'Dr. Célestine Biya',   role: 'Administratrice',     clinic: 'Polyclinique du Littoral',       quote: "Enfin une solution pensée pour les réalités africaines. Le support est réactif, la plateforme fiable même avec une connexion limitée.", avatar: testimonial3, rating: 5 },
];

const benefits = [
  'Réduction des ruptures de stock de 85%',
  'Traçabilité complète de chaque médicament',
  'Conformité réglementaire automatisée',
  'Rapports prêts en quelques secondes',
  'Accès multi-sites centralisé',
  'Intégration avec vos systèmes existants',
];

/* ── Shared styles helpers ────────────────────────────────────────────── */
const FONT = "'Segoe UI', system-ui, sans-serif";
const GRAD = 'linear-gradient(90deg,#0ea5e9,#6366f1)';

/* ── Logo ─────────────────────────────────────────────────────────────── */
function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: GRAD, opacity: 0.35, filter: 'blur(5px)' }} />
        <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(14,165,233,0.3)' }}>
          <Pill size={16} color="#fff" strokeWidth={2.5} />
        </div>
      </div>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: dark ? '#fff' : '#0f172a' }}>
        Clinique
        <span style={dark ? { color: '#7dd3fc' } : { background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stock</span>
      </span>
    </div>
  );
}

/* ── Navbar ───────────────────────────────────────────────────────────── */
function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    { label: 'Fonctionnalités', href: '#features'     },
    { label: 'Avantages',       href: '#benefits'     },
    { label: 'Témoignages',     href: '#testimonials' },
  ];
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 16px', fontFamily: FONT }}>
      <nav style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(16px)', borderRadius: 16,
        padding: '10px 20px',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.08)' : '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'all 0.3s',
      }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(l => (
            <a key={l.href} href={l.href} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#374151', padding: '8px 14px', borderRadius: 8, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            Se connecter
          </button>
          <button onClick={() => navigate('/login')} style={{ background: GRAD, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 3px 12px rgba(14,165,233,0.3)', transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Commencer <ArrowRight size={15} />
          </button>
          <button onClick={() => setOpen(v => !v)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#374151' }} className="cs-menu-btn">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
    </header>
  );
}

/* ── Feature Card ─────────────────────────────────────────────────────── */
function FeatureCard({ f }: { f: Feature }) {
  const [hovered, setHovered] = useState(false);
  const Icon = f.icon;
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#fff' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${hovered ? '#e2e8f0' : '#f1f5f9'}`,
        borderRadius: 16, padding: 24,
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.accent}18`, border: `1px solid ${f.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={20} color={f.accent} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>{f.title}</h3>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
    </div>
  );
}

/* ── Testimonial Card ─────────────────────────────────────────────────── */
function TestiCard({ t }: { t: Testimonial }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #f1f5f9', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={15} fill="#fbbf24" color="#fbbf24" />)}
      </div>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, fontStyle: 'italic', margin: 0, flex: 1 }}>"{t.quote}"</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={t.avatar} alt={t.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t.name}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{t.role} · {t.clinic}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Mini dashboard ───────────────────────────────────────────────────── */
function DashboardPreview() {
  const bars   = [55, 72, 48, 88, 63, 79, 91, 58, 84, 69, 77, 95];
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  return (
    <div style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f1f5f9', padding: '10px 16px' }}>
        {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '3px 12px', fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
          app.cliniquestock.cm/inventaire
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Stock total', val: '1 248', delta: '+12', color: '#0EA5E9' },
            { label: 'Alertes',     val: '5',     delta: '-3',  color: '#F59E0B' },
            { label: 'Commandes',   val: '12',    delta: '+4',  color: '#10B981' },
          ].map(({ label, val, delta, color }) => (
            <div key={label} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 4px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{val}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{delta}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Mouvements — 12 derniers mois</span>
            <span style={{ fontSize: 10, color: '#0ea5e9', background: 'rgba(14,165,233,0.1)', padding: '2px 8px', borderRadius: 20 }}>2026</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: 'linear-gradient(180deg,#0ea5e9,#6366f1)', opacity: 0.45 + h * 0.006 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {months.map(m => <span key={m} style={{ fontSize: 8, color: '#94a3b8' }}>{m}</span>)}
          </div>
        </div>
        {/* Rows */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { name: 'Paracétamol 500mg',  status: 'Stock critique',      dot: '#ef4444' },
            { name: 'Amoxicilline 250mg',  status: 'Expire dans 14j',     dot: '#f59e0b' },
            { name: 'Métronidazole',        status: 'Réapprovisionnement', dot: '#10b981' },
          ].map(row => (
            <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.dot }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: 'Produit',    links: ['Fonctionnalités', 'Tarifs', 'Sécurité', 'Mises à jour'] },
    { title: 'Entreprise', links: ['À propos', 'Blog', 'Carrières', 'Contact']              },
    { title: 'Ressources', links: ['Documentation', 'Guides', 'Support', 'API']             },
    { title: 'Légal',      links: ['Confidentialité', 'Conditions', 'Cookies', 'RGPD']      },
  ];
  return (
    <footer style={{ borderTop: '1px solid #f1f5f9', background: 'rgba(248,250,252,0.6)', fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
          <div>
            <Logo />
            <p style={{ marginTop: 14, fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 240 }}>
              La plateforme de référence pour la gestion pharmaceutique des cliniques au Cameroun.
            </p>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>{c.title}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.links.map(l => (
                  <li key={l}><a href="#" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#0f172a')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} CliniqueStock. Tous droits réservés.</p>
          <p style={{ margin: 0 }}>Fabriqué avec soin à Douala, Cameroun 🇨🇲</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Section wrapper helper ───────────────────────────────────────────── */
function SectionBadge({ color = '#0ea5e9', label }: { color?: string; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 16 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: FONT, color: '#0f172a', background: '#fff', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        #root { width: 100% !important; max-width: 100% !important; border: none !important; text-align: left !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .cs-hero-content { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .cs-hero-visual  { animation: fadeUp 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        .cs-float        { animation: float 6s ease-in-out infinite; }
        @media (max-width: 768px) {
          .cs-menu-btn { display: flex !important; }
          .cs-nav-links { display: none !important; }
          .cs-hero-grid { flex-direction: column !important; }
          .cs-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .cs-feat-grid { grid-template-columns: 1fr !important; }
          .cs-test-grid { grid-template-columns: 1fr !important; }
          .cs-stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <Navbar />

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 100, paddingBottom: 60, background: 'linear-gradient(160deg,#f0f9ff 0%,#fff 55%,#f0f4ff 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* BG decoration */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(14,165,233,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', width: '100%', display: 'flex', alignItems: 'center', gap: 60 }} className="cs-hero-grid">
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }} className="cs-hero-content">
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: '#0284c7', marginBottom: 28 }}>
              <span style={{ position: 'relative', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10b981', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
                <span style={{ position: 'relative', display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              </span>
              Nouveau · Tableau de bord IA pour la pharmacie
              <ChevronRight size={13} style={{ opacity: 0.6 }} />
            </div>

            <h1 style={{ fontSize: 'clamp(36px,5vw,62px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', color: '#0f172a', margin: '0 0 20px' }}>
              Optimisez la gestion<br />
              de vos{' '}
              <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', position: 'relative' }}>
                stocks médicaux
                <span style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 3, background: GRAD, borderRadius: 2 }} />
              </span>
            </h1>

            <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.65, margin: '0 0 36px', maxWidth: 500 }}>
              CliniqueStock aide les cliniques à suivre leurs médicaments en temps réel, anticiper les ruptures et garantir la traçabilité pour une qualité de soins irréprochable.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <button onClick={() => navigate('/login')} style={{ background: GRAD, border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 24px rgba(14,165,233,0.35)', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Commencer maintenant <ArrowRight size={16} />
              </button>
              <button style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#374151', fontWeight: 600, fontSize: 15, padding: '12px 24px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                <Play size={15} fill="currentColor" style={{ opacity: 0.7 }} /> Voir la démonstration
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {['Certifié ISO 27001', 'Conforme RGPD', 'Hébergement HDS', 'Chiffrement bancaire'].map(b => (
                <div key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                  <Check size={13} color="#10b981" /> {b}
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div style={{ flex: '0 0 460px', maxWidth: '100%', position: 'relative' }} className="cs-hero-visual">
            <div style={{ position: 'absolute', inset: -16, borderRadius: 24, background: 'radial-gradient(ellipse,rgba(14,165,233,0.1) 0%,rgba(99,102,241,0.08) 60%,transparent 80%)', filter: 'blur(12px)', pointerEvents: 'none' }} />
            <div className="cs-float"><DashboardPreview /></div>

            {/* Floating badge left */}
            <div style={{ position: 'absolute', left: -28, top: '25%', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} color="#10b981" />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Stock optimisé</p>
                <p style={{ fontSize: 11, color: '#10b981', margin: 0 }}>↑ 24% ce mois</p>
              </div>
            </div>

            {/* Floating badge right */}
            <div style={{ position: 'absolute', right: -28, top: '38%', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={15} color="#ef4444" />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>5 alertes</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>à traiter</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex' }}>
            {[testimonial1, testimonial2, testimonial3].map((src, i) => (
              <img key={i} src={src} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', marginLeft: i > 0 ? -10 : 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <strong style={{ color: '#0f172a' }}>500+</strong> cliniques font confiance à CliniqueStock
          </p>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', background: 'rgba(248,250,252,0.6)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32, textAlign: 'center' }} className="cs-stats-grid">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color="#0ea5e9" />
                </div>
                <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', color: '#0f172a', margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionBadge label="Fonctionnalités" />
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 16px' }}>
              Tout ce dont votre clinique{' '}
              <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>a besoin</span>
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
              Une solution complète conçue spécifiquement pour les établissements de santé africains.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="cs-feat-grid">
            {features.map(f => <FeatureCard key={f.title} f={f} />)}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ───────────────────────────────────────────────── */}
      <section id="benefits" style={{ padding: '80px 24px', background: 'linear-gradient(160deg,#f0f9ff 0%,#fff 60%,#f0f4ff 100%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64 }} className="cs-hero-grid">
          {/* Visual */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -16, borderRadius: 24, background: 'radial-gradient(ellipse,rgba(14,165,233,0.08) 0%,transparent 70%)', filter: 'blur(10px)' }} />
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 24px 64px rgba(0,0,0,0.1)', background: 'linear-gradient(135deg,#f0f9ff,#f0f4ff)' }}>
              <img src={heroIllustration} alt="CliniqueStock dashboard" style={{ width: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
          {/* Text */}
          <div style={{ flex: 1 }}>
            <SectionBadge label="Avantages concrets" />
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 16px' }}>
              Résultats mesurables{' '}
              <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>dès le premier mois</span>
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.65, margin: '0 0 28px' }}>
              Nos clients constatent une amélioration significative dès les premières semaines d'utilisation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
              {benefits.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(14,165,233,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="#0ea5e9" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{b}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/login')} style={{ background: GRAD, border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 24px rgba(14,165,233,0.3)', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Accéder à la plateforme <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionBadge color="#f59e0b" label="Témoignages" />
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 16px' }}>
              La confiance de{' '}
              <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>500+ cliniques</span>
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
              Découvrez ce que nos clients disent de leur expérience avec CliniqueStock.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="cs-test-grid">
            {testimonials.map(t => <TestiCard key={t.name} t={t} />)}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0284c7,#0ea5e9,#6366f1)' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.8px', color: '#fff', margin: '0 0 16px' }}>
            Prêt à transformer votre gestion ?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', margin: '0 0 40px', lineHeight: 1.6 }}>
            Rejoignez les 500+ établissements qui font confiance à CliniqueStock.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{ background: '#fff', border: 'none', color: '#0284c7', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
              Commencer gratuitement <ArrowRight size={16} />
            </button>
            <button style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 15, padding: '12px 24px', borderRadius: 12, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
              Contacter l'équipe
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '24px 0 0' }}>
            Aucune carte de crédit requise · Déployé en 24h · Support inclus
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}