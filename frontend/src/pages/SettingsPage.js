import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import ThemePicker from '../components/settings/ThemePicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TABS = [
  { id: 'profile',       icon: '👤', label: 'Profile' },
  { id: 'security',      icon: '🔒', label: 'Security' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'appearance',    icon: '🎨', label: 'Appearance' },
  { id: 'privacy',       icon: '🛡️',  label: 'Privacy' },
];

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
      <div>
        <span style={{ fontSize: 14, color: 'var(--text-primary)', display: 'block' }}>{label}</span>
        {description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</span>}
      </div>
      <div id={id} onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? 'var(--accent, #8b5cf6)' : 'var(--border, rgba(255,255,255,0.1))', position: 'relative', cursor: 'pointer', transition: 'background 0.25s', flexShrink: 0 }}>
        <motion.div animate={{ left: checked ? 23 : 3 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const getStrength = (p) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const strength = getStrength(password);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= strength ? colors[strength] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      {password && <span style={{ fontSize: 11, color: colors[strength] }}>{labels[strength]}</span>}
    </div>
  );
}

export default function SettingsPageV2() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({ displayName: user?.username || '', bio: '', status: 'online' });

  // Security state
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Notifications state
  const [notifs, setNotifs] = useState({ master: true, desktop: true, sounds: false, mentions: true });

  // Privacy state
  const [privacy, setPrivacy] = useState({ readReceipts: true, onlineStatus: true, profilePublic: true });

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 14, fontFamily: "'Inter', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/users/me', profile);
      toast.success('Profile saved!');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await api.put('/api/users/me/password', { currentPassword: passwords.current, newPassword: passwords.next });
      toast.success('Password updated!');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handle2FASetup = async () => {
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setQrCode(data.qrCodeDataUrl);
      setShow2FASetup(true);
    } catch {
      toast.error('Failed to set up 2FA');
    }
  };

  const handle2FAVerify = async () => {
    try {
      await api.post('/auth/2fa/verify', { token: totpCode });
      setTwoFAEnabled(true);
      setShow2FASetup(false);
      toast.success('2FA enabled!');
    } catch {
      toast.error('Invalid code. Try again.');
    }
  };

  const tabContent = {
    profile: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Display Name</label>
          <input id="settings-display-name" style={inputStyle} value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} placeholder="Your name" />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Bio <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({profile.bio.length}/200)</span></label>
          <textarea id="settings-bio" style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={profile.bio} maxLength={200} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell people about yourself" />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Status</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'online', label: '🟢 Online', color: '#10b981' },
              { id: 'away', label: '🟡 Away', color: '#f59e0b' },
              { id: 'dnd', label: '🔴 Do Not Disturb', color: '#ef4444' },
              { id: 'invisible', label: '⚫ Invisible', color: '#6b7280' },
            ].map((s) => (
              <button key={s.id} id={`status-${s.id}`} onClick={() => setProfile((p) => ({ ...p, status: s.id }))} style={{ padding: '6px 12px', borderRadius: 20, border: `2px solid ${profile.status === s.id ? s.color : 'transparent'}`, background: profile.status === s.id ? `${s.color}20` : 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button id="save-profile-btn" onClick={handleSaveProfile} disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ padding: '12px 28px', background: 'var(--accent, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {saving ? '...' : '✓ Save Profile'}
          </motion.button>
        </div>
      </div>
    ),

    security: (
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {[
            { id: 'sec-current-pw', key: 'current', label: 'Current Password' },
            { id: 'sec-new-pw', key: 'next', label: 'New Password' },
            { id: 'sec-confirm-pw', key: 'confirm', label: 'Confirm New Password' },
          ].map(({ id, key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
              <input id={id} type="password" style={inputStyle} value={passwords[key]} onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))} />
              {key === 'next' && passwords.next && <PasswordStrength password={passwords.next} />}
            </div>
          ))}
          <button type="submit" disabled={saving} style={{ padding: '12px', background: 'var(--accent, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, marginTop: 4 }}>
            {saving ? 'Updating…' : '🔐 Update Password'}
          </button>
        </form>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Two-Factor Authentication</h3>
        <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                {twoFAEnabled ? '✅ 2FA is enabled' : '2FA is disabled'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                Use Google Authenticator, Authy, or any TOTP app
              </p>
            </div>
            <button id={twoFAEnabled ? 'disable-2fa-btn' : 'enable-2fa-btn'} onClick={twoFAEnabled ? () => setTwoFAEnabled(false) : handle2FASetup} style={{ padding: '8px 16px', background: twoFAEnabled ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.15)', color: twoFAEnabled ? '#ef4444' : 'var(--accent, #8b5cf6)', border: `1px solid ${twoFAEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              {twoFAEnabled ? 'Disable' : 'Enable 2FA'}
            </button>
          </div>

          <AnimatePresence>
            {show2FASetup && qrCode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>Scan this QR code with your authenticator app:</p>
                <img src={qrCode} alt="2FA QR Code" style={{ width: 160, height: 160, borderRadius: 8, background: 'white', padding: 4 }} />
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <input id="totp-code-input" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" maxLength={6} style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: 8, width: 160 }} />
                  <button onClick={handle2FAVerify} disabled={totpCode.length < 6} style={{ padding: '12px 20px', background: 'var(--accent, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, cursor: totpCode.length < 6 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    Verify
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    ),

    notifications: (
      <div>
        <Toggle id="notif-master" checked={notifs.master} onChange={() => setNotifs((p) => ({ ...p, master: !p.master }))} label="Enable all notifications" description="Master toggle for all notification types" />
        <Toggle id="notif-desktop" checked={notifs.desktop} onChange={() => setNotifs((p) => ({ ...p, desktop: !p.desktop }))} label="Desktop notifications" description="Show browser push notifications when not focused" />
        <Toggle id="notif-sounds" checked={notifs.sounds} onChange={() => setNotifs((p) => ({ ...p, sounds: !p.sounds }))} label="Notification sounds" description="Play a sound for new messages and mentions" />
        <Toggle id="notif-mentions" checked={notifs.mentions} onChange={() => setNotifs((p) => ({ ...p, mentions: !p.mentions }))} label="Mentions & replies" description="Notify when someone mentions you or replies to your thread" />
      </div>
    ),

    appearance: <ThemePicker />,

    privacy: (
      <div>
        <Toggle id="priv-read-receipts" checked={privacy.readReceipts} onChange={() => setPrivacy((p) => ({ ...p, readReceipts: !p.readReceipts }))} label="Read receipts" description="Let others see when you've read their messages" />
        <Toggle id="priv-online-status" checked={privacy.onlineStatus} onChange={() => setPrivacy((p) => ({ ...p, onlineStatus: !p.onlineStatus }))} label="Show online status" description="Display your online status to workspace members" />
        <Toggle id="priv-profile-public" checked={privacy.profilePublic} onChange={() => setPrivacy((p) => ({ ...p, profilePublic: !p.profilePublic }))} label="Public profile" description="Allow anyone to see your profile" />
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>Danger Zone</h3>
          <button id="delete-account-btn" onClick={() => toast.error('Please contact support to delete your account')} style={{ padding: '10px 18px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            🗑️ Delete Account
          </button>
        </div>
      </div>
    ),
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0a0f1e)' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px 48px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }}>

        {/* Sidebar */}
        <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 16, padding: 8, height: 'fit-content', position: 'sticky', top: 100 }}>
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 10, border: 'none',
                background: activeTab === tab.id ? 'rgba(139,92,246,0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent, #8b5cf6)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                fontFamily: "'Inter', sans-serif", cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                borderLeft: activeTab === tab.id ? '3px solid var(--accent, #8b5cf6)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'var(--bg-card, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              {TABS.find((t) => t.id === activeTab)?.icon} {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 28px' }}>
              {activeTab === 'profile' && 'Manage your public profile and status.'}
              {activeTab === 'security' && 'Password and two-factor authentication settings.'}
              {activeTab === 'notifications' && 'Control when and how you are notified.'}
              {activeTab === 'appearance' && 'Customize the look and feel of ChatFlow.'}
              {activeTab === 'privacy' && 'Manage your privacy and data preferences.'}
            </p>
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
