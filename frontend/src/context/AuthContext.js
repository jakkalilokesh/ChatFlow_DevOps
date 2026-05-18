import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Restore session on mount ─────────────────────────
  useEffect(() => {
    const token       = localStorage.getItem('chatflow_token');
    const storedUser  = localStorage.getItem('chatflow_user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {
        localStorage.removeItem('chatflow_token');
        localStorage.removeItem('chatflow_user');
      }
    }
    setLoading(false);
  }, []);

  const _storeSession = (userData, token, refreshToken, rememberMe = true) => {
    setUser(userData);
    localStorage.setItem('chatflow_token', token);
    localStorage.setItem('chatflow_user', JSON.stringify(userData));
    if (rememberMe) {
      localStorage.setItem('chatflow_refresh', refreshToken);
    } else {
      sessionStorage.setItem('chatflow_refresh', refreshToken);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const login = useCallback(async (email, password, rememberMe = false) => {
    setError(null);
    const response  = await api.post('/auth/login', { email, password });
    const { user: userData, token, refreshToken } = response.data;
    _storeSession(userData, token, refreshToken, rememberMe);
    return userData;
  }, []);

  // Called after OAuth callback — receives tokens from URL params
  const loginWithTokens = useCallback((data) => {
    const userData = {
      id: data.userId, username: data.username,
      email: data.email, avatarUrl: data.avatarUrl,
    };
    _storeSession(userData, data.accessToken, data.refreshToken, true);
    return userData;
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    const response  = await api.post('/auth/register', payload);
    const { user: userData, token, refreshToken } = response.data;
    _storeSession(userData, token, refreshToken, true);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('chatflow_refresh') || sessionStorage.getItem('chatflow_refresh');
      if (rt) await api.post('/auth/logout', { refreshToken: rt });
    } catch { /* silent */ } finally {
      setUser(null);
      localStorage.removeItem('chatflow_token');
      localStorage.removeItem('chatflow_user');
      localStorage.removeItem('chatflow_refresh');
      sessionStorage.removeItem('chatflow_refresh');
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('chatflow_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginWithTokens, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
