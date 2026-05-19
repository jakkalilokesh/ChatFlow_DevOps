import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size cannot exceed 5MB');
      return;
    }

    setUploadingAvatar(true);
    const loadingToast = toast.loading('Uploading avatar...');
    try {
      // 1. Get presigned upload URL
      const { data } = await api.post('/api/upload/presign', {
        bucket: 'avatars',
        fileName: file.name,
        fileType: file.type
      });

      // 2. Put file to MinIO
      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      // 3. Update the database
      const updateRes = await api.put(`/api/users/${user.id}`, {
        ...form,
        avatarUrl: data.fileUrl
      });
      updateUser(updateRes.data.user);
      toast.success('Avatar updated successfully!', { id: loadingToast });
    } catch (err) {
      toast.error(err.message || 'Avatar upload failed', { id: loadingToast });
    } finally {
      setUploadingAvatar(false);
    }
  };

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
    <div className="profile-container">
      <Navbar />
      <div className="profile-content-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="profile-card-container"
        >
          {/* Banner */}
          <div className="profile-banner">
            <div className="profile-banner__overlay" />
            <div className="profile-banner__mesh" />
          </div>

          {/* Avatar + Identity section */}
          <div className="profile-identity-section">
            <input
              ref={avatarInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <motion.div
              className="profile-avatar-wrapper"
              whileHover={{ scale: 1.05 }}
              onClick={handleAvatarClick}
              title="Click to change avatar"
              style={{ position: 'relative' }}
            >
              {uploadingAvatar ? (
                <span className="profile-spinner" style={{ width: 32, height: 32 }} />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
              <div className="profile-avatar-hover-overlay" style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
                fontSize: 16, pointerEvents: 'none'
              }}>
                📷
              </div>
            </motion.div>
            <div className="profile-identity-text">
              <h1 className="profile-identity-name">
                {user?.username}
              </h1>
              <p className="profile-identity-email">{user?.email}</p>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Username
                </label>
                <div className="profile-input-wrapper">
                  <span className="profile-input-prefix">@</span>
                  <input
                    id="profile-username"
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    className="profile-input-field profile-input-field--prefixed"
                  />
                </div>
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="profile-input-field"
                />
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">
                Bio
              </label>
              <textarea
                id="profile-bio"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell people a bit about yourself..."
                maxLength={200}
                rows={3}
                className="profile-textarea"
              />
            </div>

            <div className="profile-form-footer">
              <motion.button
                id="save-profile-btn"
                type="submit"
                className="profile-save-btn"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? (
                  <span className="profile-spinner" />
                ) : '💾 Save Changes'}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Stats */}
        <div className="profile-stats-grid">
          {[
            { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024' },
            { label: 'Status', value: '🟢 Online' },
            { label: 'Account Type', value: 'Free' },
          ].map((stat) => (
            <div key={stat.label} className="profile-stat-card">
              <p className="profile-stat-value">{stat.value}</p>
              <p className="profile-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
