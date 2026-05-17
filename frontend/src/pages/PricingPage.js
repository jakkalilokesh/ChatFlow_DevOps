import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import './PricingPage.css';

const fadeUp = (d = 0) => ({
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut', delay: d } },
});

const PLANS = [
  {
    name: 'Free',
    icon: '🚀',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for personal projects and small teams getting started.',
    color: 'var(--accent-teal)',
    badge: null,
    features: [
      '✅ Up to 10 team members',
      '✅ 5 chat rooms',
      '✅ 10,000 messages history',
      '✅ Basic emoji reactions',
      '✅ File uploads (5MB limit)',
      '✅ Mobile app access',
      '❌ Custom domains',
      '❌ Priority support',
      '❌ Analytics dashboard',
    ],
    cta: 'Start Free →',
    ctaLink: '/register',
    ctaClass: 'btn-ghost',
  },
  {
    name: 'Pro',
    icon: '⚡',
    price: { monthly: 9, yearly: 7 },
    description: 'For growing teams that need more power and collaboration tools.',
    color: 'var(--accent-purple)',
    badge: 'Most Popular',
    features: [
      '✅ Up to 50 team members',
      '✅ Unlimited rooms',
      '✅ Unlimited message history',
      '✅ Full emoji & reactions',
      '✅ File uploads (100MB limit)',
      '✅ Thread replies',
      '✅ Custom notification rules',
      '✅ Priority support (24h)',
      '❌ Analytics dashboard',
    ],
    cta: 'Start 14-day Trial',
    ctaLink: '/register',
    ctaClass: 'btn-primary btn-shimmer',
  },
  {
    name: 'Enterprise',
    icon: '🏢',
    price: { monthly: 29, yearly: 24 },
    description: 'Full-power plan for large organizations with custom requirements.',
    color: '#f59e0b',
    badge: null,
    features: [
      '✅ Unlimited members',
      '✅ Unlimited rooms',
      '✅ Unlimited history',
      '✅ Full emoji & reactions',
      '✅ File uploads (1GB limit)',
      '✅ Thread replies & mentions',
      '✅ Analytics dashboard',
      '✅ Custom domain & SSO',
      '✅ Dedicated support (2h SLA)',
    ],
    cta: 'Contact Sales',
    ctaLink: '/about',
    ctaClass: 'btn-ghost',
  },
];

const FAQ = [
  { q: 'Can I switch plans at any time?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately on upgrades, and at the end of your billing cycle on downgrades.' },
  { q: 'Is the Free plan really free forever?', a: 'Absolutely. Our Free plan has no time limit. We believe in open communication for all teams.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) as well as PayPal and bank transfers for Enterprise plans.' },
  { q: 'Do you offer refunds?', a: 'Yes — we offer a 30-day money-back guarantee for all paid plans, no questions asked.' },
  { q: 'Is my data secure?', a: 'We use end-to-end encryption, bcrypt password hashing, JWT tokens, and host on AWS with SOC 2 Type II compliance.' },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  return (
    <div className="pricing-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="pricing-hero">
        <div className="pricing-hero__orb pricing-hero__orb--1" />
        <div className="pricing-hero__orb pricing-hero__orb--2" />
        <div className="section-container">
          <motion.div
            className="pricing-hero__content"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ PRICING</motion.p>
            <motion.h1 variants={fadeUp(0.05)} className="pricing-hero__title">
              Simple, transparent{' '}
              <span className="gradient-text">pricing</span>
            </motion.h1>
            <motion.p variants={fadeUp(0.1)} className="pricing-hero__sub">
              Start for free. Scale as you grow. No hidden fees, no lock-in.
            </motion.p>

            {/* Toggle */}
            <motion.div variants={fadeUp(0.15)} className="pricing-toggle">
              <span className={!yearly ? 'pricing-toggle__label--active' : 'pricing-toggle__label'}>Monthly</span>
              <button
                className={`pricing-toggle__switch ${yearly ? 'pricing-toggle__switch--on' : ''}`}
                onClick={() => setYearly(!yearly)}
                aria-label="Toggle yearly billing"
              >
                <span className="pricing-toggle__thumb" />
              </button>
              <span className={yearly ? 'pricing-toggle__label--active' : 'pricing-toggle__label'}>
                Yearly
                <span className="pricing-toggle__save">Save 20%</span>
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="pricing-plans">
        <div className="section-container">
          <div className="plans__grid">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`plan-card ${plan.badge ? 'plan-card--featured' : ''}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                style={{ '--plan-color': plan.color }}
              >
                {plan.badge && <div className="plan-card__badge">{plan.badge}</div>}
                <div className="plan-card__icon">{plan.icon}</div>
                <h3 className="plan-card__name">{plan.name}</h3>
                <div className="plan-card__price">
                  <span className="plan-card__currency">$</span>
                  <span className="plan-card__amount">
                    {yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="plan-card__period">/{yearly ? 'mo·billed annually' : 'month'}</span>
                  )}
                  {plan.price.monthly === 0 && (
                    <span className="plan-card__period">forever</span>
                  )}
                </div>
                <p className="plan-card__desc">{plan.description}</p>
                <Link to={plan.ctaLink} className={`btn ${plan.ctaClass} plan-card__cta`}>
                  {plan.cta}
                </Link>
                <ul className="plan-card__features">
                  {plan.features.map((f) => (
                    <li key={f} className={`plan-card__feature ${f.startsWith('❌') ? 'plan-card__feature--no' : ''}`}>
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pricing-faq">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ FAQ</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              Frequently asked <span className="gradient-text">questions</span>
            </motion.h2>
          </motion.div>

          <div className="faq__list">
            {FAQ.map((item, i) => (
              <motion.div
                key={i}
                className={`faq__item ${faqOpen === i ? 'faq__item--open' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <button className="faq__question" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  {item.q}
                  <span className="faq__chevron">{faqOpen === i ? '−' : '+'}</span>
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      className="faq__answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {item.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
