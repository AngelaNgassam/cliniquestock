import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Pill } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL as string;

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

/* ── Indicateur de force du mot de passe ──────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8 caractères minimum', ok: password.length >= 8 },
    { label: 'Une majuscule',         ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre',            ok: /\d/.test(password) },
    { label: 'Un caractère spécial',  ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];
  const labels = ['', 'Très faible', 'Faible', 'Correct', 'Fort'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 10, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= score ? colors[score] : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: colors[score], fontWeight: 600, marginBottom: 8 }}>{labels[score]}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {checks.map(c => (
          <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.ok ? '#10b981' : '#94a3b8' }}>
            {c.ok ? <CheckCircle size={11} /> : <XCircle size={11} />} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();

  const uid   = params.get('uid')   || '';
  const token = params.get('token') || '';

  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPwd,    setConfirmPwd]    = useState('');
  const [showNew,       setShowNew]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [validating,    setValidating]    = useState(true);
  const [linkValid,     setLinkValid]     = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState(false);
  const [focusNew,      setFocusNew]      = useState(false);
  const [focusConfirm,  setFocusConfirm]  = useState(false);

  /* ── Valider le lien au chargement ───────────────────────────────────────── */
  useEffect(() => {
    if (!uid || !token) { setValidating(false); setLinkValid(false); return; }
    const validate = async () => {
      try {
        const res  = await fetch(`${API_URL}/auth/password-reset/validate-link/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, token }),
        });
        setLinkValid(res.ok);
      } catch { setLinkValid(false); }
      finally  { setValidating(false); }
    };
    validate();
  }, [uid, token]);

  /* ── Soumettre le nouveau mot de passe ───────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 8)     { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inputStyle = (focused: boolean, pr = false): React.CSSProperties => ({
    width: '100%', height: 42, borderRadius: 10,
    border: focused ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0',
    background: focused ? '#fff' : '#f8fafc',
    paddingLeft: 38, paddingRight: pr ? 42 : 12,
    fontSize: 13, color: '#0f172a', outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none',
    transition: 'all 0.18s',
  });

  const pageStyle: React.CSSProperties = {
    height: '100vh', width: '100vw', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'linear-gradient(135deg,#dbeafe 0%,#f0f9ff 45%,#e0e7ff 100%)',
    position: 'relative', overflow: 'hidden', fontFamily: "'Segoe UI',system-ui,sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative', zIndex: 1,
    width: 'min(460px,calc(100vw - 48px))',
    background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(20px)',
    borderRadius: 24, padding: '36px 40px 32px',
    boxShadow: '0 20px 60px rgba(14,165,233,0.11),0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid rgba(255,255,255,0.95)',
    animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; width:100%; overflow:hidden; font-family:'Segoe UI',system-ui,sans-serif; }
        #root { max-width:100% !important; border:none !important; text-align:left !important; display:block !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .cs-btn:hover:not(:disabled) { box-shadow:0 8px 28px rgba(14,165,233,0.38) !important; }
        input::placeholder { color:#c0ccd9; }
      `}</style>

      <div style={pageStyle}>
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(14,165,233,0.16) 0%,transparent 70%)', top: -120, left: -140, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%)', bottom: -80, right: -80, pointerEvents: 'none' }} />

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Logo /></div>

          {/* ── Chargement validation lien ─────────────────────────────────── */}
          {validating && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <svg style={{ width: 32, height: 32, animation: 'spin 0.8s linear infinite', color: '#0ea5e9' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="4"/>
                <path fill="#0ea5e9" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Validation du lien…</p>
            </div>
          )}

          {/* ── Lien invalide ──────────────────────────────────────────────── */}
          {!validating && !linkValid && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <XCircle size={28} color="#ef4444" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Lien invalide ou expiré</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.55 }}>
                Ce lien de réinitialisation n'est plus valide.<br />Faites une nouvelle demande.
              </p>
              <button className="cs-btn" onClick={() => navigate('/forgot-password')}
                style={{ width: '100%', height: 42, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 18px rgba(14,165,233,0.28)', transition: 'box-shadow 0.2s' }}>
                Nouvelle demande
              </button>
            </div>
          )}

          {/* ── Succès ─────────────────────────────────────────────────────── */}
          {!validating && linkValid && success && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} color="#10b981" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Mot de passe modifié !</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.55 }}>
                Votre mot de passe a été mis à jour.<br />Vous pouvez maintenant vous connecter.
              </p>
              <button className="cs-btn" onClick={() => navigate('/login')}
                style={{ width: '100%', height: 42, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 18px rgba(14,165,233,0.28)', transition: 'box-shadow 0.2s' }}>
                Se connecter →
              </button>
            </div>
          )}

          {/* ── Formulaire nouveau mot de passe ───────────────────────────── */}
          {!validating && linkValid && !success && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Lock size={22} color="#0ea5e9" />
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Nouveau mot de passe</h1>
                <p style={{ fontSize: 13, color: '#64748b' }}>Choisissez un mot de passe sécurisé.</p>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#dc2626' }}>
                  <span>⚠</span>{error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Nouveau mot de passe */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  Nouveau mot de passe
                </label>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}><Lock size={14} /></span>
                  <input type={showNew ? 'text' : 'password'} required value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={inputStyle(focusNew, true)}
                    onFocus={() => setFocusNew(true)} onBlur={() => setFocusNew(false)} />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 3, display: 'flex', alignItems: 'center' }}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <PasswordStrength password={newPassword} />

                {/* Confirmation */}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, marginTop: 14 }}>
                  Confirmer le mot de passe
                </label>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}><Lock size={14} /></span>
                  <input type={showConfirm ? 'text' : 'password'} required value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle(focusConfirm, true), borderColor: confirmPwd && confirmPwd !== newPassword ? '#ef4444' : focusConfirm ? '#0ea5e9' : '#e2e8f0' }}
                    onFocus={() => setFocusConfirm(true)} onBlur={() => setFocusConfirm(false)} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 3, display: 'flex', alignItems: 'center' }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPwd && confirmPwd !== newPassword && (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: -14, marginBottom: 14 }}>Les mots de passe ne correspondent pas.</p>
                )}

                <button type="submit" disabled={loading || newPassword.length < 8 || newPassword !== confirmPwd}
                  className="cs-btn"
                  style={{ width: '100%', height: 42, borderRadius: 11, border: 'none', cursor: (loading || newPassword.length < 8 || newPassword !== confirmPwd) ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 18px rgba(14,165,233,0.28)', opacity: (loading || newPassword.length < 8 || newPassword !== confirmPwd) ? 0.65 : 1, transition: 'opacity 0.2s,box-shadow 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {loading
                    ? <><svg style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/><path fill="rgba(255,255,255,0.9)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Modification…</>
                    : 'Enregistrer le mot de passe'
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}