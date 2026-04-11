import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { fetchPipelineMetrics } from '../services/dbService';
import {
  LayoutDashboard, Radio, AlertTriangle, FileText, Shield,
  Zap, CheckCircle, TrendingUp, TrendingDown, MessageSquare,
  Clock, XCircle, User, Activity, Search, Filter, Download,
  Eye, ShieldCheck, ChevronRight, Circle, BarChart2,
} from 'lucide-react';

/* ─── Mock data ──────────────────────────────────────── */






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


function useOpsData() {
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [flags, setFlags] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [{data: sData}, {data: eData}, {data: fData}, mData] = await Promise.all([
        supabase.from('loan_applications').select('*, profiles(name, phone)').order('updated_at', { ascending: false }),
        supabase.from('application_events').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('regulatory_flags').select('*').order('created_at', { ascending: false }),
        fetchPipelineMetrics()
      ]);
      setSessions(sData || []);
      setEvents(eData || []);
      setFlags(fData || []);
      setMetrics(mData);
    };
    fetchAll();

    const channel = supabase.channel('ops_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_applications' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'application_events' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulatory_flags' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { sessions, events, flags, metrics };
}

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
function OverviewSection({ data }) {
  const { sessions, events, flags, metrics } = data;
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
        <StatCard label="Active Sessions" value={sessions.filter(s => s.status === "live").length} icon={Radio} iconColor="#3B82F6"
          trend={`${sessions.filter(s => s.status === "live").length} live now`} trendIcon={Radio} trendColor="#3B82F6" />
        <StatCard label="Fraud Flags" value={flags.filter(f => f.severity === "high").length} icon={ShieldCheck} iconColor="#10B981"
          trend={flags.filter(f => f.severity === "high").length === 0 ? "All clear" : "Action needed"} trendIcon={CheckCircle} trendColor="#10B981" />
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
              {events.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: entry.event === 'ai_response' ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: entry.event === 'ai_response' ? '#3B82F6' : '#64748B',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600,
                        color: entry.role === 'ai' ? '#3B82F6' : 'var(--text-secondary)',
                      }}
                    >
                      {entry.event === 'ai_response' ? 'AI Agent' : 'System/User'}
                    </span>
                    <span className="ml-auto" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{new Date(entry.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, paddingLeft: 10 }}>
                    {entry.metadata?.text || entry.event}
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
                <div className={`w-1.5 h-1.5 rounded-full ${sessions.find(s => s.is_active_session) ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
                <span style={{ fontSize: 10, color: sessions.find(s => s.is_active_session) ? '#3B82F6' : 'var(--text-muted)' }}>
                  {sessions.find(s => s.is_active_session) ? 'LIVE' : 'STANDBY'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto ops-scroll px-4 py-4 flex flex-col gap-4">
              {/* Applicant */}
              {(() => {
                const latest = sessions[0] || {};
                return (
                  <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>LATEST ACTIVITY</div>
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{latest.profiles?.name || 'Waiting for connection...'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{latest.id ? `#${latest.id.slice(0, 8)}` : 'No active sessions'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Stage progress */}
              {(() => {
                const latest = sessions[0];
                if (!latest) return null;
                const stages = ['kyc', 'bureau', 'offer', 'completed'];
                const currentIdx = stages.indexOf(latest.application_stage);
                return (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>STAGE PROGRESS</div>
                    <div className="flex flex-col gap-2">
                      {['KYC Extraction', 'Bureau Check', 'Loan Offer', 'Disbursement'].map((s, i) => (
                        <div key={s} className="flex items-center gap-2.5">
                          <div
                            style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              background: i < currentIdx ? 'rgba(16,185,129,0.2)' : i === currentIdx ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                              border: i < currentIdx ? '1px solid rgba(16,185,129,0.4)' : i === currentIdx ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {i < currentIdx
                              ? <CheckCircle size={10} style={{ color: '#10B981' }} />
                              : i === currentIdx
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
                                width: i < currentIdx ? '100%' : i === currentIdx ? '40%' : '0%',
                                background: i < currentIdx ? '#10B981' : '#3B82F6',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: i === currentIdx ? 'var(--text-primary)' : i < currentIdx ? '#10B981' : 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Session timer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>SESSION TIME</div>
                  <SessionTimer />
                </div>
                <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>CREDIT SCORE</div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#10B981' }}>{sessions[0]?.bureau_score || '0'}</div>
                </div>
              </div>

              {/* Risk gauge */}
              {(() => {
                const latest = sessions[0] || {};
                const score = latest.fraud_risk_score || 0;
                const label = score > 60 ? 'High' : score > 30 ? 'Medium' : 'Low';
                const color = score > 60 ? '#EF4444' : score > 30 ? '#F59E0B' : '#10B981';
                return (
                  <div className="glass-card p-3" style={{ borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>AI RISK SCORE</div>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 13, fontWeight: 700, color: color }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{score} / 100</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                        style={{ height: '100%', background: `linear-gradient(to right, #10B981, ${color})`, borderRadius: 3 }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Low risk</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>High risk</span>
                    </div>
                  </div>
                );
              })()}
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
function LiveSessionsSection({ data }) {
  const { sessions } = data;
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
              {sessions.map((s, i) => {
                const sc = statusCfg[s.status] || statusCfg.live;
                const rc = riskCfg[s.fraud_risk_score > 60 ? 'high' : s.fraud_risk_score > 30 ? 'medium' : 'low'] || riskCfg.low;
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
                    <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.profiles?.name || 'Unknown'}</td>
                    <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.metadata?.amount || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontSize: 13, fontWeight: 700, color: (s.fraud_risk_score||0) < 30 ? '#10B981' : (s.fraud_risk_score||0) < 60 ? '#F59E0B' : '#EF4444' }}>
                        {s.fraud_risk_score || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontSize: 11, fontWeight: 600, color: rc.color }}>{rc.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div style={{ height: 4, width: 60, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(['kyc','bureau','offer','completed'].indexOf(s.application_stage) + 1)/4 * 100}%`, background: '#3B82F6', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.application_stage}</span>
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
function FraudSignalsSection({ data }) {
  const { flags } = data;
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
      {(() => {
        const counts = { low: 0, medium: 0, high: 0, clear: 0 };
        sessions.forEach(s => {
          const score = s.fraud_risk_score || 0;
          if (score === 0) counts.clear++;
          else if (score > 60) counts.high++;
          else if (score > 30) counts.medium++;
          else counts.low++;
        });

        const activeDistrib = [
          { label: 'No Risk',  count: counts.clear,  color: '#10B981' },
          { label: 'Low',      count: counts.low,    color: '#3B82F6'  },
          { label: 'Medium',   count: counts.medium, color: '#F59E0B'  },
          { label: 'High',     count: counts.high,   color: '#EF4444'  },
        ];
        const activeTotal = sessions.length || 1;

        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {activeDistrib.map(d => (
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
                    animate={{ width: `${(d.count / activeTotal) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    style={{ height: '100%', background: d.color, borderRadius: 2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Events table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Fraud Events
          </span>
        </div>
        <div className="flex flex-col">
          {flags.map((f, i) => {
            const sc = sevCfg[f.severity] || sevCfg.clear;
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.flag_type}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{f.application_id}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.description}</p>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(f.created_at).toLocaleTimeString()}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Transcripts section ────────────────────────────── */
function TranscriptsSection({ data }) {
  const { sessions, events } = data;
  /*
    { id: 'AF-7825', name: 'Priya Sharma',  date: 'Today, 14:10', duration: '2m 41s', status: 'approved', lines: 22 },
    { id: 'AF-7823', name: 'Anita Desai',   date: 'Today, 13:48', duration: '3m 05s', status: 'approved', lines: 18 },
    { id: 'AF-7821', name: 'Sunita Rao',    date: 'Today, 12:30', duration: '3m 50s', status: 'approved', lines: 25 },
    { id: 'AF-7820', name: 'Arjun Patel',   date: 'Today, 11:14', duration: '4m 22s', status: 'approved', lines: 28 },
    { id: 'AF-7819', name: 'Meera Gupta',   date: 'Today, 10:55', duration: '1m 55s', status: 'pending',  lines: 12 },
    { id: 'AF-7822', name: 'Vikram Nair',   date: 'Today, 10:02', duration: '2m 18s', status: 'rejected', lines: 14 },
  */
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
          const sc = statusCfg[s.status] || statusCfg.live || statusCfg['approved'];
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.profiles?.name || 'Unknown'}</div>
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
                <span>{new Date(s.created_at).toLocaleString()}</span>
                <span>Live</span>
                <span></span>
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
  const opsData = useOpsData();

  // Prevent body overflow
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

    const sections = {
    overview:    <OverviewSection data={opsData} />,
    live:        <LiveSessionsSection data={opsData} />,
    fraud:       <FraudSignalsSection data={opsData} />,
    transcripts: <TranscriptsSection data={opsData} />,
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
