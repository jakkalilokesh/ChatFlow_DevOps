import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import './AuthPages.css';

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🦝', '🐻', '🦄', '🐸', '🐙', '🦋'];

const STEPS = ['Account', 'Security', 'Avatar', 'Done'];

function getPasswordStrength(pw) {
  if (!pw) return -1;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score - 1, 2);
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: '🦊',
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);

  const pwStrength = getPasswordStrength(form.password);
  const pwLabels = ['Weak', 'Fair', 'Strong'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.fullName.trim()) errs.fullName = 'Full name is required';
      if (!form.username.trim()) errs.username = 'Username is required';
      else if (form.username.length < 3) errs.username = 'Username must be at least 3 characters';
      else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Only letters, numbers, and underscores';
    }
    if (step === 1) {
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleNext = () => {
    if (step >= 2) return;
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setShakeKey((k) => k + 1);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        username: form.username.toLowerCase(),
        email: form.email,
        password: form.password,
        avatarEmoji: form.avatar,
      });
      setStep(3);
      toast.success('Account created! Welcome to ChatFlow 🎉');
      setTimeout(() => navigate('/chat'), 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Left illustration */}
      <div className="auth-illustration">
        <div className="auth-illustration__bg" />
        <div className="auth-illustration__content">
          <Logo size={52} animate />
          <h2 className="auth-illustration__title">
            Create your <br />
            <span className="gradient-text">ChatFlow space.</span>
          </h2>
          <p className="auth-illustration__sub">
            Set up your profile, join rooms, and start collaborating in minutes.
          </p>
          {/* Floating icons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            {['💬', '🚀', '⚡', '🔒', '🌐', '🎉'].map((icon, i) => (
              <motion.div
                key={icon}
                style={{ fontSize: 32 }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              >
                {icon}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="auth-form-card__header">
            <div className="auth-logo-glow">
              <Logo iconOnly size={40} animate />
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Step {step + 1} of {STEPS.length}</p>
          </div>

          {/* Progress bar */}
          <div className="auth-steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`auth-step ${i < step ? 'auth-step--done' : i === step ? 'auth-step--active' : ''}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Name + Username */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <motion.form
                  key={shakeKey}
                  className="auth-form"
                  animate={shakeKey > 0 ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-fullName">Full Name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input id="reg-fullName" type="text" name="fullName" value={form.fullName}
                        onChange={handleChange} className={`input-field ${errors.fullName ? 'input-field--error' : ''}`}
                        placeholder="John Doe" autoFocus />
                    </div>
                    {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-username">Username</label>
                    <div className="input-wrapper">
                      <span className="input-icon">@</span>
                      <input id="reg-username" type="text" name="username" value={form.username}
                        onChange={handleChange} className={`input-field ${errors.username ? 'input-field--error' : ''}`}
                        placeholder="johndoe" />
                    </div>
                    {errors.username && <span className="form-error">{errors.username}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary auth-submit-btn">
                    Continue →
                  </button>
                </motion.form>
              </motion.div>
            )}

            {/* Step 1: Email + Password */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {errors.general && (
                  <div className="auth-error-banner" style={{ marginBottom: 16 }}>⚠️ {errors.general}</div>
                )}
                <motion.form
                  key={shakeKey}
                  className="auth-form"
                  animate={shakeKey > 0 ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-email">Email</label>
                    <div className="input-wrapper">
                      <span className="input-icon">✉️</span>
                      <input id="reg-email" type="email" name="email" value={form.email}
                        onChange={handleChange} className={`input-field ${errors.email ? 'input-field--error' : ''}`}
                        placeholder="you@example.com" />
                    </div>
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-password">Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input id="reg-password" type={showPw ? 'text' : 'password'} name="password" value={form.password}
                        onChange={handleChange} className={`input-field ${errors.password ? 'input-field--error' : ''}`}
                        placeholder="Min. 8 characters" />
                      <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </div>
                    {errors.password && <span className="form-error">{errors.password}</span>}
                    {form.password && (
                      <div className="pw-strength">
                        <div className="pw-strength__bars">
                          {[0,1,2].map((i) => (
                            <div key={i} className={`pw-strength__bar ${i <= pwStrength ? `pw-strength__bar--${pwStrength}` : ''}`} />
                          ))}
                        </div>
                        <span className="pw-strength__label">{pwStrength >= 0 ? pwLabels[pwStrength] : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔑</span>
                      <input id="reg-confirm" type="password" name="confirmPassword" value={form.confirmPassword}
                        onChange={handleChange} className={`input-field ${errors.confirmPassword ? 'input-field--error' : ''}`}
                        placeholder="Repeat your password" />
                    </div>
                    {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>← Back</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Continue →</button>
                  </div>
                </motion.form>
              </motion.div>
            )}

            {/* Step 2: Avatar selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <p className="form-label" style={{ marginBottom: 12 }}>Choose your avatar</p>
                <div className="avatar-grid">
                  {AVATARS.map((av) => (
                    <motion.button
                      key={av}
                      type="button"
                      className={`avatar-option ${form.avatar === av ? 'avatar-option--selected' : ''}`}
                      onClick={() => setForm((p) => ({ ...p, avatar: av }))}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {av}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? <span className="btn-spinner" /> : 'Create Account 🚀'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <motion.div
                  style={{ fontSize: 64, marginBottom: 16 }}
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8 }}
                >
                  🎉
                </motion.div>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: 8 }}>
                  Welcome to ChatFlow!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Your account is ready. Redirecting to chat...
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                  <span className="typing-dot" style={{ width: 8, height: 8, background: 'var(--accent-purple)', borderRadius: '50%', display: 'inline-block', animation: 'typing-bounce 1.2s ease-in-out infinite' }} />
                  <span className="typing-dot" style={{ width: 8, height: 8, background: 'var(--accent-purple)', borderRadius: '50%', display: 'inline-block', animation: 'typing-bounce 1.2s ease-in-out infinite 0.15s' }} />
                  <span className="typing-dot" style={{ width: 8, height: 8, background: 'var(--accent-purple)', borderRadius: '50%', display: 'inline-block', animation: 'typing-bounce 1.2s ease-in-out infinite 0.3s' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 3 && (
            <p className="auth-switch-text" style={{ marginTop: 24 }}>
              Already have an account?{' '}
              <Link to="/login" className="auth-switch-link">Sign in →</Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
