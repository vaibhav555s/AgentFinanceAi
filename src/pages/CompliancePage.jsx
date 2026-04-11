import { useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, FileText, Lock, Eye, Scale, CheckCircle,
  AlertTriangle, BookOpen, Globe, Download, Search,
  ChevronDown, ChevronUp, ExternalLink, Activity,
  Clock, Database, Server, Key, Layers, Filter,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeItem = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function Section({ children, className = '', style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─── Data ───────────────────────────────────────────── */
const FRAMEWORKS = [
  {
    icon: Scale,
    title: 'RBI Digital Lending Guidelines',
    status: 'compliant',
    badge: 'Compliant',
    version: 'DL Guidelines 2022',
    last: 'Mar 2026',
    description: 'Fully aligned with RBI Digital Lending Guidelines 2022. Fair Practice Code, grievance redressal, and FLDG framework requirements met.',
    checks: ['Fair lending disclosures', 'Annual Percentage Rate display', 'Cooling-off period enforced', 'Grievance officer appointed'],
  },
  {
    icon: ShieldCheck,
    title: 'KYC / AML Compliance',
    status: 'compliant',
    badge: 'Active',
    version: 'PMLA 2002 + 2023 Amendments',
    last: 'Apr 2026',
    description: 'Video KYC (V-KYC) complies with RBI master direction on KYC. AML screening uses FATF watchlists and PEP databases.',
    checks: ['Video KYC per RBI MD/KYC/2016', 'PEP & sanctions screening', 'UBO identification', 'STR filing capability'],
  },
  {
    icon: Lock,
    title: 'Data Privacy (DPDPA 2023)',
    status: 'compliant',
    badge: 'Certified',
    version: 'DPDPA 2023 + ISO 27001',
    last: 'Feb 2026',
    description: 'DPDPA 2023 consent management, data minimization, and right-to-erasure workflows. ISO 27001:2022 certification in progress.',
    checks: ['Explicit consent capture', 'Data minimization enforced', 'Right to erasure API', 'Data localisation in India'],
  },
  {
    icon: Eye,
    title: 'Liveness & Fraud Detection',
    status: 'monitoring',
    badge: 'Live',
    version: 'face-api.js v0.22 + Custom ML',
    last: 'Apr 2026',
    description: 'Real-time 3D liveness detection, deepfake identification, device fingerprinting and velocity checks run on every session.',
    checks: ['3D liveness score > 0.85', 'Deepfake detection model', 'Device risk scoring', 'Session velocity limits'],
  },
  {
    icon: FileText,
    title: 'Audit Logs & Record Keeping',
    status: 'compliant',
    badge: 'Enabled',
    version: 'Immutable append-only store',
    last: 'Apr 2026',
    description: 'Every AI decision, transcript line, document capture, and consent event is logged to an immutable audit trail retained for 7 years.',
    checks: ['Session recordings archived', 'AI decision trace logging', 'Consent hash stored (SHA-256)', '7-year retention policy'],
  },
  {
    icon: Globe,
    title: 'GDPR & International',
    status: 'compliant',
    badge: 'Compliant',
    version: 'GDPR Art. 17 + SCCs',
    last: 'Jan 2026',
    description: 'For NRI and overseas applicant data: GDPR-compliant consent, Standard Contractual Clauses for cross-border transfers.',
    checks: ['Lawful basis documented', 'DPA registered (if applicable)', 'SCCs in place', 'Privacy Impact Assessment done'],
  },
];

const AUDIT_LOGS = [
  { id: 'AUD-0892', event: 'Consent Captured',      session: 'AF-7825', actor: 'AI Agent',     severity: 'info',    time: '14:32:08' },
  { id: 'AUD-0891', event: 'Offer Accepted',         session: 'AF-7825', actor: 'Priya Sharma', severity: 'success', time: '14:31:50' },
  { id: 'AUD-0890', event: 'Credit Bureau Pull',     session: 'AF-7825', actor: 'System',       severity: 'info',    time: '14:29:18' },
  { id: 'AUD-0889', event: 'Liveness Verified',      session: 'AF-7825', actor: 'face-api.js',  severity: 'success', time: '14:29:02' },
  { id: 'AUD-0888', event: 'Fraud Flag — High Risk', session: 'AF-7822', actor: 'fraud-api',    severity: 'error',   time: '14:30:45' },
  { id: 'AUD-0887', event: 'Document Mismatch',      session: 'AF-7822', actor: 'ocr-engine',   severity: 'error',   time: '14:31:02' },
  { id: 'AUD-0886', event: 'Session Started',        session: 'AF-7824', actor: 'System',       severity: 'info',    time: '14:28:01' },
  { id: 'AUD-0885', event: 'KYC Extraction Done',    session: 'AF-7823', actor: 'AI Agent',     severity: 'success', time: '14:15:44' },
  { id: 'AUD-0884', event: 'Consent Captured',       session: 'AF-7823', actor: 'AI Agent',     severity: 'info',    time: '14:15:22' },
  { id: 'AUD-0883', event: 'Offer Accepted',         session: 'AF-7823', actor: 'Anita Desai',  severity: 'success', time: '14:14:58' },
];

const sevCfg = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  dot: '#10B981', label: 'OK'    },
  info:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  dot: '#3B82F6', label: 'Info'  },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   dot: '#EF4444', label: 'Alert' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  dot: '#F59E0B', label: 'Warn'  },
};

/* ─── Framework Card ─────────────────────────────────── */
function FrameworkCard({ framework }) {
  const [expanded, setExpanded] = useState(false);
  const sc = framework.status === 'compliant'
    ? { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', dot: 'bg-emerald-400' }
    : { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', dot: 'bg-amber-400' };
  const Icon = framework.icon;

  return (
    <motion.div
      variants={fadeItem}
      className="glass-card overflow-hidden"
      style={{
        borderRadius: 14,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
    >
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)' }}
          >
            <Icon size={18} style={{ color: '#3B82F6' }} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
            >
              <div className={`w-1 h-1 rounded-full ${sc.dot}`} />
              {framework.badge}
            </span>
            {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
          {framework.title}
        </h3>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{framework.version}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>• Last verified: {framework.last}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {framework.description}
        </p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-5 pb-5 pt-1"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10, marginTop: 12 }}>
                COMPLIANCE CHECKPOINTS
              </div>
              <div className="flex flex-col gap-2">
                {framework.checks.map(c => (
                  <div key={c} className="flex items-center gap-2">
                    <CheckCircle size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Data Residency Card ────────────────────────────── */
function DataResidencyCard() {
  const items = [
    { icon: Server,   label: 'Primary Region',     value: 'Mumbai (ap-south-1)',    status: 'Active'  },
    { icon: Database, label: 'Database',            value: 'Encrypted at rest AES-256', status: 'Active' },
    { icon: Key,      label: 'TLS Version',         value: 'TLS 1.3',               status: 'Active'  },
    { icon: Layers,   label: 'Data Sovereignty',    value: 'India — DPDPA 2023',    status: 'Active'  },
    { icon: Lock,     label: 'Consent Store',       value: 'SHA-256 immutable log', status: 'Active'  },
    { icon: Clock,    label: 'Retention Period',    value: '7 years (RBI mandate)', status: 'Policy'  },
  ];
  return (
    <motion.div variants={fadeItem} className="glass-card p-6" style={{ borderRadius: 14 }}>
      <div className="flex items-center gap-2 mb-5">
        <Server size={16} style={{ color: '#3B82F6' }} />
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Data Residency & Security
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => {
          const I = item.icon;
          return (
            <div key={item.label} className="glass-card p-3" style={{ borderRadius: 10 }}>
              <div className="flex items-center gap-2 mb-1.5">
                <I size={13} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{item.label.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Compliance Score Widget ────────────────────────── */
function ComplianceScore() {
  const score = 94;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <motion.div variants={fadeItem} className="glass-card p-6" style={{ borderRadius: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 16 }}>OVERALL COMPLIANCE SCORE</div>
      <div className="flex items-center gap-6">
        {/* SVG ring */}
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="60" cy="60" r={radius}
              stroke="url(#scoreGrad)" strokeWidth="8" fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - dash }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{score}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>5 of 6 frameworks fully compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>1 framework under active monitoring</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color: '#3B82F6' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Last audit: March 2026</span>
          </div>
          <div
            className="mt-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10B981',
            }}
          >
            Next full audit scheduled: June 2026
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function CompliancePage() {
  const navigate = useNavigate();
  const [logFilter, setLogFilter] = useState('all');

  const filteredLogs = logFilter === 'all'
    ? AUDIT_LOGS
    : AUDIT_LOGS.filter(l => l.severity === logFilter);

  function downloadLogs() {
    const csv = ['ID,Event,Session,Actor,Severity,Time', ...AUDIT_LOGS.map(l =>
      `${l.id},"${l.event}",${l.session},${l.actor},${l.severity},${l.time}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', paddingTop: 80 }}>
      {/* Ambient orb */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, top: '-100px', left: '-100px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, bottom: '-80px', right: '10%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <Section>
          <motion.div variants={fadeItem} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
                  >
                    <ShieldCheck size={17} style={{ color: '#10B981' }} />
                  </div>
                  <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Compliance Center
                  </h1>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480 }}>
                  Real-time regulatory compliance status, audit trails, and risk framework monitoring for AgentFinance AI.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadLogs}
                  className="btn-outline flex items-center gap-2 text-xs px-4 py-2"
                  style={{ height: 36 }}
                >
                  <Download size={13} /> Export Logs
                </button>
                <button
                  onClick={() => navigate('/ops')}
                  className="btn-outline flex items-center gap-2 text-xs px-4 py-2"
                  style={{ height: 36 }}
                >
                  <ExternalLink size={13} /> Ops Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </Section>

        {/* Status banner */}
        <Section className="mb-6">
          <motion.div
            variants={fadeItem}
            className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.04) 100%)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 14,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CheckCircle size={22} style={{ color: '#10B981' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                  Overall Compliance Status: Operational
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Last full audit: March 2026 · Next scheduled review: June 2026 · Auditor: EY India
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>All Systems Green</span>
            </div>
          </motion.div>
        </Section>

        {/* Score + Data Residency */}
        <Section className="mb-6">
          <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComplianceScore />
            <DataResidencyCard />
          </motion.div>
        </Section>

        {/* Frameworks */}
        <Section className="mb-8">
          <motion.div variants={fadeItem} className="flex items-center gap-2 mb-5">
            <BookOpen size={16} style={{ color: '#3B82F6' }} />
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              Regulatory Frameworks
            </h2>
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              {FRAMEWORKS.length} frameworks
            </span>
          </motion.div>
          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {FRAMEWORKS.map(f => <FrameworkCard key={f.title} framework={f} />)}
          </motion.div>
        </Section>

        {/* Audit Logs */}
        <Section className="mb-8">
          <motion.div variants={fadeItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} style={{ color: '#3B82F6' }} />
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
                Audit Log
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter pills */}
              {['all', 'success', 'info', 'error'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className="glass-pill px-3 py-1.5 text-[11px] font-medium transition-all duration-150"
                  style={{
                    color: logFilter === f ? '#3B82F6' : 'var(--text-muted)',
                    borderColor: logFilter === f ? 'rgba(59,130,246,0.4)' : 'var(--border-subtle)',
                    background: logFilter === f ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button
                onClick={downloadLogs}
                className="glass-pill p-2 transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
                title="Export CSV"
              >
                <Download size={13} />
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeItem} className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Log ID', 'Event', 'Session', 'Actor', 'Severity', 'Timestamp'].map(h => (
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
                  <AnimatePresence>
                    {filteredLogs.map((log, i) => {
                      const sc = sevCfg[log.severity] || sevCfg.info;
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          style={{
                            borderBottom: i < filteredLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td className="px-5 py-3.5" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.id}</td>
                          <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{log.event}</td>
                          <td className="px-5 py-3.5" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.session}</td>
                          <td className="px-5 py-3.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.actor}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40` }}
                            >
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {log.time}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </Section>

        {/* Notice */}
        <Section className="pb-12">
          <motion.div
            variants={fadeItem}
            className="glass-card p-5 flex items-start gap-4"
            style={{ border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.03)', borderRadius: 14 }}
          >
            <ShieldCheck size={18} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Full Compliance Suite — Roadmap
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upcoming in V2: Real-time regulator export portal, automated STR generation, integrated CKYC sync,
                and live DSA compliance monitoring. Built to meet NBFC and Scheduled Bank requirements under the
                RBI Digital Lending Guidelines. Reach out at compliance@agentfinance.ai for queries.
              </p>
            </div>
          </motion.div>
        </Section>
      </div>
    </div>
  );
}
