import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { AnimatedMesh } from '../components/ui/AnimatedBackground';

export default function LoginPage() {
  const { login }                = useAuth();
  const [email,    setEmail]     = useState('');
  const [password, setPassword]  = useState('');
  const [remember, setRemember]  = useState(false);
  const [loading,  setLoading]   = useState(false);
  const [error,    setError]     = useState('');
  const [showPwd,  setShowPwd]   = useState(false);
  const [searchParams]           = useSearchParams();

  const API_URL = process.env.REACT_APP_API_URL || '';

  const urlError   = searchParams.get('error');
  const verified   = searchParams.get('verified');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
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
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to your ChatFlow account</p>

        {verified === 'true' && (
          <div style={{ background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.3)', color: '#4ecdc4', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            ✅ Email verified! You can now sign in.
          </div>
        )}

        {(urlError || error) && (
          <div className="auth-error">
            {urlError === 'oauth_failed' ? 'OAuth sign-in failed. Please try again.' : error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <a href={`${API_URL}/auth/google`} className="oauth-btn" id="btn-google-login">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.4-10.5 7.4-17.5z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"/><path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3.1-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l8.1-6.2z"/><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.2 30.4 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"/></svg>
            Continue with Google
          </a>
          <a href={`${API_URL}/auth/github`} className="oauth-btn" id="btn-github-login">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </a>
        </div>

        <div className="oauth-divider">or with email</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-toggle">
              <input id="login-password" className="input-field" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="pwd-toggle">{showPwd ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ color: '#6c63ff', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <button type="submit" id="btn-login-submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer-links">
          Don't have an account? <Link to="/register">Sign up free</Link>
        </div>
      </motion.div>
    </div>
  );
}
