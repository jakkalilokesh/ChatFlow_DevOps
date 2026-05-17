import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import './AuthPages.css';

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [shakeKey, setShakeKey] = useState(0);

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setShakeKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password, form.rememberMe);
      setSuccess(true);
      toast.success('Welcome back! 🎉');
      setTimeout(() => navigate('/chat'), 800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setErrors({ general: msg });
      setShakeKey((k) => k + 1);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left panel — animated illustration */}
      <div className="auth-illustration">
        <div className="auth-illustration__bg" />
        <div className="auth-illustration__content">
          <Logo size={52} animate />
          <h2 className="auth-illustration__title">
            Real-time chat, <br />
            <span className="gradient-text">reinvented.</span>
          </h2>
          <p className="auth-illustration__sub">
            Join thousands of teams collaborating effortlessly with ChatFlow.
          </p>
          {/* Animated chat bubbles */}
          <div className="chat-bubbles-demo">
            {[
              { text: 'Hey team, new deploy is live! 🚀', side: 'right', delay: 0 },
              { text: 'Awesome! Looking great 🎉', side: 'left', delay: 1.2 },
              { text: 'Metrics look good too 📊', side: 'right', delay: 2.4 },
              { text: 'Let\'s ship it! ✅', side: 'left', delay: 3.6 },
            ].map((bubble, i) => (
              <motion.div
                key={i}
                className={`demo-bubble demo-bubble--${bubble.side}`}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: bubble.delay + 0.5, duration: 0.4, type: 'spring' }}
              >
                {bubble.text}
              </motion.div>
            ))}
            <motion.div
              className="demo-typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5, duration: 0.4 }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="auth-form-card__header">
            <div className="auth-logo-glow">
              <Logo iconOnly size={44} animate />
            </div>
            <h1 className="auth-title">Welcome Back ✨</h1>
            <p className="auth-subtitle">Sign in to continue to ChatFlow</p>
          </div>

          <AnimatePresence>
            {errors.general && (
              <motion.div
                className="auth-error-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                ⚠️ {errors.general}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            key={shakeKey}
            ref={formRef}
            onSubmit={handleSubmit}
            className="auth-form"
            animate={shakeKey > 0 ? { x: [0, -10, 10, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            noValidate
          >
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`input-field ${errors.email ? 'input-field--error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="login-password">Password</label>
                <a href="#forgot" className="forgot-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={`input-field ${errors.password ? 'input-field--error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {/* Remember me */}
            <div className="form-group form-group--row">
              <label className="toggle-switch" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span className="toggle-track" />
                <span className="toggle-label">Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading || success}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : success ? (
                <span>✓ Signed In!</span>
              ) : (
                'Sign In'
              )}
            </button>
          </motion.form>

          <div className="auth-divider"><span>or continue with</span></div>

          <div className="oauth-buttons">
            <button id="google-oauth-btn" className="oauth-btn" onClick={() => toast('OAuth coming soon!')}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.26 9.77A7.2 7.2 0 0 1 12 4.8c1.78 0 3.38.66 4.6 1.74l3.42-3.42A12 12 0 0 0 12 0 12 12 0 0 0 1.14 6.96l4.12 2.81z"/><path fill="#34A853" d="M16.04 18.01A7.18 7.18 0 0 1 12 19.2a7.2 7.2 0 0 1-6.72-4.58L1.15 17.4A12 12 0 0 0 12 24a12 12 0 0 0 8.3-3.27l-4.26-2.72z"/><path fill="#FBBC05" d="M19.2 12c0-.62-.08-1.22-.2-1.8H12v3.41h4.08a3.5 3.5 0 0 1-1.52 2.29l4.26 2.72A11.99 11.99 0 0 0 22.8 12h-3.6z"/><path fill="#4285F4" d="M5.28 14.62A7.2 7.2 0 0 1 4.8 12c0-.9.16-1.76.44-2.56L1.12 6.63A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-2.77z"/></svg>
              Continue with Google
            </button>
            <button id="github-oauth-btn" className="oauth-btn" onClick={() => toast('OAuth coming soon!')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.04c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.1-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.82 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.3.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.9 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0z"/></svg>
              Continue with GitHub
            </button>
          </div>

          <p className="auth-switch-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-switch-link">Create one →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
