import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Pill, RefreshCw, CheckCircle } from 'lucide-react';

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

type Step = 'email' | 'otp' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState<Step>('email');
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState(['', '', '', '', '', '']);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [countdown,   setCountdown]   = useState(0);
  const [resetData,   setResetData]   = useState<{ uid: string; token: string } | null>(null);
  const [focusEmail,  setFocusEmail]  = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Compte à rebours renvoi OTP ─────────────────────────────────────────── */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  /* ── Étape 1 : envoyer l'email ───────────────────────────────────────────── */
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* ── Renvoi OTP ──────────────────────────────────────────────────────────── */
  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      otpRefs.current[0]?.focus();
    } catch { setError('Erreur lors du renvoi.'); }
    finally  { setLoading(false); }
  };

  /* ── Saisie OTP ──────────────────────────────────────────────────────────── */
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next    = [...otp];
    next[index]   = cleaned;
    setOtp(next);
    if (cleaned && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  /* ── Étape 2 : vérifier OTP ──────────────────────────────────────────────── */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Entrez les 6 chiffres du code.'); return; }
    setLoading(true); setError('');
    try {
      // Incrémenter tentatives
      await fetch(`${API_URL}/auth/password-reset/otp-attempt/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const res  = await fetch(`${API_URL}/auth/password-reset/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide.');
      setResetData({ uid: data.uid, token: data.token });
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* ── Styles partagés ─────────────────────────────────────────────────────── */
  const S = {
    page:    { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#dbeafe 0%,#f0f9ff 45%,#e0e7ff 100%)', position: 'relative' as const, overflow: 'hidden', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    blob1:   { position: 'absolute' as const, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(14,165,233,0.16) 0%,transparent 70%)', top: -120, left: -140, pointerEvents: 'none' as const },
    blob2:   { position: 'absolute' as const, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%)', bottom: -80, right: -80, pointerEvents: 'none' as const },
    card:    { position: 'relative' as const, zIndex: 1, width: 'min(460px,calc(100vw - 48px))', background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: '36px 40px 32px', boxShadow: '0 20px 60px rgba(14,165,233,0.11),0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.95)', animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' },
    back:    { position: 'fixed' as const, top: 18, left: 18, zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 500, padding: '6px 10px', borderRadius: 8, transition: 'background 0.2s,color 0.2s', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    btn:     (disabled: boolean): React.CSSProperties => ({ width: '100%', height: 42, borderRadius: 11, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 18px rgba(14,165,233,0.28)', opacity: disabled ? 0.65 : 1, transition: 'opacity 0.2s,box-shadow 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }),
    error:   { display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#dc2626' },
    label:   { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; width:100%; overflow:hidden; font-family:'Segoe UI',system-ui,sans-serif; }
        #root { max-width:100% !important; border:none !important; text-align:left !important; display:block !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .cs-back:hover  { background:rgba(0,0,0,0.05) !important; color:#0f172a !important; }
        .cs-btn:hover:not(:disabled) { box-shadow:0 8px 28px rgba(14,165,233,0.38) !important; }
        .cs-otp-input:focus { border-color:#0ea5e9 !important; box-shadow:0 0 0 3px rgba(14,165,233,0.12) !important; background:#fff !important; }
        input::placeholder { color:#c0ccd9; }
      `}</style>

      <div style={S.page}>
        <div style={S.blob1} /><div style={S.blob2} />
        <button className="cs-back" style={S.back} onClick={() => navigate('/login')}>
          <ArrowLeft size={14} /> Retour
        </button>

        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Logo /></div>

          {/* ── ÉTAPE EMAIL ────────────────────────────────────────────────── */}
          {step === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Mail size={22} color="#0ea5e9" />
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Mot de passe oublié ?</h1>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
                  Entrez votre email. Vous recevrez un code OTP et un lien sécurisé.
                </p>
              </div>

              {error && <div style={S.error}><span>⚠</span>{error}</div>}

              <form onSubmit={handleSendEmail}>
                <label style={S.label} htmlFor="email">Adresse Email</label>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                    <Mail size={14} />
                  </span>
                  <input
                    id="email" type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@clinique.fr"
                    onFocus={() => setFocusEmail(true)}
                    onBlur={() => setFocusEmail(false)}
                    style={{ width: '100%', height: 42, borderRadius: 10, border: focusEmail ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0', background: focusEmail ? '#fff' : '#f8fafc', paddingLeft: 38, paddingRight: 12, fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', boxShadow: focusEmail ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none', transition: 'all 0.18s' }}
                  />
                </div>
                <button type="submit" disabled={loading} className="cs-btn" style={S.btn(loading)}>
                  {loading
                    ? <><svg style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/><path fill="rgba(255,255,255,0.9)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Envoi…</>
                    : 'Envoyer le code'
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 18 }}>
                Vous souvenez-vous ?{' '}
                <span style={{ color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/login')}>
                  Se connecter
                </span>
              </p>
            </>
          )}

          {/* ── ÉTAPE OTP ──────────────────────────────────────────────────── */}
          {step === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span style={{ fontSize: 24 }}>📬</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Vérifiez vos emails</h1>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
                  Nous avons envoyé un code à 6 chiffres à<br />
                  <strong style={{ color: '#0f172a' }}>{email}</strong>
                </p>
              </div>

              {error && <div style={S.error}><span>⚠</span>{error}</div>}

              <form onSubmit={handleVerifyOTP}>
                <label style={{ ...S.label, textAlign: 'center', marginBottom: 14 }}>Code de vérification</label>

                {/* Cases OTP */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className="cs-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{ width: 46, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#0f172a', border: digit ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0', borderRadius: 10, background: digit ? '#f0f9ff' : '#f8fafc', outline: 'none', transition: 'all 0.18s' }}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading || otp.join('').length < 6} className="cs-btn" style={S.btn(loading || otp.join('').length < 6)}>
                  {loading
                    ? <><svg style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/><path fill="rgba(255,255,255,0.9)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Vérification…</>
                    : 'Vérifier le code'
                  }
                </button>
              </form>

              {/* Renvoi */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                <RefreshCw size={13} color={countdown > 0 ? '#94a3b8' : '#0ea5e9'} />
                {countdown > 0
                  ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Renvoi possible dans {countdown}s</span>
                  : <span style={{ fontSize: 12, color: '#0ea5e9', cursor: 'pointer', fontWeight: 600 }} onClick={handleResend}>Renvoyer le code</span>
                }
              </div>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 12 }}>
                <span style={{ color: '#0ea5e9', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); }}>
                  ← Changer d'email
                </span>
              </p>
            </>
          )}

          {/* ── ÉTAPE SUCCÈS ───────────────────────────────────────────────── */}
          {step === 'done' && resetData && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle size={28} color="#10b981" />
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Code vérifié ✓</h1>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
                  Vous pouvez maintenant définir un nouveau mot de passe.
                </p>
              </div>

              <button
                className="cs-btn"
                style={S.btn(false)}
                onClick={() => navigate(`/reset-password?uid=${resetData.uid}&token=${resetData.token}`)}
              >
                Définir mon nouveau mot de passe →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}