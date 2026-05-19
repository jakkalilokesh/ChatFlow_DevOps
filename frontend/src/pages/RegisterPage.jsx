import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { AnimatedMesh } from '../components/ui/AnimatedBackground';
import { API_URL } from '../config';

const AVATARS = ['🦊','🐼','🦁','🐯','🦋','🐧','🦄','🐸','🦅','🐺','🦀','🐬','🦜','🦩','🐙','🐻','🦊','🐮','🦖','🐘'];

export default function RegisterPage() {
  const { register } = useAuth();
  const [step,      setStep]      = useState(1);
  const [fullName,  setFullName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [avatar,    setAvatar]    = useState('🦊');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showPwd,   setShowPwd]   = useState(false);

  const strength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#4ecdc4'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const s = strength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setError(''); setLoading(true);
    try {
      await register({ fullName, username, email, password });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AnimatedMesh />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-card__logo"><Logo size={36} /></div>
        <h1 className="auth-card__title">Create account</h1>

        {/* Step indicator */}
        <div className="auth-steps" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1, 2].map((n) => (
            <div key={n} style={{
              flex: 1, height: 3, borderRadius: 9999,
              background: n <= step ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* OAuth */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <a href={`${API_URL}/auth/google`} className="oauth-btn" id="btn-google-register">
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.4-10.5 7.4-17.5z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"/><path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3.1-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l8.1-6.2z"/><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.2 30.4 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"/></svg>
                Sign up with Google
              </a>
              <a href={`${API_URL}/auth/github`} className="oauth-btn" id="btn-github-register">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                Sign up with GitHub
              </a>
            </div>
            <div className="oauth-divider">or with email</div>
          </>
        )}

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 ? (
            <>
              <div className="form-group">
                <label htmlFor="reg-fullname">Full Name</label>
                <input id="reg-fullname" className="input-field" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required minLength={2} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-username">Username</label>
                <input id="reg-username" className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="janedoe" required minLength={3} maxLength={30} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input id="reg-email" className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <div className="input-with-toggle">
                  <input id="reg-password" className="input-field" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="pwd-toggle">{showPwd ? '🙈' : '👁️'}</button>
                </div>
                {password && (
                  <div className="pwd-strength">
                    <div className="pwd-strength__bar">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="pwd-strength__segment" style={{ background: i <= s ? strengthColors[s] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColors[s], fontSize: 12 }}>{strengthLabels[s]}</span>
                  </div>
                )}
              </div>
              <button type="submit" className="auth-submit-btn">Continue →</button>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                Pick an avatar for your profile
              </p>
              <div className="avatar-grid">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`avatar-option${avatar === emoji ? ' avatar-option--selected' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="submit" id="btn-register-submit" className="auth-submit-btn" style={{ flex: 2 }} disabled={loading}>
                  {loading ? <span className="btn-spinner" /> : '🚀 Create Account'}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-footer-links">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
