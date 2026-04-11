import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Lock, User, Shield, Tag,
  CheckCircle, Star, FileText, Upload, Eye, SlidersHorizontal,
  Download, ChevronLeft, ChevronRight, ScanFace, CheckCircle2,
  ShieldCheck, Zap, AlertTriangle, Activity, Cpu, ArrowRight,
  Fingerprint, Banknote, PhoneOff,
} from 'lucide-react';
import useAudioCapture from '../hooks/useAudioCapture.js';
import useAIState from '../hooks/useAIState.js';
import { processVideoFrame } from '../modules/interaction/liveInteraction.js';


/* ─── Helpers ────────────────────────────────────────── */
function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}

function fmtINR(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── Premium Styling Constants ──────────────────────── */
const typography = {
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const colors = {
  bgBase: '#000000',
  bgPanel: '#0A0A0A',
  border: 'rgba(255,255,255,0.08)',
  borderHighlight: 'rgba(255,255,255,0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  accent: '#38BDF8', // Sleek electric blue
  success: '#34D399',
  warning: '#EAB308',
};

const STEPS = [
  { icon: Fingerprint, label: 'IDENTIFY' },
  { icon: ScanFace, label: 'VERIFY' },
  { icon: Banknote, label: 'STRUCTURE' },
  { icon: ShieldCheck, label: 'CONSENT' },
  { icon: CheckCircle2, label: 'DONE' },
];

/* ─── Typewriter ─────────────────────────────────────── */
function Typewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const CAPTIONS = [
    'Synthesizing financial telemetry...',
    'Comparing biometric markers...',
    'Evaluating cryptographic consent...',
    'Structuring optimal capital layout...',
  ];
  const phrase = CAPTIONS[phraseIdx];

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setPhraseIdx(i => (i + 1) % CAPTIONS.length);
        setText(''); setCharIdx(0); setDone(false);
      }, 3500);
      return () => clearTimeout(t);
    }
    if (charIdx < phrase.length) {
      const t = setTimeout(() => {
        setText(phrase.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 35);
      return () => clearTimeout(t);
    } else { setDone(true); }
  }, [charIdx, phrase, done]);

  return (
    <div className="flex items-center gap-3">
      <Activity size={14} style={{ color: colors.accent }} className="animate-pulse" />
      <span style={{ fontSize: 11, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', ...typography }}>
        {text}
        <span
          className="ml-1.5 inline-block"
          style={{ width: 4, height: 12, background: colors.accent, verticalAlign: 'middle', animation: 'pulse 1s infinite' }}
        />
      </span>
    </div>
  );
}

/* ─── Speaking Bars ──────────────────────────────────── */
function SpeakingBars() {
  const bars = Array.from({ length: 12 });
  return (
    <div className="flex items-center gap-[4px] h-10">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: [`${20 + Math.random() * 30}%`, `${60 + Math.random() * 40}%`, `${20 + Math.random() * 30}%`] }}
          transition={{ duration: 0.6 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 3, borderRadius: 999, backgroundColor: colors.accent, opacity: 0.8 }}
        />
      ))}
    </div>
  );
}

/* ─── Confidence Badge ──────────────────────────────── */
function ConfBadge({ level }) {
  const cfg = {
    '99.8%': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    '98.5%': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    '99.1%': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    '94.2%': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    '97.0%': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    '99.9%': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    'High': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    'Medium': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    'Low': { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  }[level] || { color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' };
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {level}
    </span>
  );
}


/* ─── Stage 1 — KYC ──────────────────────────────────── */
function Stage1KYC() {
  const { extractedData } = useAIState();
  const [visible, setVisible] = useState(0);

  const displayValue = (val) => val === null || val === undefined ? 'Pending...' : val;

  const KYC_FIELDS = [
    { label: 'PRIMARY APPLICANT', value: displayValue(extractedData.name.value), conf: (extractedData.name.confidence * 100).toFixed(1) + '%' },
    { label: 'AGE (VIDEO ESTIMATE)', value: extractedData.age.value ? `${extractedData.age.value} Years` : 'Analyzing Video...', conf: (extractedData.age.confidence * 100).toFixed(1) + '%' },
    { label: 'EMPLOYMENT STATUS', value: displayValue(extractedData.employment.value), conf: (extractedData.employment.confidence * 100).toFixed(1) + '%' },
    { label: 'VERIFIED INCOME', value: extractedData.income.value ? fmtINR(extractedData.income.value) : 'Pending...', conf: (extractedData.income.confidence * 100).toFixed(1) + '%' },
    { label: 'PURPOSE OF LOAN', value: displayValue(extractedData.purpose.value), conf: (extractedData.purpose.confidence * 100).toFixed(1) + '%' },
    { label: 'REQUESTED CAPITAL', value: extractedData.loanAmount.value ? fmtINR(extractedData.loanAmount.value) : 'Pending...', conf: (extractedData.loanAmount.confidence * 100).toFixed(1) + '%' },
  ];

  useEffect(() => {
    if (visible < KYC_FIELDS.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 420);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
          Extracting Profile
        </h3>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }}
        />
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>AI is analyzing your responses...</p>

      <div className="flex flex-col gap-2">
        {KYC_FIELDS.map((f, i) => (
          <AnimatePresence key={f.label}>
            {i < visible && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between p-3.5 transition-colors duration-200"
                style={{
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{f.label}</span>
                  <span className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 1 }}>{f.value}</span>
                </div>
                <ConfBadge level={f.conf} />
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {visible >= KYC_FIELDS.length && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}
        >
          Low confidence fields will be re-confirmed
        </motion.p>
      )}
    </div>
  );
}

/* ─── File Upload Zone ───────────────────────────────── */
function UploadZone({ label, file, onFile }) {
  const inputRef = useRef(null);
  return (
    <div
      className="flex flex-col items-center gap-3 p-5 cursor-pointer transition-all duration-300"
      style={{
        borderRadius: 12,
        border: file ? `1px solid ${colors.success}` : `1px dashed ${colors.borderHighlight}`,
        background: file ? 'rgba(52, 211, 153, 0.05)' : 'rgba(255,255,255,0.01)',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={e => onFile(e.target.files[0])} />
      {file ? (
        <>
          <CheckCircle2 size={20} style={{ color: colors.success }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: colors.success }}>{file.name}</span>
        </>
      ) : (
        <>
          <Upload size={18} style={{ color: colors.textSecondary }} />
          <div className="flex flex-col items-center gap-1 text-center">
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.03em' }}>{label}</span>
            <span style={{ fontSize: 10, color: colors.textMuted }}>Tap or drag to upload</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Stage 2: Biometric Verification ────────────────── */
function Stage2Verify() {
  const { extractedData } = useAIState();
  const age = extractedData.age.value;

  return (
    <div className="p-6 flex flex-col gap-5" style={typography}>
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold" style={{ color: colors.textPrimary, letterSpacing: '-0.02em' }}>
          Verification
        </h3>
        <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
          Our AI is analyzing biometric patterns to confirm your identity and age.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {age ? (
            <motion.div
              key="match"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 flex flex-col items-center gap-4 text-center"
              style={{ background: 'rgba(52, 211, 153, 0.05)', borderRadius: 16, border: '1px solid rgba(52, 211, 153, 0.2)' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                <ScanFace size={32} style={{ color: colors.success }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: colors.success, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>BIOMETRIC MATCH</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary }}>{age} Years</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 flex flex-col items-center gap-4 text-center border-2 border-dashed"
              style={{ borderColor: 'rgba(56, 189, 248, 0.2)', borderRadius: 16, background: 'rgba(56, 189, 248, 0.02)' }}
            >
              <Activity size={32} style={{ color: colors.accent }} className="animate-pulse" />
              <div style={{ fontSize: 13, color: colors.textSecondary }}>Waiting for visual demographic confirmation...</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Age verification details */}
      <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <ScanFace size={14} style={{ color: colors.accent }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Demographic Check
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.08em' }}>ESTIMATED AGE</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
              {age ? `${age}–${age + 3} Years` : 'Scanning...'}
            </span>
          </div>
          <div className="h-6 w-px" style={{ background: colors.border }} />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: colors.textSecondary }}>Threshold Match</span>
            <div className="px-2 py-0.5 rounded" style={{ background: age ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.05)', color: age ? colors.success : colors.textMuted, fontSize: 10, fontWeight: 600 }}>
              {age ? '✓ VERIFIED' : 'PENDING'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stage 3: Capital Structuring (Offer) ───────────── */
function Stage3Offer({ loanAmount, setLoanAmount, tenure, setTenure, onAccept }) {
  const { extractedData } = useAIState();
  const emi = calcEMI(loanAmount, 12, tenure);
  const minLoan = 100000;
  const maxLoan = 500000;

  // Set initial loan amount from AI extraction if not set
  useEffect(() => {
    if (extractedData.loanAmount.value && loanAmount === 250000) {
      setLoanAmount(extractedData.loanAmount.value);
    }
  }, [extractedData.loanAmount.value]);

  const loanFill = ((loanAmount - minLoan) / (maxLoan - minLoan)) * 100;
  const tenureFill = ((tenure - 12) / (84 - 12)) * 100;

  return (
    <div className="p-6 flex flex-col gap-6" style={typography}>
      {/* Primary Offer Card */}
      <div
        className="relative overflow-hidden p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.9) 100%)',
          borderRadius: 16,
          border: `1px solid ${colors.borderHighlight}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8] opacity-10 blur-[50px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5" style={{ borderRadius: 6, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <Zap size={10} style={{ color: colors.accent }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: colors.accent, letterSpacing: '0.1em' }}>OPTIMIZED STRUCTURE</span>
        </div>

        <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>APPROVED CAPITAL</div>
        <motion.div
          key={loanAmount}
          initial={{ opacity: 0.8, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 36, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.03em', marginBottom: 24 }}
        >
          {fmtINR(loanAmount)}
        </motion.div>

        <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>MONTHLY OBLIGATION (EMI)</div>
            <motion.div key={emi} initial={{ opacity: 0.8 }} animate={{ opacity: 1 }} style={{ fontSize: 22, fontWeight: 600, color: colors.textPrimary, letterSpacing: '-0.02em' }}>
              {fmtINR(emi)} <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 400 }}>/ mo</span>
            </motion.div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>TENURE</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: colors.textPrimary, letterSpacing: '-0.02em' }}>
              {tenure} <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 400 }}>mos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Sliders */}
      <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal size={14} style={{ color: colors.accent }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Parameters</span>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 500 }}>Capital Required</span>
            <span style={{ fontSize: 12, color: colors.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtINR(loanAmount)}</span>
          </div>
          <input
            type="range" min={minLoan} max={maxLoan} step={10000} value={loanAmount} onChange={e => setLoanAmount(Number(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${loanFill}%, rgba(255,255,255,0.1) ${loanFill}%, rgba(255,255,255,0.1) 100%)` }}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 500 }}>Duration</span>
            <span style={{ fontSize: 12, color: colors.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{tenure} mos</span>
          </div>
          <input
            type="range" min={minTenure} max={maxTenure} step={6} value={tenure} onChange={e => setTenure(Number(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${tenureFill}%, rgba(255,255,255,0.1) ${tenureFill}%, rgba(255,255,255,0.1) 100%)` }}
          />
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={onAccept}
        className="w-full py-4 flex items-center justify-center gap-2 font-semibold transition-all"
        style={{
          background: colors.textPrimary, color: colors.bgBase, borderRadius: 10, fontSize: 13, letterSpacing: '0.02em', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(255,255,255,0.15)'
        }}
      >
        LOCK STRUCTURE & PROCEED <ArrowRight size={14} />
      </motion.button>
    </div>
  );
}

/* ─── Stage 4 — Consent ──────────────────────────────── */
function Stage4Consent({ token, onComplete }) {
  const { consent } = useAIState();
  const hash = consent.locked ? 'a3f9bc2e847d1c6f4b8e2d9a7c3f1b5e9d2c8a4f7b1e6c3d9a5f2b8e4d7c1a3f' : 'WAITING_FOR_HASH_GEN...';
  const timestamp = consent.timestamp ? new Date(consent.timestamp).toLocaleTimeString() : 'Pending';

  function downloadConsent() {
    if (!consent.locked) return;
    const blob = new Blob([
      `CONSENT TRAIL — AgentFinance AI\n\nSession: ${token}\nTimestamp: ${timestamp}\n\n` +
      `Consent Phrase: "${consent.phrase}"\n\n` +
      `SHA-256 Hash: ${hash}\n\nTamper-evident record. Do not modify.`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consent-audit-${token}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 flex flex-col gap-5" style={typography}>
      <div className="flex items-center gap-2 mb-2">
        <Mic size={16} style={{ color: colors.accent }} />
        <h3 style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Vocal Signature Analysis
        </h3>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
        style={{
          borderRadius: 12,
          borderLeft: `3px solid ${consent.locked ? colors.success : colors.accent}`,
          background: consent.locked ? 'rgba(52, 211, 153, 0.03)' : 'rgba(255,255,255,0.01)'
        }}
      >
        <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '0.1em', marginBottom: 8 }}>
          {consent.locked ? 'VERIFIED CONSENT PHRASE' : 'LISTENING FOR CONSENT...'}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: colors.textPrimary, fontStyle: 'italic', marginBottom: 8 }}>
          {consent.phrase ? `"${consent.phrase}"` : '"Please state your agreement to the terms..."'}
        </p>
        <div style={{ fontSize: 11, color: colors.textMuted }}>
          {consent.locked ? `Captured at ${timestamp}` : 'Signal processing active...'}
        </div>
      </motion.div>

      {consent.locked ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
          <div className="glass-card p-4" style={{ borderRadius: 12 }}>
            <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '0.1em', marginBottom: 6 }}>CONSENT HASH (SHA-256)</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', wordBreak: 'break-all', marginBottom: 8 }}>{hash}</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={12} style={{ color: colors.success }} /><span style={{ fontSize: 11, color: colors.success }}>Records anchored</span></div>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-4 flex items-center justify-center gap-2 font-semibold"
            style={{ background: colors.success, color: colors.bgBase, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
          >
            EXECUTE DISBURSEMENT <ArrowRight size={14} />
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-4 p-8 text-center border-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <Activity size={32} style={{ color: colors.accent }} className="animate-pulse" />
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Waiting for vocal affirmation to seal the contract.</span>
        </div>
      )}
    </div>
  );
}

/* ─── Stage 5: Completion ────────────────────────────── */
function Stage5Complete({ token, loanAmount, tenure }) {
  const navigate = useNavigate();
  const emi = calcEMI(loanAmount, 12, tenure);

  return (
    <div className="p-8 flex flex-col gap-6 items-center text-center" style={typography}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }} className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', boxShadow: '0 0 40px rgba(52, 211, 153, 0.2)' }}>
        <CheckCircle2 size={36} style={{ color: colors.success }} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.02em', marginBottom: 8 }}>Execution Complete</h3>
        <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>Capital layout optimized. Funds are queued for instantaneous transfer.</p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
        className="glass-card w-full"
        style={{ borderRadius: 12, padding: '14px 16px' }}
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'AMOUNT', value: fmtINR(loanAmount) },
            { label: 'EMI', value: `${fmtINR(emi)}/mo` },
            { label: 'TENURE', value: `${tenure} mo` },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col gap-1 w-full text-center mt-2">
        <span style={{ fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' }}>TOKEN: {token || 'TKN-8A4F-992B'}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col gap-3 w-full mt-4">
        <button className="w-full py-4 flex items-center justify-center gap-2 font-semibold transition-all bg-white text-black hover:bg-gray-100" style={{ borderRadius: 10, fontSize: 12, letterSpacing: '0.02em', cursor: 'pointer' }}>
          VIEW DASHBOARD
        </button>
      </motion.div>
    </div>
  );
}



/* ─── Video Analysis Hook ─────────────────────── */
function useVideoAnalysis(active, videoRef) {
  useEffect(() => {
    if (!active || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    let intervalId = null;

    const capture = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        console.log('[VIDEO_ANALYSIS] Capturing frame from live stream...');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        // Handle mirrored local preview if necessary, but for analysis raw is fine
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        processVideoFrame(base64);
      }
    };

    // First capture after 3s, then every 12s
    const startTimeout = setTimeout(capture, 3000);
    intervalId = setInterval(capture, 12000);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, videoRef]);
}

/* ─── Camera Frame ────────────────────────────── */
function CameraFrame({ isVideoOn, videoRef, onCameraReady }) {
  const [stream, setStream] = useState(null);

  // We ask for media once, and toggle tracks on/off when props change
  useEffect(() => {
    let activeStream = null;

    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          activeStream = s;
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
          onCameraReady?.();
        })
        .catch(err => {
          console.error("Camera access denied or unavailable", err);
          onCameraReady?.(); // Trigger continue anyway
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      onCameraReady?.();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOn]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, backgroundColor: '#0D0D14' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: isVideoOn && stream ? 1 : 0, transition: 'opacity 0.5s ease',
          transform: 'scaleX(-1)', // Local preview mirror
        }}
      />
      {(!isVideoOn || !stream) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          <VideoOff size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}
    </div>
  );
}


/* ─── Left Panel ─────────────────────────────────────── */
function LeftPanel({ isVideoOn, setIsVideoOn, isListening, micError, isProcessing, startRecording, stopRecording, onJoined, videoRef }) {
  const [callJoined, setCallJoined] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsAiSpeaking(true);
    const handleEnd = () => setIsAiSpeaking(false);
    window.addEventListener('ai_speaking_start', handleStart);
    window.addEventListener('ai_speaking_end', handleEnd);
    return () => {
      window.removeEventListener('ai_speaking_start', handleStart);
      window.removeEventListener('ai_speaking_end', handleEnd);
    };
  }, []);

  return (
    <div
      className="relative flex flex-col"
      style={{
        flex: '0 0 65%',
        background: 'radial-gradient(ellipse at 50% 50%, #0F1628 0%, #0D0D14 60%, #080810 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Local Camera embed — fills entire panel */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <CameraFrame
          isVideoOn={isVideoOn}
          videoRef={videoRef}
          onCameraReady={() => { setCallJoined(true); onJoined?.(); }}
        />
      </div>

      {/* Live badge — always on top */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 glass-pill px-3 py-1.5" style={{ zIndex: 20 }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0,
            boxShadow: '0 0 8px rgba(239,68,68,0.8)',
            animation: 'pulseGlow 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      {/* Secure badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 glass-pill px-3 py-1.5 z-10">
        <Lock size={11} style={{ color: '#10B981' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', letterSpacing: '0.06em' }}>SECURE SESSION</span>
      </div>

      {/* Center content */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
        style={{
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Ambient glow ring behind avatar */}
        <div style={{ position: 'relative' }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -16, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
              filter: 'blur(12px)',
            }}
          />
          {/* Avatar */}
          <div
            style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: '2px solid rgba(59,130,246,0.5)',
              boxShadow: '0 0 30px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
            }}
          >
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 700, color: '#3B82F6' }}>AI</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 transition-opacity duration-300">
          <div className="flex items-center gap-2">
            {!isAiSpeaking && isListening && <div className="w-2 h-2 rounded-full" style={{ background: '#F87171', boxShadow: '0 0 10px #F87171', animation: 'pulse 1.5s infinite' }} />}
            <span style={{ fontSize: 16, fontFamily: 'Sora, sans-serif', color: isAiSpeaking ? '#38BDF8' : (isListening ? '#F87171' : '#F8FAFC'), fontWeight: 600, transition: 'color 0.3s' }}>
              {isAiSpeaking ? "AI Officer is Speaking..." : isListening ? "Recording your response..." : "Ready for your response..."}
            </span>
          </div>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isAiSpeaking ? <SpeakingBars /> : (
              <button
                disabled={isAiSpeaking || isProcessing}
                onClick={isListening ? stopRecording : startRecording}
                className="px-6 py-2 rounded-full transition-all duration-200"
                style={{
                  background: isListening ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.1)',
                  border: isListening ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.2)',
                  color: isListening ? '#F87171' : '#FFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isAiSpeaking || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isAiSpeaking || isProcessing ? 0.5 : 1,
                  boxShadow: isListening ? '0 0 15px rgba(248,113,113,0.3)' : 'none'
                }}
              >
                {isProcessing ? "Processing..." : isListening ? "Tap to Stop & Send" : "Tap to Speak"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Caption bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div className="flex-1 min-w-0">
          <Typewriter />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsVideoOn(v => !v)}
            className="flex items-center gap-1.5 glass-pill px-3 py-2 transition-all duration-150"
            style={{
              border: isVideoOn ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: isVideoOn ? '0 0 12px rgba(59,130,246,0.25)' : 'none',
            }}
          >
            {isVideoOn
              ? <Video size={13} style={{ color: '#3B82F6' }} />
              : <VideoOff size={13} style={{ color: '#475569' }} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Right Panel ────────────────────────────────────── */
function RightPanel({ currentStage, setCurrentStage, token, loanAmount, setLoanAmount, tenure, setTenure }) {
  function handleAcceptOffer() { setCurrentStage(4); }

  return (
    <div className="flex flex-col h-full w-full relative z-20" style={{ background: colors.bgPanel, borderLeft: `1px solid ${colors.border}` }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex flex-col gap-1">
          <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.15em', fontWeight: 600, ...typography }}>SESSION LOG</div>
          <div style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500, letterSpacing: '0.05em', fontFamily: 'monospace' }}>TKN-{token?.slice(0, 4).toUpperCase() || 'A4X9'}</div>
        </div>
        <button className="px-3 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, fontSize: 10, color: colors.textSecondary, fontWeight: 600, letterSpacing: '0.05em', ...typography }}>
          MANUAL OVERRIDE
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
        {STEPS.map((step, idx) => {
          const stageNum = idx + 1;
          const isPast = stageNum < currentStage;
          const isActive = stageNum === currentStage;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 relative">
              {idx < STEPS.length - 1 && (
                <div className="absolute top-2 w-full left-1/2 h-px" style={{ background: isPast ? colors.success : colors.border }} />
              )}
              <div className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300" style={{ background: isPast ? colors.success : isActive ? colors.accent : colors.bgBase, border: `1px solid ${isPast ? colors.success : isActive ? colors.accent : colors.textMuted}` }}>
                {isPast && <CheckCircle2 size={8} color="#000" strokeWidth={4} />}
              </div>
              <span className="mt-2" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: isPast ? colors.textSecondary : isActive ? colors.textPrimary : colors.textMuted, ...typography }}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentStage === 1 && <Stage1KYC />}
            {currentStage === 2 && <Stage2Verify />}
            {currentStage === 3 && (
              <Stage3Offer
                loanAmount={loanAmount} setLoanAmount={setLoanAmount}
                tenure={tenure} setTenure={setTenure}
                onAccept={handleAcceptOffer}
              />
            )}
            {currentStage === 4 && <Stage4Consent token={token} />}
            {currentStage === 5 && <Stage5Complete token={token} loanAmount={loanAmount} tenure={tenure} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setCurrentStage(s => Math.max(1, s - 1))}
          disabled={currentStage === 1 || currentStage === 5}
          className="flex items-center gap-1.5 px-3 py-2 transition-opacity"
          style={{ opacity: (currentStage === 1 || currentStage === 5) ? 0.3 : 1, color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', ...typography }}
        >
          <ChevronLeft size={14} /> REVERT
        </button>
        <span style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '0.1em', ...typography }}>PHASE 0{currentStage} // 05</span>
        <button
          onClick={() => setCurrentStage(s => Math.min(5, s + 1))}
          disabled={currentStage === 5}
          className="flex items-center gap-1.5 px-3 py-2 rounded transition-all"
          style={{ opacity: currentStage === 5 ? 0.3 : 1, background: 'rgba(255,255,255,0.05)', color: colors.textPrimary, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', ...typography }}
        >
          PROCEED <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Video Call Page ───────────────────────────── */
export default function VideoCallPage() {
  const { token } = useParams();
  const [currentStage, setCurrentStage] = useState(1);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loanAmount, setLoanAmount] = useState(200000);
  const [tenure, setTenure] = useState(60);
  // Gate audio capture on Jitsi join — prevents competing for mic before Jitsi connects
  const [sessionJoined, setSessionJoined] = useState(false);

  // Shared video reference for UI and Analysis
  const videoRef = useRef(null);

  // ─── AI Hooks ─────────────────────────────────────────
  const { isListening, micError, isProcessing, startRecording, stopRecording } = useAudioCapture();
  const aiState = useAIState({ debounceMs: 500 });

  // Background Video Analysis
  useVideoAnalysis(sessionJoined && isVideoOn, videoRef);

  useEffect(() => {
    document.body.style.backgroundColor = colors.bgBase;
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <>
      {/* Desktop — two panel fixed layout */}
      <div
        className="hidden md:flex"
        style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          zIndex: 10, overflow: 'hidden',
        }}
      >
        <LeftPanel
          isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
          isListening={isListening} micError={micError} isProcessing={isProcessing}
          startRecording={startRecording} stopRecording={stopRecording}
          onJoined={() => setSessionJoined(true)}
          videoRef={videoRef}
        />
        <RightPanel
          currentStage={currentStage} setCurrentStage={setCurrentStage}
          token={token}
          loanAmount={loanAmount} setLoanAmount={setLoanAmount}
          tenure={tenure} setTenure={setTenure}
        />
      </div>

      {/* Mobile — stacked layout */}
      <div
        className="flex md:hidden flex-col"
        style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          zIndex: 10, overflow: 'hidden',
        }}
      >
        {/* Video — top 42% */}
        <div style={{ flex: '0 0 42%', position: 'relative', overflow: 'hidden' }}>
          <LeftPanel
            isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
            isListening={isListening} micError={micError} isProcessing={isProcessing}
            startRecording={startRecording} stopRecording={stopRecording}
            onJoined={() => setSessionJoined(true)}
            videoRef={videoRef}
          />
        </div>
        {/* Context panel — fills rest */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RightPanel
            currentStage={currentStage} setCurrentStage={setCurrentStage}
            token={token}
            loanAmount={loanAmount} setLoanAmount={setLoanAmount}
            tenure={tenure} setTenure={setTenure}
          />
        </div>
      </div>
    </>
  );
}
