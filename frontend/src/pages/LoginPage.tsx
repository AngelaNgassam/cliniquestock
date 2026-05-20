import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Shield, Check, Pill } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { PublicClientApplication } from '@azure/msal-browser';

const GOOGLE_CLIENT_ID    = import.meta.env.VITE_GOOGLE_CLIENT_ID    as string;
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string;
const API_URL             = import.meta.env.VITE_API_URL              as string;

const msalInstance = new PublicClientApplication({
  auth: {
    clientId:    MICROSOFT_CLIENT_ID || 'placeholder',
    authority:   'https://login.microsoftonline.com/common',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: { cacheLocation: 'sessionStorage' },
});

function GoogleIcon() {
  return (
    <svg style={{ width: 17, height: 17, flexShrink: 0 }} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 21 21">
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  );
}

function Logo() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <div style={{ position: 'relative', width: 34, height: 34 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'linear-gradient(135deg,#38bdf8,#6366f1)', opacity: 0.35, filter: 'blur(5px)' }} />
        <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(14,165,233,0.35)' }}>
          <Pill size={16} color="#fff" strokeWidth={2.5} />
        </div>
      </div>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: '#0f172a' }}>
        Clinique<span style={{ background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stock</span>
      </span>
    </div>
  );
}

function LoginForm() {
  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error,         setError]         = useState('');
  const [remember,      setRemember]      = useState(false);
  const [focusedField,  setFocusedField]  = useState<string | null>(null);

  useEffect(() => {
    if (MICROSOFT_CLIENT_ID) msalInstance.initialize().catch(() => {});
  }, []);

  /* ── Connexion classique ─────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authService.login(email, password);
      const me  = await authService.getMe();
      setAuth(me, res.access, res.role);
      navigate(res.role === 'ADMINISTRATEUR' ? '/admin/inventaire' : '/pharmacien/inventaire');
    } catch {
      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    } finally { setLoading(false); }
  };

  /* ── Callback commun token social ───────────────────────────────────────── */
  const handleSocialToken = async (provider: 'google' | 'microsoft', access_token: string) => {
    setSocialLoading(provider); setError('');
    try {
      const res  = await fetch(`${API_URL}/auth/social/${provider}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion sociale');
      localStorage.setItem('access_token',  data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('role',          data.role);
      const meRes = await fetch(`${API_URL}/auth/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const me = await meRes.json();
      setAuth(me, data.access, data.role);
      navigate(data.role === 'ADMINISTRATEUR' ? '/admin/inventaire' : '/pharmacien/inventaire');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion sociale.');
    } finally { setSocialLoading(null); }
  };

  /* ── Google ──────────────────────────────────────────────────────────────── */
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => handleSocialToken('google', tokenResponse.access_token),
    onError:   () => setError('Connexion Google annulée ou échouée.'),
  });

  /* ── Microsoft ───────────────────────────────────────────────────────────── */
  const handleMicrosoftLogin = async () => {
    if (!MICROSOFT_CLIENT_ID) { setError('Connexion Microsoft non configurée.'); return; }
    setSocialLoading('microsoft'); setError('');
    try {
      await msalInstance.initialize();
      const result = await msalInstance.loginPopup({
        scopes: ['openid', 'email', 'profile', 'User.Read'],
        prompt: 'select_account',
      });
      if (result.accessToken) await handleSocialToken('microsoft', result.accessToken);
    } catch (err: any) {
      if (!err.message?.includes('user_cancelled')) setError('Connexion Microsoft annulée ou échouée.');
      setSocialLoading(null);
    }
  };

  const inputBase = (focused: boolean, pr = false): React.CSSProperties => ({
    width: '100%', height: 42, borderRadius: 10,
    border: focused ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0',
    background: focused ? '#fff' : '#f8fafc',
    paddingLeft: 38, paddingRight: pr ? 40 : 12,
    fontSize: 13, color: '#0f172a', outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none',
    transition: 'all 0.18s',
  });

  const busy = loading || socialLoading !== null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; width:100%; overflow:hidden; font-family:'Segoe UI',system-ui,sans-serif; }
        #root { max-width:100% !important; border:none !important; text-align:left !important; display:block !important; }
        .cs-page { height:100vh; width:100vw; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#dbeafe 0%,#f0f9ff 45%,#e0e7ff 100%); position:relative; overflow:hidden; }
        .cs-blob1 { position:absolute; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle,rgba(14,165,233,0.16) 0%,transparent 70%); top:-120px; left:-140px; pointer-events:none; }
        .cs-blob2 { position:absolute; width:360px; height:360px; border-radius:50%; background:radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%); bottom:-80px; right:-80px; pointer-events:none; }
        .cs-back { position:fixed; top:18px; left:18px; z-index:10; display:inline-flex; align-items:center; gap:5px; background:none; border:none; cursor:pointer; color:#64748b; font-size:13px; font-weight:500; padding:6px 10px; border-radius:8px; transition:background 0.2s,color 0.2s; font-family:'Segoe UI',system-ui,sans-serif; }
        .cs-back:hover { background:rgba(0,0,0,0.05); color:#0f172a; }
        .cs-card { position:relative; z-index:1; width:min(480px,calc(100vw - 48px)); background:rgba(255,255,255,0.93); backdrop-filter:blur(20px); border-radius:24px; padding:32px 40px 28px; box-shadow:0 20px 60px rgba(14,165,233,0.11),0 4px 20px rgba(0,0,0,0.06); border:1px solid rgba(255,255,255,0.95); animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .cs-social { transition:border-color 0.2s,background 0.2s,box-shadow 0.2s !important; }
        .cs-social:hover:not(:disabled) { background:#f8fafc !important; border-color:#cbd5e1 !important; box-shadow:0 2px 8px rgba(0,0,0,0.06) !important; }
        .cs-social:disabled { opacity:0.6; cursor:not-allowed !important; }
        .cs-submit:hover:not(:disabled) { box-shadow:0 8px 28px rgba(14,165,233,0.38) !important; }
        .cs-forgot:hover { opacity:0.75; }
        input::placeholder { color:#c0ccd9; }
      `}</style>

      <div className="cs-page">
        <div className="cs-blob1" /><div className="cs-blob2" />
        <button className="cs-back" onClick={() => navigate('/')}><ArrowLeft size={14} /> Retour</button>

        <div className="cs-card">
          <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}><Logo /></div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#0f172a', textAlign:'center', marginBottom:4 }}>Bon retour</h1>
          <p style={{ fontSize:13, color:'#64748b', textAlign:'center', marginBottom:22 }}>
            Connectez-vous pour accéder à votre inventaire clinique.
          </p>

          {/* Erreur */}
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#dc2626' }}>
              <svg style={{ width:14, height:14, flexShrink:0 }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5 }} htmlFor="email">
              Adresse Email
            </label>
            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}>
                <Mail size={14} />
              </span>
              <input id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="nom@clinique.fr"
                style={inputBase(focusedField === 'email')}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* Mot de passe */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151' }} htmlFor="password">Mot de passe</label>
              {/* ── Lien mot de passe oublié ── */}
              <span
                className="cs-forgot"
                onClick={() => navigate('/forgot-password')}
                style={{ fontSize:12, fontWeight:600, color:'#0ea5e9', cursor:'pointer', transition:'opacity 0.2s' }}
              >
                Mot de passe oublié ?
              </span>
            </div>
            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}>
                <Lock size={14} />
              </span>
              <input id="password" type={showPwd ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={inputBase(focusedField === 'password', true)}
                onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:3, display:'flex', alignItems:'center' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Se souvenir */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'inline-flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:'#64748b' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ accentColor:'#0ea5e9', width:14, height:14 }} />
                Se souvenir de moi sur cet appareil
              </label>
            </div>

            {/* Bouton connexion */}
            <button type="submit" disabled={busy} className="cs-submit"
              style={{ width:'100%', height:42, borderRadius:11, border:'none', cursor:busy ? 'not-allowed' : 'pointer', background:'linear-gradient(90deg,#0ea5e9,#6366f1)', color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 18px rgba(14,165,233,0.28)', opacity:busy ? 0.65 : 1, transition:'opacity 0.2s,box-shadow 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {loading
                ? <><svg style={{ width:15, height:15, animation:'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/><path fill="rgba(255,255,255,0.9)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Connexion…</>
                : 'Se connecter'
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>OU CONTINUER AVEC</span>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
          </div>

          {/* Boutons sociaux */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <button type="button" className="cs-social" disabled={busy} onClick={() => handleGoogleLogin()}
              style={{ height:40, borderRadius:10, border:'1.5px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151' }}>
              {socialLoading === 'google'
                ? <svg style={{ width:15, height:15, animation:'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="4"/><path fill="#0ea5e9" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <><GoogleIcon /> Google</>
              }
            </button>
            <button type="button" className="cs-social" disabled={busy} onClick={handleMicrosoftLogin}
              style={{ height:40, borderRadius:10, border:'1.5px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151' }}>
              {socialLoading === 'microsoft'
                ? <svg style={{ width:15, height:15, animation:'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="4"/><path fill="#0ea5e9" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <><MicrosoftIcon /> Microsoft</>
              }
            </button>
          </div>

          {/* Contact admin */}
          <p style={{ textAlign:'center', fontSize:12, color:'#64748b', marginBottom:16 }}>
            Pas encore de compte ?{' '}
            <a href="#" style={{ color:'#0ea5e9', fontWeight:600, textDecoration:'none' }}>Contactez votre administrateur</a>
          </p>

          {/* Badges sécurité */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, paddingTop:14, borderTop:'1px solid #f1f5f9' }}>
            {[{ icon: Shield, label:'Chiffrement AES-256' }, { icon: Check, label:'Conforme RGPD' }].map(({ icon: Icon, label }) => (
              <span key={label} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#94a3b8' }}>
                <Icon size={11} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}