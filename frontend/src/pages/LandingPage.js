import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ParticleCanvas from '../components/landing/ParticleCanvas';
import CountUp from '../components/landing/CountUp';
import Logo from '../components/common/Logo';
import './LandingPage.css';

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: 'easeOut', delay },
  },
});

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  { icon: '⚡', title: 'Real-Time Messaging',    desc: 'Sub-50ms delivery via Socket.io. No page refresh, no polling — pure WebSocket magic.' },
  { icon: '🔒', title: 'Enterprise Security',    desc: 'JWT auth, bcrypt, rate limiting, Helmet.js headers, and Redis token blacklisting.' },
  { icon: '🌐', title: 'Unlimited Rooms',         desc: 'Public channels, private groups, and direct messages — scale to millions.' },
  { icon: '😄', title: 'Rich Reactions',          desc: 'Emoji reactions, reply threads, message editing and deletion in real time.' },
  { icon: '🎨', title: 'Avatar & Profiles',       desc: 'Upload custom avatars to S3, set status, and personalize your presence.' },
  { icon: '📊', title: 'Live Presence',           desc: 'See who is online, away, or offline. Typing indicators per room.' },
  { icon: '🔔', title: 'Smart Notifications',     desc: 'Unread badges, desktop push notifications, and configurable mute settings.' },
  { icon: '📱', title: 'Fully Responsive',        desc: 'Pixel-perfect on mobile, tablet, and desktop. PWA-ready.' },
  { icon: '☁️', title: 'Cloud Native',            desc: 'Runs on Kubernetes with auto-scaling, zero-downtime deploys, and Prometheus metrics.' },
];

const STATS = [
  { value: 10000,   suffix: '+',  label: 'Active Users',    icon: '👥' },
  { value: 1000000, suffix: '+',  label: 'Messages Sent',   icon: '💬' },
  { value: 99.9,    suffix: '%',  label: 'Uptime SLA',      icon: '🚀' },
  { value: 50,      suffix: 'ms', label: 'Avg. Latency',    icon: '⚡' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma', role: 'CTO @ TechNova', avatar: '👩‍💻',
    text: 'ChatFlow replaced our entire Slack setup. The real-time performance is insane — no dropped messages, ever.',
  },
  {
    name: 'Marcus Reid', role: 'Lead Dev @ Buildify', avatar: '👨‍🔧',
    text: 'We migrated 200 developers to ChatFlow in a weekend. The Kubernetes deployment just works beautifully.',
  },
  {
    name: 'Aisha Okafor', role: 'Product Manager @ Scalify', avatar: '👩‍💼',
    text: "The UI is gorgeous and the reaction / thread system keeps conversations organised like nothing else.",
  },
];

const STEPS = [
  { step: '01', title: 'Create an Account',  desc: 'Sign up in 60 seconds — no credit card, no setup friction.' },
  { step: '02', title: 'Create a Room',      desc: 'Spin up a public channel or private group for your team instantly.' },
  { step: '03', title: 'Invite Your Team',   desc: 'Share an invite link. Members join with a single click.' },
  { step: '04', title: 'Start Chatting',     desc: 'Send messages, react, reply in threads — all in real time.' },
];

export default function LandingPage() {

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero" id="hero">
        <ParticleCanvas />
        <div className="hero__overlay" />
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />

        <motion.div
          className="hero__content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp(0.05)} className="hero__logo-wrapper">
            <Logo size={72} animate />
          </motion.div>

          <motion.div variants={fadeUp(0.1)} className="hero__badge">
            <span className="hero__badge-dot" />
            Now in Public Beta — Free Forever
          </motion.div>

          <motion.h1 variants={fadeUp(0.15)} className="hero__headline">
            The <span className="gradient-text">Future</span> of<br />
            Team Communication
          </motion.h1>

          <motion.p variants={fadeUp(0.2)} className="hero__subtext">
            A blazing-fast, stunningly designed real-time chat platform built for
            modern teams. Rooms, reactions, threads, and presence — everything your team needs.
          </motion.p>

          <motion.div variants={fadeUp(0.25)} className="hero__cta">
            <Link to="/register" className="btn btn-primary btn-shimmer hero__cta-btn hero__cta-btn--primary">
              Start for Free 🚀
            </Link>
            <button className="btn btn-ghost hero__cta-btn" onClick={() => scrollTo('features')}>
              See Features ↓
            </button>
          </motion.div>

          <motion.p variants={fadeUp(0.3)} className="hero__disclaimer">
            No credit card required · Instant setup · Cancel anytime
          </motion.p>

          {/* Hero Stats Row */}
          <motion.div variants={fadeUp(0.35)} className="hero__stats-row">
            {STATS.map((s) => (
              <div key={s.label} className="hero__stat">
                <span className="hero__stat-icon">{s.icon}</span>
                <span className="hero__stat-val">
                  <CountUp end={s.value} suffix={s.suffix} />
                </span>
                <span className="hero__stat-label">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.button
          className="hero__scroll-indicator"
          onClick={() => scrollTo('features')}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          aria-label="Scroll to features"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="section-container">
          <motion.div
            className="section-header"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.p custom={0} variants={fadeUp(0)} className="section-label">✦ FEATURES</motion.p>
            <motion.h2 custom={0.1} variants={fadeUp(0.1)} className="section-title">
              Everything your team needs,{' '}
              <span className="gradient-text">nothing you don't</span>
            </motion.h2>
            <motion.p custom={0.2} variants={fadeUp(0.2)} className="section-sub">
              ChatFlow is built from the ground up for performance, security, and developer happiness.
            </motion.p>
          </motion.div>

          <motion.div
            className="features__grid"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                className="feature-card"
                variants={fadeUp(i * 0.05)}
                whileHover={{ y: -8, boxShadow: '0 24px 60px rgba(108, 99, 255, 0.22)' }}
                transition={{ type: 'spring', stiffness: 250, damping: 22 }}
              >
                <div className="feature-card__icon-wrap">
                  <div className="feature-card__icon">{feat.icon}</div>
                </div>
                <h3 className="feature-card__title">{feat.title}</h3>
                <p className="feature-card__desc">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="features__cta"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/pricing" className="btn btn-ghost">View Pricing →</Link>
            <Link to="/register" className="btn btn-primary btn-shimmer">Get Started Free</Link>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <motion.div
            className="section-header"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ HOW IT WORKS</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              Up and running in{' '}
              <span className="gradient-text">4 simple steps</span>
            </motion.h2>
          </motion.div>

          <div className="steps__grid">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                className="step-card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
              >
                <div className="step-card__number">{step.step}</div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__desc">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-card__connector" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials" id="testimonials">
        <div className="section-container">
          <motion.div
            className="section-header"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ LOVED BY TEAMS</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              Don't take our word for it —{' '}
              <span className="gradient-text">theirs</span>
            </motion.h2>
          </motion.div>

          <div className="testimonials__grid">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                className="testimonial-card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                whileHover={{ y: -6 }}
              >
                <div className="testimonial-card__stars">{'★'.repeat(5)}</div>
                <p className="testimonial-card__text">"{t.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">{t.avatar}</div>
                  <div>
                    <div className="testimonial-card__name">{t.name}</div>
                    <div className="testimonial-card__role">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="stats" id="stats">
        <div className="stats__inner">
          <motion.div
            className="stats__grid"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            {STATS.map((stat) => (
              <motion.div key={stat.label} className="stat-item" variants={fadeUp(0)}>
                <div className="stat-item__icon">{stat.icon}</div>
                <div className="stat-item__value">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="stat-item__label">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner" id="cta">
        <div className="section-container">
          <motion.div
            className="cta-banner__card"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta-banner__orb cta-banner__orb--1" />
            <div className="cta-banner__orb cta-banner__orb--2" />
            <div className="cta-banner__badge">Free Forever Plan Available</div>
            <h2 className="cta-banner__title">
              Ready to transform how your<br />team communicates?
            </h2>
            <p className="cta-banner__sub">
              Join thousands of teams already using ChatFlow. Set up in 60 seconds.
            </p>
            <div className="cta-banner__btns">
              <Link to="/register" className="btn btn-primary btn-shimmer" style={{ fontSize: '1rem', padding: '14px 40px' }}>
                Create Free Account ✨
              </Link>
              <Link to="/pricing" className="btn btn-ghost" style={{ fontSize: '1rem', padding: '14px 28px' }}>
                View Pricing
              </Link>
            </div>
            <p className="cta-banner__fine">No credit card required · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
