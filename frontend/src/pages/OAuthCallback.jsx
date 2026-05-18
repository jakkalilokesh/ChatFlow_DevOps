import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken= params.get('refreshToken');
    const userId      = params.get('userId');
    const username    = params.get('username');
    const email       = params.get('email');
    const avatarUrl   = params.get('avatarUrl');
    const error       = params.get('error');

    if (error) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (accessToken) {
      loginWithTokens({ accessToken, refreshToken, userId, username, email, avatarUrl });
      navigate('/chat', { replace: true });
    } else {
      navigate('/login?error=no_token', { replace: true });
    }
  }, []); // eslint-disable-line

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: 48, height: 48, border: '4px solid rgba(108,99,255,0.2)',
        borderTopColor: '#6c63ff', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', marginBottom: 20,
      }} />
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Signing you in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
