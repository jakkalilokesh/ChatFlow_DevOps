import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <Navbar />

      <section className="notfound-hero">
        {/* Background orbs */}
        <div className="notfound__orb notfound__orb--1" />
        <div className="notfound__orb notfound__orb--2" />

        <motion.div
          className="notfound__content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Glitch 404 */}
          <motion.div
            className="notfound__code"
            animate={{ opacity: [1, 0.8, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            404
          </motion.div>

          <div className="notfound__emoji">🔍</div>
          <h1 className="notfound__title">Page Not Found</h1>
          <p className="notfound__sub">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          <div className="notfound__actions">
            <button
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
            >
              ← Go Back
            </button>
            <Link to="/" className="btn btn-primary btn-shimmer">
              🏠 Go Home
            </Link>
            <Link to="/chat" className="btn btn-ghost">
              💬 Open Chat
            </Link>
          </div>

          {/* Quick Links */}
          <div className="notfound__links">
            <p className="notfound__links-label">Or try one of these:</p>
            <div className="notfound__links-grid">
              {[
                { to: '/register', label: '🚀 Get Started',   desc: 'Create a free account' },
                { to: '/pricing',  label: '💰 Pricing',       desc: 'View our plans' },
                { to: '/about',    label: '👥 About',         desc: 'Learn about ChatFlow' },
                { to: '/login',    label: '🔐 Sign In',       desc: 'Return to your workspace' },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="notfound__quick-link">
                  <span className="notfound__quick-link-label">{link.label}</span>
                  <span className="notfound__quick-link-desc">{link.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
