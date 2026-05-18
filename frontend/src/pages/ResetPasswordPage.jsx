import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { Logo } from '../components/common/Logo';

export default function ResetPasswordPage() {
  const navigate     = useNavigate();
  const [token,      setToken]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (!t) { navigate('/login?error=invalid_token'); return; }
    setToken(t);
  }, [navigate]);

  const strength = () => {
    let s = 0;
    if (password.length >= 8)                       s++;
    if (/[A-Z]/.test(password))                     s++;
    if (/[0-9]/.test(password))                     s++;
    if (/[^A-Za-z0-9]/.test(password))              s++;
    return s;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login?reset=success'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#4ecdc4'];
  const s = strength();

  return (
    <div className="auth-page">
      <div className="auth-mesh-bg">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>
      <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="auth-card__logo"><Logo size={36} /></div>
        <h1 className="auth-card__title">Set new password</h1>

        {success ? (
          <div className="auth-success-box">
            <span className="auth-success-icon">✅</span>
            <h3>Password updated!</h3>
            <p>Redirecting you to login…</p>
          </div>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="new-password">New password</label>
                <div className="input-with-toggle">
                  <input
                    id="new-password" type={showPwd ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required autoFocus
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="pwd-toggle">
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
                {password && (
                  <div className="pwd-strength">
                    <div className="pwd-strength__bar">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="pwd-strength__segment"
                          style={{ background: i <= s ? strengthColors[s] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColors[s], fontSize: 12 }}>{strengthLabels[s]}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password" type="password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password" required
                />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : 'Reset password'}
              </button>
            </form>
            <div className="auth-footer-links"><Link to="/login">← Back to login</Link></div>
          </>
        )}
      </motion.div>
    </div>
  );
}
