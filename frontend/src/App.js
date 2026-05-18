import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import PageLoader from './components/common/PageLoader';
import ScrollToTop from './components/common/ScrollToTop';
import CommandPalette from './components/CommandPalette';

// ── Lazy-loaded pages ───────────────────────────────────
const LandingPage         = lazy(() => import('./pages/LandingPage'));
const LoginPage           = lazy(() => import('./pages/LoginPage'));
const RegisterPage        = lazy(() => import('./pages/RegisterPage'));
const ChatPage            = lazy(() => import('./pages/ChatPage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const SettingsPage        = lazy(() => import('./pages/SettingsPage'));
const PricingPage         = lazy(() => import('./pages/PricingPage'));
const AboutPage           = lazy(() => import('./pages/AboutPage'));
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage'));
const AdminDashboard      = lazy(() => import('./pages/AdminDashboard'));
const OAuthCallback       = lazy(() => import('./pages/OAuthCallback'));
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('./pages/ResetPasswordPage'));

// ── Route guards ────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return !user ? children : <Navigate to="/chat" replace />;
}

// ── Routes with AnimatePresence ─────────────────────────
function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* Public pages */}
        <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
        <Route path="/about"   element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />

        {/* Auth pages (redirect to /chat if logged in) */}
        <Route path="/login"    element={<PublicRoute><Suspense fallback={<PageLoader />}><LoginPage /></Suspense></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Suspense fallback={<PageLoader />}><RegisterPage /></Suspense></PublicRoute>} />

        {/* Password reset flow */}
        <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password"  element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />

        {/* OAuth callback — public, handles its own redirect */}
        <Route path="/oauth/callback" element={<Suspense fallback={<PageLoader />}><OAuthCallback /></Suspense>} />

        {/* Protected pages — SocketProvider wraps all chat routes */}
        <Route path="/chat" element={
          <PrivateRoute>
            <SocketProvider>
              <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>
            </SocketProvider>
          </PrivateRoute>
        } />
        <Route path="/chat/:roomId" element={
          <PrivateRoute>
            <SocketProvider>
              <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>
            </SocketProvider>
          </PrivateRoute>
        } />
        <Route path="/profile"  element={<PrivateRoute><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></PrivateRoute>} />
        <Route path="/admin"    element={<PrivateRoute><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
          <CommandPalette />
          <Toaster
            position="top-right"
            gutter={12}
            toastOptions={{
              duration: 4000,
              style: {
                background:    'rgba(13,20,40,0.95)',
                color:         '#f1f5f9',
                border:        '1px solid rgba(255,255,255,0.1)',
                backdropFilter:'blur(20px)',
                borderRadius:  '12px',
                padding:       '14px 18px',
                fontFamily:    "'Inter', sans-serif",
                fontSize:      '14px',
                fontWeight:    '500',
                boxShadow:     '0 8px 32px rgba(0,0,0,0.4)',
              },
              success: { iconTheme: { primary: '#4ecdc4', secondary: '#0a0f1e' } },
              error:   { iconTheme: { primary: '#ff6b6b', secondary: '#0a0f1e' } },
            }}
          />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
