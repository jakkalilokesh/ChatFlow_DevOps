import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/api/users/${user.id}`, form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '100px 24px 48px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Banner */}
          <div style={{
            height: 180, borderRadius: 'var(--radius-xl)',
            background: 'var(--gradient-primary)', marginBottom: 0,
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)'
            }} />
          </div>

          {/* Avatar + info card */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)', padding: '0 32px 32px', marginTop: -1
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24, paddingTop: 0 }}>
              <motion.div
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, fontWeight: 700, color: 'white',
                  border: '4px solid var(--bg-primary)',
                  marginTop: -48, flexShrink: 0, overflow: 'hidden',
                  boxShadow: 'var(--shadow-glow)'
                }}
                whileHover={{ scale: 1.05 }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.username?.[0]?.toUpperCase()
                )}
              </motion.div>
              <div style={{ paddingBottom: 8 }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {user?.username}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{user?.email}</p>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>@</span>
                    <input
                      id="profile-username"
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                      style={{ width: '100%', padding: '12px 14px 12px 32px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell people a bit about yourself..."
                  maxLength={200}
                  rows={3}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  id="save-profile-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ padding: '12px 28px' }}
                >
                  {saving ? (
                    <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                  ) : '💾 Save Changes'}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024' },
              { label: 'Status', value: '🟢 Online' },
              { label: 'Account Type', value: 'Free' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{stat.value}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
