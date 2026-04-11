import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radio, AlertTriangle, FileText, Shield,
  Zap, CheckCircle, TrendingUp, TrendingDown, MessageSquare,
  Clock, XCircle, User, Activity, Search, Filter, Download,
  Eye, ShieldCheck, ChevronRight, Circle, BarChart2,
} from 'lucide-react';

/* ─── Mock data ──────────────────────────────────────── */
const TRANSCRIPT = [
  { role: 'ai', name: 'AI Agent', msg: 'Hello Rahul, welcome to AgentFinance. I\'m your AI loan officer today. Can you confirm your full name for me?', time: '14:28:01' },
  { role: 'user', name: 'Rahul', msg: 'Yes, my name is Rahul Sharma.', time: '14:28:08' },
  { role: 'ai', name: 'AI Agent', msg: 'Thank you Rahul. Could you tell me your current employment status and monthly income?', time: '14:28:12' },
  { role: 'user', name: 'Rahul', msg: 'I work at a private company, my monthly salary is around 85,000 rupees.', time: '14:28:24' },
  { role: 'ai', name: 'AI Agent', msg: 'Excellent. And what would you primarily use this loan for?', time: '14:28:28' },
  { role: 'user', name: 'Rahul', msg: 'I\'m planning to renovate my home.', time: '14:28:35' },
  { role: 'ai', name: 'AI Agent', msg: 'Understood. How much are you looking to borrow?', time: '14:28:38' },
  { role: 'user', name: 'Rahul', msg: 'Around 3 lakhs would be ideal.', time: '14:28:45' },
  { role: 'ai', name: 'AI Agent', msg: 'Great. Let me now verify your identity. Could you hold up your PAN card to the camera?', time: '14:28:50' },
  { role: 'user', name: 'Rahul', msg: 'Sure, here it is.', time: '14:28:58' },
  { role: 'ai', name: 'AI Agent', msg: 'Perfect, I can see it clearly. Running verification now...', time: '14:29:02' },
  { role: 'ai', name: 'AI Agent', msg: 'Verification complete. Your credit profile looks strong, Rahul.', time: '14:29:18' },
  { role: 'ai', name: 'AI Agent', msg: 'Based on your profile, I\'m pleased to offer you a loan of ₹2,00,000 at 12% per annum.', time: '14:29:25' },
  { role: 'user', name: 'Rahul', msg: 'Can I get a higher amount?', time: '14:29:31' },
  { role: 'ai', name: 'AI Agent', msg: 'I understand. Given your income stability, I can extend up to ₹2,50,000. Would that work?', time: '14:29:40' },
];

const SESSIONS = [
  { id: 'AF-7825', name: 'Priya Sharma',  amount: '₹3.5L', status: 'approved', score: 742, time: '2m 41s', risk: 'low',    stage: 5 },
  { id: 'AF-7824', name: 'Rahul Mehta',   amount: '₹1.2L', status: 'live',     score: 681, time: '4m 12s', risk: 'medium', stage: 2 },
  { id: 'AF-7823', name: 'Anita Desai',   amount: '₹5.0L', status: 'approved', score: 798, time: '3m 05s', risk: 'low',    stage: 5 },
  { id: 'AF-7822', name: 'Vikram Nair',   amount: '₹2.0L', status: 'rejected', score: 524, time: '2m 18s', risk: 'high',   stage: 2 },
  { id: 'AF-7821', name: 'Sunita Rao',    amount: '₹4.2L', status: 'approved', score: 715, time: '3m 50s', risk: 'low',    stage: 5 },
  { id: 'AF-7820', name: 'Arjun Patel',   amount: '₹2.8L', status: 'approved', score: 755, time: '4m 22s', risk: 'low',    stage: 5 },
  { id: 'AF-7819', name: 'Meera Gupta',   amount: '₹1.8L', status: 'pending',  score: 660, time: '1m 55s', risk: 'medium', stage: 3 },
];

const FRAUD_SIGNALS = [
  { session: 'AF-7822', type: 'Document Mismatch',  severity: 'high',   desc: 'PAN card details do not match income declaration', time: '14:31:02' },
  { session: 'AF-7822', type: 'Low Liveness Score', severity: 'high',   desc: 'Face confidence score below threshold (0.61)', time: '14:30:45' },
  { session: 'AF-7824', type: 'Velocity Flag',      severity: 'medium', desc: '3rd application attempt in 24 hours from same device', time: '14:28:55' },
  { session: 'AF-7819', type: 'Age Mismatch',       severity: 'medium', desc: 'Estimated age range 45–52, declared 32', time: '14:27:10' },
  { session: 'AF-7820', type: 'Clear',              severity: 'clear',  desc: 'No fraud signals detected — application clean', time: '14:26:30' },
];

const statusCfg = {
  approved: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, label: 'Approved' },
  live:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: Radio,       label: 'Live' },
  pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock,       label: 'In Review' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: XCircle,     label: 'Rejected' },
};

const riskCfg = {
  low:    { color: '#10B981', label: 'Low'  },
  medium: { color: '#F59E0B', label: 'Med'  },
  high:   { color: '#EF4444', label: 'High' },
};

const sevCfg = {
  high:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   label: 'High'   },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: 'Medium' },
  clear:  { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  label: 'Clear'  },
};

/* ─── Helpers ────────────────────────────────────────── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeItem = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

/* ─── Sidebar ────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'overview',     Icon: LayoutDashboard, label: 'Overview'      },
  { id: 'live',         Icon: Radio,           label: 'Live Sessions', badge: 1 },
  { id: 'fraud',        Icon: AlertTriangle,   label: 'Fraud Signals'  },
  { id: 'transcripts',  Icon: FileText,        label: 'Transcripts'   },
];

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col"
      style={{
        width: 220, flexShrink: 0,
        height: '100%',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={11} style={{ color: '#3B82F6' }} fill="#3B82F6" />
        </div>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          AgentFinance AI
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        {NAV_ITEMS.map(({ id, Icon, label, badge }) => (
          <button
            key={id}
            className={`sidebar-link ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
          >
            <Icon size={15} style={{ color: active === id ? '#3B82F6' : 'var(--text-muted)', flexShrink: 0 }} />
            <span className="flex-1 text-left">{label}</span>
            {badge && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulseGlow 1.5s infinite' }} />
                {badge} live
              </span>
            )}
          </button>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 12px' }} />
        <button
          className="sidebar-link"
          onClick={() => navigate('/compliance')}
        >
          <Shield size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span className="flex-1 text-left">Compliance</span>
          <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Bottom status */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.7)' }} />
          <span style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>All Systems Operational</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>v1.0.0 · Hackathon Build</span>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, iconColor = '#3B82F6', trend, trendIcon: TrendIcon, trendColor = '#10B981' }) {
  return (
    <motion.div variants={fadeItem} className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</span>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && <TrendIcon size={12} style={{ color: trendColor }} />}
          <span style={{ fontSize: 12, color: trendColor }}>{trend}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Overview section ───────────────────────────────── */
function OverviewSection() {
  const transcriptEndRef = useRef(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Stats */}
      <motion.div
        initial="hidden" animate="visible" variants={stagger}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard label="Active Sessions" value="1" icon={Radio} iconColor="#3B82F6"
          trend="1 live now" trendIcon={Radio} trendColor="#3B82F6" />
        <StatCard label="Fraud Flags" value="0" icon={ShieldCheck} iconColor="#10B981"
          trend="All clear" trendIcon={CheckCircle} trendColor="#10B981" />
        <StatCard label="Avg Session Time" value="4:32" icon={Clock} iconColor="#8B5CF6"
          trend="12% faster than avg" trendIcon={TrendingDown} trendColor="#10B981" />
        <StatCard label="Offers Accepted" value="3" icon={CheckCircle} iconColor="#10B981"
          trend="Today" trendIcon={TrendingUp} trendColor="#10B981" />
      </motion.div>

      {/* Live session monitor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-2 mb-4">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.7)', animation: 'pulseGlow 1.5s infinite' }} />
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            Live Session Monitor
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Col 1 — Transcript */}
          <div className="glass-card flex flex-col" style={{ height: 460 }}>
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} style={{ color: '#3B82F6' }} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Live Transcript
                </span>
              </div>
              <div
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                Auto-scrolling
              </div>
            </div>

            <div className="flex-1 overflow-y-auto ops-scroll px-3 py-3 flex flex-col gap-3">
              {TRANSCRIPT.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: entry.role === 'ai' ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: entry.role === 'ai' ? '#3B82F6' : '#64748B',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600,
                        color: entry.role === 'ai' ? '#3B82F6' : 'var(--text-secondary)',
                      }}
                    >
                      {entry.name}
                    </span>
                    <span className="ml-auto" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{entry.time}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, paddingLeft: 10 }}>
                    {entry.msg}
                  </p>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            <div
              className="px-3 pb-3"
              style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, flexShrink: 0 }}
            >
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              >
                Transcript is auto-generated...
              </div>
            </div>
          </div>

          {/* Col 2 — Session Status */}
          <div className="glass-card flex flex-col gap-0" style={{ height: 460, overflow: 'hidden' }}>
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
            >
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: '#3B82F6' }} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Session Status
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span style={{ fontSize: 10, color: '#3B82F6' }}>LIVE</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto ops-scroll px-4 py-4 flex flex-col gap-4">
              {/* Applicant */}
              <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>APPLICANT</div>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(59,130,246,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <User size={15} style={{ color: '#3B82F6' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Rahul Sharma</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Session #AF-7824</div>
                  </div>
                </div>
              </div>

              {/* Stage progress */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>STAGE PROGRESS</div>
                <div className="flex flex-col gap-2">
                  {['KYC Extraction', 'Document Verify', 'Loan Offer', 'Consent', 'Complete'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: i < 2 ? 'rgba(16,185,129,0.2)' : i === 2 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                          border: i < 2 ? '1px solid rgba(16,185,129,0.4)' : i === 2 ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {i < 2
                          ? <CheckCircle size={10} style={{ color: '#10B981' }} />
                          : i === 2
                            ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} />
                            : <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#475569' }} />
                        }
                      </div>
                      <div
                        className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: i < 2 ? '100%' : i === 2 ? '40%' : '0%',
                            background: i < 2 ? '#10B981' : '#3B82F6',
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: i === 2 ? 'var(--text-primary)' : i < 2 ? '#10B981' : 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session timer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>SESSION TIME</div>
                  <SessionTimer />
                </div>
                <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>CREDIT SCORE</div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#10B981' }}>681</div>
                </div>
              </div>

              {/* Risk gauge */}
              <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>RISK SCORE</div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>Medium</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>42 / 100</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '42%' }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                    style={{ height: '100%', background: 'linear-gradient(to right, #10B981, #F59E0B)', borderRadius: 3 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Low risk</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>High risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3 — Fraud & Risk */}
          <div className="glass-card flex flex-col" style={{ height: 460 }}>
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} style={{ color: '#10B981' }} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Fraud & Risk
                </span>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                0 Alerts
              </span>
            </div>

            <div className="flex-1 overflow-y-auto ops-scroll px-4 py-4 flex flex-col gap-3">
              {/* Real-time checks */}
              {[
                { check: 'Liveness Detection', status: 'pass', score: '0.94', note: '32 frames analyzed' },
                { check: 'Document Authenticity', status: 'pass', score: '0.98', note: 'PAN + Aadhaar verified' },
                { check: 'Face Match', status: 'pass', score: '0.89', note: 'ID photo matches live feed' },
                { check: 'Device Fingerprint', status: 'pass', score: '—', note: 'No suspicious patterns' },
                { check: 'CIBIL Bureau Pull', status: 'pass', score: '681', note: 'TransUnion CIBIL v2' },
                { check: 'AML Screening', status: 'pass', score: '—', note: 'Not on watchlist' },
                { check: 'Income Verification', status: 'warn', score: '0.72', note: 'Declared vs estimated delta' },
              ].map((item) => (
                <div key={item.check} className="glass-card p-3" style={{ borderRadius: 10 }}>
                  <div className="flex items-start justify-between mb-1">
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.check}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        color: item.status === 'pass' ? '#10B981' : '#F59E0B',
                        background: item.status === 'pass' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        border: item.status === 'pass' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.25)',
                      }}
                    >
                      {item.status === 'pass' ? '✓ Pass' : '⚠ Warn'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.note}</span>
                    {item.score !== '—' && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: item.status === 'pass' ? '#10B981' : '#F59E0B' }}>
                        {item.score}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Live Sessions ──────────────────────────────────── */
function LiveSessionsSection() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          Session Log
        </h2>
        <div className="flex items-center gap-2">
          <div className="glass-pill flex items-center gap-2 px-3 py-2">
            <Search size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Search sessions...</span>
          </div>
          <button className="glass-pill p-2">
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          <button className="glass-pill p-2">
            <Download size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Session ID', 'Applicant', 'Amount', 'Credit Score', 'Duration', 'Risk', 'Stage', 'Status'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left"
                    style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s, i) => {
                const sc = statusCfg[s.status];
                const rc = riskCfg[s.risk];
                const SI = sc.icon;
                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.id}</td>
                    <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                    <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.amount}</td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.score >= 700 ? '#10B981' : s.score >= 650 ? '#F59E0B' : '#EF4444' }}>
                        {s.score}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.time}</td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontSize: 11, fontWeight: 600, color: rc.color }}>{rc.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div style={{ height: 4, width: 60, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(s.stage / 5) * 100}%`, background: '#3B82F6', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.stage}/5</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40` }}
                      >
                        <SI size={10} />
                        {sc.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Fraud Signals ──────────────────────────────────── */
function FraudSignalsSection() {
  const distrib = [
    { label: 'No Risk',  count: 28, color: '#10B981' },
    { label: 'Low',      count: 12, color: '#3B82F6'  },
    { label: 'Medium',   count: 6,  color: '#F59E0B'  },
    { label: 'High',     count: 2,  color: '#EF4444'  },
  ];
  const total = distrib.reduce((a, b) => a + b.count, 0);

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          Fraud Signals
        </h2>
        <div
          className="glass-pill px-3 py-1.5 flex items-center gap-1.5"
          style={{ fontSize: 12, color: '#10B981' }}
        >
          <ShieldCheck size={12} style={{ color: '#10B981' }} />
          Model: fraud-api v2.1
        </div>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {distrib.map(d => (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{d.label.toUpperCase()} RISK</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: d.color, marginBottom: 8 }}>
              {d.count}
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / total) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                style={{ height: '100%', background: d.color, borderRadius: 2 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Events table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Fraud Events
          </span>
        </div>
        <div className="flex flex-col">
          {FRAUD_SIGNALS.map((f, i) => {
            const sc = sevCfg[f.severity];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4 px-5 py-4"
                style={{ borderBottom: i < FRAUD_SIGNALS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div
                  className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                  style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40` }}
                >
                  {sc.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.type}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{f.session}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{f.time}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Transcripts section ────────────────────────────── */
function TranscriptsSection() {
  const sessions = [
    { id: 'AF-7825', name: 'Priya Sharma',  date: 'Today, 14:10', duration: '2m 41s', status: 'approved', lines: 22 },
    { id: 'AF-7823', name: 'Anita Desai',   date: 'Today, 13:48', duration: '3m 05s', status: 'approved', lines: 18 },
    { id: 'AF-7821', name: 'Sunita Rao',    date: 'Today, 12:30', duration: '3m 50s', status: 'approved', lines: 25 },
    { id: 'AF-7820', name: 'Arjun Patel',   date: 'Today, 11:14', duration: '4m 22s', status: 'approved', lines: 28 },
    { id: 'AF-7819', name: 'Meera Gupta',   date: 'Today, 10:55', duration: '1m 55s', status: 'pending',  lines: 12 },
    { id: 'AF-7822', name: 'Vikram Nair',   date: 'Today, 10:02', duration: '2m 18s', status: 'rejected', lines: 14 },
  ];

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          Session Transcripts
        </h2>
        <div className="flex items-center gap-2">
          <div className="glass-pill flex items-center gap-2 px-3 py-2">
            <Search size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Search transcripts...</span>
          </div>
          <button className="glass-pill px-3 py-2 flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <Download size={13} /> Export All
          </button>
        </div>
      </div>

      <motion.div
        initial="hidden" animate="visible" variants={stagger}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3"
      >
        {sessions.map(s => {
          const sc = statusCfg[s.status] || statusCfg['approved'];
          const SI = sc.icon;
          return (
            <motion.div
              key={s.id}
              variants={fadeItem}
              className="glass-card p-4 cursor-pointer"
              style={{ borderRadius: 12, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.id}</div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40` }}
                >
                  <SI size={9} /> {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{s.date}</span>
                <span>{s.duration}</span>
                <span>{s.lines} lines</span>
                <button
                  className="ml-auto flex items-center gap-1 transition-colors duration-150 hover:text-blue-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Eye size={11} /> View
                </button>
                <button className="flex items-center gap-1 transition-colors duration-150 hover:text-blue-400" style={{ color: 'var(--text-muted)' }}>
                  <Download size={11} /> Export
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ─── Session timer widget ───────────────────────────── */
function SessionTimer() {
  const [secs, setSecs] = useState(252); // 4m 12s
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
      {m}:{String(s).padStart(2, '0')}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function OpsDashboard() {
  const [active, setActive] = useState('overview');

  // Prevent body overflow
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sections = {
    overview:    <OverviewSection />,
    live:        <LiveSessionsSection />,
    fraud:       <FraudSignalsSection />,
    transcripts: <TranscriptsSection />,
  };

  return (
    <div
      style={{
        position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
        display: 'flex', zIndex: 10, overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      <Sidebar active={active} setActive={setActive} />

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto ops-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {sections[active]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
