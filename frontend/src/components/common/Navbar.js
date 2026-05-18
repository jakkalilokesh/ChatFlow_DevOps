import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isLanding = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const scrollToSection = useCallback((id) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname, navigate]);

  const publicLinks = [
    { label: 'Features', action: () => scrollToSection('features'), id: 'features' },
    { label: 'Pricing',  to: '/pricing' },
    { label: 'About',    to: '/about' },
  ];

  const authLinks = [
    { label: '💬 Chat',     to: '/chat' },
    { label: '👤 Profile',  to: '/profile' },
    { label: '⚙️ Settings', to: '/settings' },
  ];

  const links = user ? authLinks : publicLinks;

  return (
    <>
      {/* Backdrop blur when mobile menu open */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="navbar__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.nav
        className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${isLanding && !scrolled ? 'navbar--transparent' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="navbar__inner">
          {/* Logo */}
          <Link to="/" className="navbar__logo" aria-label="ChatFlow Home">
            <Logo size={34} showText={false} />
            <span className="navbar__logo-text">ChatFlow</span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="navbar__links" role="navigation" aria-label="Main navigation">
            {links.map((link) => (
              <li key={link.label}>
                {link.action ? (
                  <button
                    className="navbar__link navbar__link--btn"
                    onClick={link.action}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    to={link.to}
                    className={`navbar__link ${location.pathname === link.to ? 'navbar__link--active' : ''}`}
                  >
                    {link.label}
                    {location.pathname === link.to && (
                      <motion.div className="navbar__link-underline" layoutId="navbar-underline" />
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Right Side */}
          <div className="navbar__actions">
            {user ? (
              <div className="navbar__user" ref={dropdownRef}>
                <button
                  id="navbar-user-btn"
                  className="navbar__avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="navbar__avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} />
                    ) : (
                      <span className="navbar__avatar-initial">{user.username?.[0]?.toUpperCase()}</span>
                    )}
                    <span className="navbar__online-dot" />
                  </div>
                  <span className="navbar__username">{user.username}</span>
                  <svg className="navbar__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className="navbar__dropdown"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="navbar__dropdown-header">
                        <div className="navbar__dropdown-avatar">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="navbar__dropdown-name">{user.username}</div>
                          <div className="navbar__dropdown-email">{user.email}</div>
                        </div>
                      </div>
                      <div className="navbar__dropdown-divider" />
                      <Link to="/chat"     className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}><span>💬</span> Open Chat</Link>
                      <Link to="/profile"  className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}><span>👤</span> Profile</Link>
                      <Link to="/settings" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}><span>⚙️</span> Settings</Link>
                      <div className="navbar__dropdown-divider" />
                      <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                        <span>🚪</span> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="navbar__auth-btns">
                <Link to="/login"    className="btn btn-ghost navbar__signin-btn">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-shimmer navbar__getstarted-btn">Get Started →</Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              id="navbar-hamburger"
              className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="navbar__mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="navbar__mobile-inner">
                {links.map((link) => (
                  link.action ? (
                    <button key={link.label} className="navbar__mobile-link" onClick={link.action}>
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to}
                      className={`navbar__mobile-link ${location.pathname === link.to ? 'navbar__mobile-link--active' : ''}`}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                {!user && (
                  <div className="navbar__mobile-auth">
                    <Link to="/login"    className="btn btn-ghost"    style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>Sign In</Link>
                    <Link to="/register" className="btn btn-primary"  style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>Get Started</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
