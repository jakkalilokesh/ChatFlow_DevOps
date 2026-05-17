import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function StatCard({ icon, label, value, trend, trendLabel, color }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (end === 0) return;
    const step = Math.ceil(end / 40);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ translateY: -4, boxShadow: `0 16px 40px ${color}20` }}
      style={{
        background: 'var(--bg-card, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderLeft: `4px solid ${color}`,
        borderRadius: 16, padding: '20px 24px',
        transition: 'all 0.3s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>{icon} {label}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {count.toLocaleString()}
          </p>
        </div>
        {trend && (
          <span style={{
            fontSize: 12, padding: '4px 8px', borderRadius: 20, fontWeight: 600,
            background: trend > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: trend > 0 ? '#10b981' : '#ef4444',
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function MembersTable({ members }) {
  const ROLE_COLORS = { owner: '#f59e0b', admin: '#8b5cf6', moderator: '#3b82f6', member: '#6b7280' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['User', 'Role', 'Messages', 'Status', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(members || []).map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 700 }}>
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{m.username}</span>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ background: `${ROLE_COLORS[m.role] || '#6b7280'}20`, color: ROLE_COLORS[m.role] || '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {m.role}
                </span>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 14 }}>{m.messageCount || 0}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.isOnline ? '#10b981' : '#6b7280', display: 'inline-block', marginRight: 6 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.isOnline ? 'Online' : 'Offline'}</span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <button style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  Kick
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  background: 'rgba(15,20,40,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#f9fafb',
  fontSize: 12,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalMessages: 0, storageUsed: 0 });
  const [msgOverTime, setMsgOverTime] = useState([]);
  const [topChannels, setTopChannels] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [members, setMembers] = useState([]);
  const [msgTypes, setMsgTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, msgRes, channelsRes, growthRes, membersRes] = await Promise.allSettled([
        api.get('/api/admin/stats'),
        api.get('/api/admin/messages-over-time?days=30'),
        api.get('/api/admin/top-channels'),
        api.get('/api/admin/user-growth'),
        api.get('/api/admin/members'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (msgRes.status === 'fulfilled') setMsgOverTime(msgRes.value.data.data || []);
      if (channelsRes.status === 'fulfilled') setTopChannels(channelsRes.value.data.channels || []);
      if (growthRes.status === 'fulfilled') setUserGrowth(growthRes.value.data.data || []);
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value.data.members || []);

      setMsgTypes([
        { name: 'Text', value: 68 },
        { name: 'Images', value: 18 },
        { name: 'Voice', value: 8 },
        { name: 'Files', value: 6 },
      ]);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const cardStyle = {
    background: 'var(--bg-card, rgba(255,255,255,0.04))',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    borderRadius: 16, padding: 24,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0a0f1e)' }}>
      <Navbar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '100px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📊 Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Real-time workspace analytics</p>
        </div>

        {/* Stat Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <StatCard icon="👥" label="Total Users" value={stats.totalUsers} trend={12} trendLabel="vs last week" color="#8b5cf6" />
          <StatCard icon="🟢" label="Active Today" value={stats.activeToday} trend={8} trendLabel="vs yesterday" color="#10b981" />
          <StatCard icon="💬" label="Total Messages" value={stats.totalMessages} trend={-3} trendLabel="vs last week" color="#3b82f6" />
          <StatCard icon="💾" label="Storage (MB)" value={stats.storageUsed || 0} color="#f59e0b" />
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Messages Over Time (30 days)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={msgOverTime.length ? msgOverTime : Array.from({ length: 30 }, (_, i) => ({ date: `Day ${i+1}`, count: Math.floor(Math.random() * 500 + 100) }))}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#msgGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Message Types</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={msgTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {msgTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Top Channels by Activity</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topChannels.length ? topChannels : Array.from({ length: 8 }, (_, i) => ({ channel: `#channel-${i+1}`, messageCount: Math.floor(Math.random() * 1000 + 100) }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis type="category" dataKey="channel" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="messageCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>User Growth</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={userGrowth.length ? userGrowth : Array.from({ length: 30 }, (_, i) => ({ date: `Day ${i+1}`, newUsers: Math.floor(Math.random() * 50 + 5) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Members Table */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Members</h2>
            <button
              id="export-members-csv"
              style={{ fontSize: 12, color: 'var(--accent, #8b5cf6)', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
              onClick={() => toast('CSV export — coming soon!')}
            >
              📥 Export CSV
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Loading members…</div>
          ) : (
            <MembersTable members={members} />
          )}
        </div>
      </div>
    </div>
  );
}
