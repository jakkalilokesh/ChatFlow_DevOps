import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import './AboutPage.css';

const fadeUp = (d = 0) => ({
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut', delay: d } },
});

const TEAM = [
  { name: 'Lokesh Jakkali', role: 'Founder & Full-Stack Dev', avatar: '👨‍💻', bio: 'Architected ChatFlow from the ground up — frontend, backend, DevOps, and everything in between.' },
  { name: 'Priya Sharma',   role: 'Lead UI/UX Designer',      avatar: '👩‍🎨', bio: 'Crafted the glassmorphism design system and obsessed over every pixel of the user experience.' },
  { name: 'Ravi Patel',     role: 'DevOps Engineer',          avatar: '🧑‍🔧', bio: 'Owns the Kubernetes infrastructure, CI/CD pipelines, and keeps the 99.9% SLA alive.' },
];

const TECH_STACK = [
  { category: 'Frontend',  items: ['React 18', 'Framer Motion', 'Socket.io Client', 'CSS Variables'] },
  { category: 'Backend',   items: ['Node.js 18', 'Express 4', 'Socket.io 4', 'JWT Auth'] },
  { category: 'Databases', items: ['PostgreSQL 15', 'MongoDB 6', 'Redis 7'] },
  { category: 'DevOps',    items: ['Docker', 'Kubernetes (k3s)', 'Terraform', 'Jenkins CI/CD'] },
  { category: 'Cloud',     items: ['AWS EC2', 'AWS S3', 'AWS ECR', 'AWS IAM'] },
  { category: 'Monitoring',items: ['Prometheus', 'Grafana', 'Loki', 'Alertmanager'] },
];

const MILESTONES = [
  { year: '2024 Q1', title: 'Project Kickoff',      desc: 'Started as a weekend project to build the perfect team chat tool.' },
  { year: '2024 Q2', title: 'Core Chat Engine',     desc: 'Launched real-time messaging, rooms, and basic auth using Socket.io.' },
  { year: '2024 Q3', title: 'Reactions & Threads',  desc: 'Added emoji reactions, reply threads, and typing indicators.' },
  { year: '2024 Q4', title: 'DevOps Edition',       desc: 'Containerised everything with Docker, Kubernetes, Terraform, and Jenkins.' },
  { year: '2025 Q1', title: 'Public Beta Launch',   desc: 'Opened to the public. 10,000+ users in the first month.' },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero__orb about-hero__orb--1" />
        <div className="about-hero__orb about-hero__orb--2" />
        <div className="section-container">
          <motion.div
            className="about-hero__content"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ OUR STORY</motion.p>
            <motion.h1 variants={fadeUp(0.05)} className="about-hero__title">
              Built by developers,{' '}
              <span className="gradient-text">for everyone</span>
            </motion.h1>
            <motion.p variants={fadeUp(0.1)} className="about-hero__sub">
              ChatFlow was born from frustration with bloated, slow communication tools.
              We set out to build something fast, beautiful, and open — and we're just getting started.
            </motion.p>
            <motion.div variants={fadeUp(0.15)} className="about-hero__btns">
              <Link to="/register" className="btn btn-primary btn-shimmer">Join the Beta 🚀</Link>
              <Link to="/pricing"  className="btn btn-ghost">View Pricing</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="about-mission">
        <div className="section-container">
          <div className="mission__grid">
            <motion.div
              className="mission__card"
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mission__card-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>To make real-time team communication fast, beautiful, and accessible to every team on the planet — regardless of size or budget.</p>
            </motion.div>
            <motion.div
              className="mission__card"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="mission__card-icon">👁️</div>
              <h3>Our Vision</h3>
              <p>A world where every team, startup, and community has access to enterprise-grade communication tools without the enterprise price tag.</p>
            </motion.div>
            <motion.div
              className="mission__card"
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="mission__card-icon">💡</div>
              <h3>Our Values</h3>
              <p>Speed, transparency, developer-first design, and radical openness. We build in public and ship code we're proud of.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="about-tech" id="tech">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ TECHNOLOGY</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              Built on a <span className="gradient-text">rock-solid stack</span>
            </motion.h2>
            <motion.p variants={fadeUp(0.15)} className="section-sub">
              Every technology choice was made intentionally — for performance, reliability, and developer happiness.
            </motion.p>
          </motion.div>

          <div className="tech__grid">
            {TECH_STACK.map((group, i) => (
              <motion.div
                key={group.category}
                className="tech__card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <h4 className="tech__card-title">{group.category}</h4>
                <div className="tech__tags">
                  {group.items.map((item) => (
                    <span key={item} className="tech__tag">{item}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="about-timeline">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ JOURNEY</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              Our <span className="gradient-text">milestones</span>
            </motion.h2>
          </motion.div>

          <div className="timeline">
            {MILESTONES.map((m, i) => (
              <motion.div
                key={m.year}
                className={`timeline__item ${i % 2 === 0 ? 'timeline__item--left' : 'timeline__item--right'}`}
                initial={{ opacity: 0, x: i % 2 === 0 ? -32 : 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
              >
                <div className="timeline__dot" />
                <div className="timeline__card">
                  <span className="timeline__year">{m.year}</span>
                  <h4 className="timeline__title">{m.title}</h4>
                  <p className="timeline__desc">{m.desc}</p>
                </div>
              </motion.div>
            ))}
            <div className="timeline__line" />
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="about-team">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp(0)} className="section-label">✦ THE TEAM</motion.p>
            <motion.h2 variants={fadeUp(0.1)} className="section-title">
              The people behind <span className="gradient-text">ChatFlow</span>
            </motion.h2>
          </motion.div>

          <div className="team__grid">
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                className="team__card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -8 }}
              >
                <div className="team__avatar">{member.avatar}</div>
                <h3 className="team__name">{member.name}</h3>
                <p className="team__role">{member.role}</p>
                <p className="team__bio">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta">
        <div className="section-container">
          <motion.div
            className="about-cta__card"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="about-cta__title">
              Ready to experience ChatFlow?
            </h2>
            <p className="about-cta__sub">Join 10,000+ teams. Start for free, no credit card needed.</p>
            <div className="about-cta__btns">
              <Link to="/register" className="btn btn-primary btn-shimmer" style={{ padding: '14px 36px' }}>
                Get Started Free ✨
              </Link>
              <Link to="/pricing" className="btn btn-ghost" style={{ padding: '14px 28px' }}>
                View Pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
