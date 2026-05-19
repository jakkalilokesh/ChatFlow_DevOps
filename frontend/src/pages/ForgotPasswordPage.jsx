import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { Logo } from '../components/common/Logo';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-mesh-bg">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-card__logo"><Logo size={36} /></div>
        <h1 className="auth-card__title">Reset password</h1>

        {submitted ? (
          <div className="auth-success-box">
            <span className="auth-success-icon">📧</span>
            <h3>Check your inbox</h3>
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your spam folder too.</p>
            <Link to="/login" className="auth-link-btn">Back to login</Link>
          </div>
        ) : (
          <>
            <p className="auth-card__subtitle">
              Enter your email and we'll send you a secure reset link.
            </p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="forgot-email">Email address</label>
                <input
                  id="forgot-email" className="input-field" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : 'Send reset link'}
              </button>
            </form>
            <div className="auth-footer-links">
              <Link to="/login">← Back to login</Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
