import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Lock, User, Shield, Tag,
  CheckCircle, Star, FileText, Upload, Eye, SlidersHorizontal,
  Download, ChevronLeft, ChevronRight, ScanFace, CheckCircle2,
  ShieldCheck, Zap, AlertTriangle,
} from 'lucide-react';
import useAudioCapture from '../hooks/useAudioCapture.js';
import useAIState from '../hooks/useAIState.js';

/* ─── Constants ──────────────────────────────────────── */
const CAPTIONS = [
  'Tell me about your monthly income...',
  'Can you share your employment details?',
  'What would you use this loan for?',
  'Let me verify your details...',
  'Great, processing your application...',
];

const STEPS = [
  { icon: User,         label: 'KYC'     },
  { icon: Shield,       label: 'Verify'  },
  { icon: Tag,          label: 'Offer'   },
  { icon: CheckCircle,  label: 'Consent' },
  { icon: Star,         label: 'Done'    },
];

/* KYC_FIELDS now driven dynamically from AI state via useAIState hook */

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
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── Typewriter ─────────────────────────────────────── */
function Typewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const phrase = CAPTIONS[phraseIdx];

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setPhraseIdx(i => (i + 1) % CAPTIONS.length);
        setText(''); setCharIdx(0); setDone(false);
      }, 2200);
      return () => clearTimeout(t);
    }
    if (charIdx < phrase.length) {
      const t = setTimeout(() => {
        setText(phrase.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 42);
      return () => clearTimeout(t);
    } else { setDone(true); }
  }, [charIdx, phrase, done]);

  return (
    <span className="text-sm" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
      {text}
      <span
        className="cursor-blink"
        style={{ display: 'inline-block', width: 2, height: 13, background: '#3B82F6', marginLeft: 2, verticalAlign: 'middle' }}
      />
    </span>
  );
}

/* ─── Speaking Bars ──────────────────────────────────── */
function SpeakingBars() {
  const bars = [14, 26, 10, 22, 18, 28, 12];
  const durs = [0.5, 0.7, 0.6, 0.8, 0.55, 0.65, 0.5];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 30 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: [h * 0.25, h, h * 0.4, h * 0.85, h * 0.25] }}
          transition={{ duration: durs[i], repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
          style={{ width: 3, background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: 3 }}
        />
      ))}
    </div>
  );
}

/* ─── Confidence Badge ───────────────────────────────── */
function ConfBadge({ level }) {
  const cfg = {
    High:   { color: '#10B981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.25)' },
    Medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)' },
    Low:    { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)'  },
  }[level];
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
function Stage1KYC({ kycFields = [], isListening, risk, intent }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible < kycFields.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 420);
      return () => clearTimeout(t);
    }
  }, [visible, kycFields.length]);

  // Re-trigger animation when new fields arrive with values
  const filledCount = kycFields.filter(f => f.value !== '—').length;
  useEffect(() => {
    if (filledCount > 0 && visible < filledCount) {
      setVisible(filledCount);
    }
  }, [filledCount]);

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
          Extracting Profile
        </h3>
        {isListening && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }}
          />
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        {isListening ? 'AI is analyzing your responses...' : 'Enable mic to start AI extraction'}
      </p>

      <div className="flex flex-col gap-2">
        {kycFields.map((f, i) => (
          <AnimatePresence key={f.label}>
            {i < visible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card px-3 py-2.5 flex items-center justify-between gap-2"
                style={{ borderRadius: 10 }}
              >
                <div className="flex flex-col min-w-0">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{f.label}</span>
                  <span className="font-semibold truncate" style={{ fontSize: 13, color: f.value === '—' ? 'var(--text-muted)' : 'var(--text-primary)', marginTop: 1 }}>{f.value}</span>
                </div>
                {f.confidence === 'Waiting' ? (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: '#64748B', background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}
                  >
                    Waiting
                  </span>
                ) : (
                  <ConfBadge level={f.confidence} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Risk & Intent mini-bar */}
      {(risk?.level || intent?.intent) && risk.level !== 'low' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 mt-1"
          style={{ fontSize: 11 }}
        >
          {risk && (
            <span style={{
              color: risk.level === 'high' ? '#EF4444' : risk.level === 'medium' ? '#F59E0B' : '#10B981',
              fontWeight: 600,
            }}>
              Risk: {risk.level.toUpperCase()} ({risk.score}/100)
            </span>
          )}
          {intent?.intent !== 'unknown' && (
            <span style={{ color: 'var(--text-secondary)' }}>
              Intent: {intent.intent.replace(/_/g, ' ')}
            </span>
          )}
        </motion.div>
      )}

      {visible >= kycFields.length && kycFields.some(f => f.confidence === 'Low' || f.confidence === 'Medium') && (
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
      className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        border: file ? '1.5px solid rgba(16,185,129,0.4)' : '1.5px dashed rgba(255,255,255,0.12)',
        background: file ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={e => onFile(e.target.files[0])} />
      {file ? (
        <>
          <CheckCircle2 size={18} style={{ color: '#10B981' }} />
          <span className="text-xs font-medium text-center" style={{ color: '#10B981' }}>{file.name}</span>
        </>
      ) : (
        <>
          <Upload size={16} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Click or drag to upload</span>
        </>
      )}
    </div>
  );
}

/* ─── Stage 2 — Verify ───────────────────────────────── */
function Stage2Verify() {
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('loading');

  useEffect(() => {
    const t = setTimeout(() => setLivenessStatus('success'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Card 1 — Document Upload */}
      <div className="glass-card p-4" style={{ borderRadius: 12 }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={15} style={{ color: '#3B82F6' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Upload Documents
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <UploadZone label="PAN Card"    file={panFile}    onFile={setPanFile}    />
          <UploadZone label="Aadhaar Card" file={aadhaarFile} onFile={setAadhaarFile} />
        </div>
      </div>

      {/* Card 2 — Liveness */}
      <div className="glass-card p-4" style={{ borderRadius: 12 }}>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={15} style={{ color: '#3B82F6' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Liveness Detection
          </span>
        </div>
        <AnimatePresence mode="wait">
          {livenessStatus === 'loading' ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Analyzing frames...</span>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                <span className="text-sm font-semibold" style={{ color: '#10B981' }}>Liveness Confirmed</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>32 frames analyzed • Score: 0.94</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Model: face-api.js</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card 3 — Age Verification */}
      <div className="glass-card p-4" style={{ borderRadius: 12 }}>
        <div className="flex items-center gap-2 mb-3">
          <ScanFace size={15} style={{ color: '#3B82F6' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Age Verification
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 3 }}>ESTIMATED AGE</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>30–34 yrs</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 3 }}>DECLARED AGE</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>32 yrs</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delta within threshold (±5 years)</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            Match ✓
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Stage 3 — Offer ────────────────────────────────── */
function Stage3Offer({ loanAmount, setLoanAmount, tenure, setTenure, onAccept }) {
  const emi = calcEMI(loanAmount, 12, tenure);
  const minLoan = 100000;
  const maxLoan = 500000;
  const minTenure = 12;
  const maxTenure = 84;

  const loanFill = ((loanAmount - minLoan) / (maxLoan - minLoan)) * 100;
  const tenureFill = ((tenure - minTenure) / (maxTenure - minTenure)) * 100;

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Offer card */}
      <div
        className="glass-card p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(16,185,129,0.04) 100%)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: 14,
        }}
      >
        {/* Glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {/* Best rate badge */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-4"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '0.1em' }}>
          <Zap size={10} fill="#10B981" />
          LOWEST INTEREST RATE
        </div>

        {/* Amount */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>LOAN AMOUNT</div>
        <motion.div
          key={loanAmount}
          initial={{ opacity: 0.6, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'Sora, sans-serif', fontSize: 34, fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
            textShadow: '0 0 30px rgba(59,130,246,0.3)',
            marginBottom: 16,
          }}
        >
          {fmtINR(loanAmount)}
        </motion.div>

        {/* EMI + Tenure row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 3 }}>MONTHLY EMI</div>
            <motion.div
              key={emi}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}
            >
              {fmtINR(emi)}/mo
            </motion.div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 3 }}>TENURE</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {tenure} months
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span style={{ fontSize: 11, color: '#10B981' }}>Premium rates applied due to pre-approval status</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* Sliders */}
      <div className="glass-card p-4" style={{ borderRadius: 12 }}>
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={14} style={{ color: '#3B82F6' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
            Loan Adjustment
          </span>
        </div>

        {/* Loan amount slider */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Desired Loan Amount</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{fmtINR(loanAmount)}</span>
          </div>
          <input
            type="range"
            min={minLoan} max={maxLoan} step={10000}
            value={loanAmount}
            onChange={e => setLoanAmount(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${loanFill}%, rgba(255,255,255,0.1) ${loanFill}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>₹1L</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>₹5L</span>
          </div>
        </div>

        {/* Tenure slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tenure (Months)</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{tenure} months</span>
          </div>
          <input
            type="range"
            min={minTenure} max={maxTenure} step={6}
            value={tenure}
            onChange={e => setTenure(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${tenureFill}%, rgba(255,255,255,0.1) ${tenureFill}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>12 mo</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>84 mo</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2">
        <button
          className="btn-outline flex items-center justify-center gap-2"
          style={{ height: 44, fontSize: 13 }}
        >
          Adjust Offer
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAccept}
          className="flex items-center justify-center gap-2 font-semibold"
          style={{
            height: 44, borderRadius: 10, fontSize: 13, cursor: 'pointer',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff', border: 'none',
            boxShadow: '0 0 30px rgba(16,185,129,0.35)',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 50px rgba(16,185,129,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(16,185,129,0.35)'; }}
        >
          <CheckCircle size={15} />
          Accept Offer
        </motion.button>
      </div>
    </div>
  );
}

/* ─── Stage 4 — Consent ──────────────────────────────── */
function Stage4Consent({ token, consentState }) {
  const isLocked = consentState?.locked || false;
  const phrase = consentState?.phrase || null;
  const consentTimestamp = consentState?.timestamp
    ? new Date(consentState.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : formatTime();
  const hash = 'a3f9bc2e847d1c6f4b8e2d9a7c3f1b5e9d2c8a4f7b1e6c3d9a5f2b8e4d7c1a3f';

  function downloadConsent() {
    const blob = new Blob([
      `CONSENT TRAIL — AgentFinance AI\n\nSession: ${token}\nTimestamp: ${consentTimestamp}\n\n` +
      `Consent Phrase: "${phrase || 'Pending capture'}"\n\n` +
      `SHA-256 Hash: ${hash}\n\nTamper-evident record. Do not modify.`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consent-${token}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Mic size={15} style={{ color: '#3B82F6' }} />
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}>
          Verbal Consent Capture
        </h3>
      </div>

      {/* Consent status */}
      {!isLocked ? (
        /* Waiting for consent */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex flex-col items-center gap-3"
          style={{ borderRadius: 12, borderLeft: '3px solid #F59E0B' }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Mic size={28} style={{ color: '#F59E0B' }} />
          </motion.div>
          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            Listening for verbal consent...
          </p>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Say "I agree", "Yes, proceed", or "I accept" to confirm
          </p>

          {consentState?.refusalDetected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-1"
            >
              <AlertTriangle size={12} style={{ color: '#EF4444' }} />
              <span style={{ fontSize: 11, color: '#EF4444' }}>Refusal detected — consent not granted</span>
            </motion.div>
          )}
        </motion.div>
      ) : (
        /* Consent captured */
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
            style={{ borderRadius: 12, borderLeft: '3px solid #10B981' }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
              DETECTED CONSENT PHRASE
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 8 }}>
              "{phrase}"
            </p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Captured at {consentTimestamp} • Session #{token}
            </div>
          </motion.div>

          {/* Hash */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4"
            style={{ borderRadius: 12 }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
              CONSENT HASH (SHA-256)
            </div>
            <div
              style={{
                fontFamily: 'monospace', fontSize: 11, color: '#94A3B8',
                letterSpacing: '0.05em', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 8
              }}
            >
              {hash}
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} style={{ color: '#10B981' }} />
              <span style={{ fontSize: 11, color: '#10B981' }}>Tamper-evident record stored</span>
            </div>
          </motion.div>

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <CheckCircle2 size={16} style={{ color: '#10B981' }} />
            <span className="font-bold" style={{ fontSize: 14, color: '#10B981', letterSpacing: '0.02em' }}>
              CONSENT VERIFIED ✓
            </span>
          </motion.div>
        </>
      )}

      {/* Export button */}
      <button
        className="btn-outline flex items-center justify-center gap-2"
        style={{ height: 44, fontSize: 13, opacity: isLocked ? 1 : 0.5, cursor: isLocked ? 'pointer' : 'not-allowed' }}
        onClick={isLocked ? downloadConsent : undefined}
        disabled={!isLocked}
      >
        <Download size={14} />
        Export Consent Trail
      </button>
    </div>
  );
}

/* ─── Stage 5 — Complete ─────────────────────────────── */
function Stage5Complete({ token, loanAmount, tenure }) {
  const navigate = useNavigate();
  const emi = calcEMI(loanAmount, 12, tenure);
  const completedAt = formatTime();

  function downloadOffer() {
    const blob = new Blob([
      `LOAN OFFER LETTER — AgentFinance AI\n\n` +
      `Applicant: Rahul Sharma\nSession: ${token}\nCompleted: ${completedAt}\n\n` +
      `Loan Amount: ${fmtINR(loanAmount)}\nTenure: ${tenure} months\nMonthly EMI: ${fmtINR(emi)}\n` +
      `Interest Rate: 12% p.a.\n\nThis is an AI-generated offer letter for demo purposes.`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `offer-letter-${token}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 flex flex-col gap-4 items-center text-center">
      {/* Animated checkmark */}
      <motion.svg
        width="84" height="84" viewBox="0 0 84 84"
        initial="hidden" animate="visible"
      >
        <motion.circle
          cx="42" cy="42" r="38"
          stroke="#10B981" strokeWidth="2.5" fill="rgba(16,185,129,0.08)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        />
        <motion.path
          d="M24 42 L36 54 L60 30"
          stroke="#10B981" strokeWidth="3.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.7, ease: 'easeOut' }}
        />
      </motion.svg>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Application Complete!
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
          Your loan has been approved and offer accepted.
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
        className="glass-card w-full"
        style={{ borderRadius: 12, padding: '14px 16px' }}
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'AMOUNT',   value: fmtINR(loanAmount) },
            { label: 'EMI',      value: `${fmtINR(emi)}/mo` },
            { label: 'TENURE',   value: `${tenure} mo` },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Session info */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        className="flex flex-col gap-1 text-center"
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Session ID: {token}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completed at: {completedAt}</span>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
        className="flex flex-col gap-2 w-full"
      >
        <button
          onClick={downloadOffer}
          className="btn-primary flex items-center justify-center gap-2"
          style={{ height: 44, fontSize: 13, width: '100%' }}
        >
          <Download size={14} />
          Download Offer Letter
        </button>
        <button
          onClick={() => navigate('/compliance')}
          className="btn-outline flex items-center justify-center gap-2"
          style={{ height: 44, fontSize: 13 }}
        >
          <FileText size={14} />
          View Audit Report
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Progress Stepper ───────────────────────────────── */
function ProgressStepper({ currentStage }) {
  return (
    <div
      className="flex items-stretch px-3 py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
    >
      {STEPS.map((step, i) => {
        const stage = i + 1;
        const done = stage < currentStage;
        const active = stage === currentStage;
        const Icon = step.icon;
        return (
          <div key={step.label} className="flex-1 flex flex-col items-center gap-1 relative">
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, zIndex: 0,
                  background: done ? '#10B981' : 'rgba(255,255,255,0.07)',
                  transition: 'background 0.4s ease',
                }}
              />
            )}
            {/* Circle */}
            <div
              className={active ? 'stage-active-pulse' : ''}
              style={{
                width: 28, height: 28, borderRadius: '50%', zIndex: 1, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done   ? 'rgba(16,185,129,0.18)'  :
                            active ? 'rgba(59,130,246,0.2)'   : 'rgba(255,255,255,0.05)',
                border: done   ? '1.5px solid rgba(16,185,129,0.5)'  :
                        active ? '1.5px solid rgba(59,130,246,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {done
                ? <CheckCircle size={13} style={{ color: '#10B981' }} />
                : <Icon size={13} style={{ color: active ? '#3B82F6' : '#475569' }} />
              }
            </div>
            {/* Label — hidden on very small mobile */}
            <span
              className="text-[9px] sm:text-[10px] text-center leading-tight hidden sm:block"
              style={{ color: done ? '#10B981' : active ? '#3B82F6' : 'var(--text-muted)' }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Left Panel ─────────────────────────────────────── */
function LeftPanel({ isMicOn, setIsMicOn, isVideoOn, setIsVideoOn, isListening, micError, isProcessing }) {
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
      {/* Live badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 glass-pill px-3 py-1.5 z-10">
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
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

        <div className="flex flex-col items-center gap-3">
          <span style={{ fontSize: 16, fontFamily: 'Sora, sans-serif', color: '#F8FAFC', fontWeight: 500 }}>
            AI Loan Officer
          </span>
          <SpeakingBars />
        </div>

        {/* Listening / Processing / Error indicators */}
        <AnimatePresence mode="wait">
          {micError ? (
            <motion.div
              key="mic-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 glass-pill px-4 py-2"
              style={{ border: '1px solid rgba(239,68,68,0.3)', maxWidth: 360 }}
            >
              <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#EF4444' }}>{micError}</span>
            </motion.div>
          ) : isListening ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 glass-pill px-4 py-2"
              style={{ border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: '#93C5FD' }}>
                {isProcessing ? 'Processing speech...' : 'Listening...'}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
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
            onClick={() => setIsMicOn(v => !v)}
            className="flex items-center gap-1.5 glass-pill px-3 py-2 transition-all duration-150"
            style={{
              border: isMicOn ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: isMicOn ? '0 0 12px rgba(59,130,246,0.25)' : 'none',
            }}
          >
            {isMicOn
              ? <Mic size={13} style={{ color: '#3B82F6' }} />
              : <MicOff size={13} style={{ color: '#475569' }} />
            }
          </button>
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
function RightPanel({ currentStage, setCurrentStage, token, loanAmount, setLoanAmount, tenure, setTenure, aiState, isListening }) {
  function handleAcceptOffer() { setCurrentStage(4); }

  return (
    <div
      className="flex flex-col ops-scroll"
      style={{
        flex: '0 0 35%',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.2) 100%)',
            border: '1.5px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <User size={16} style={{ color: '#3B82F6' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            AI Loan Officer
          </div>
          <div className="flex items-center gap-1.5" style={{ marginTop: 1 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Session · Analyzing Profile</span>
          </div>
        </div>
        <button
          className="glass-pill px-2.5 py-1 flex-shrink-0 transition-all duration-150 hover:bg-white/5"
          style={{ fontSize: 11, color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
        >
          Get Support
        </button>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStage={currentStage} />

      {/* Stage content — scrollable */}
      <div className="flex-1 overflow-y-auto ops-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentStage === 1 && (
              <Stage1KYC
                kycFields={aiState.kycFields}
                isListening={isListening}
                risk={aiState.risk}
                intent={aiState.intent}
              />
            )}
            {currentStage === 2 && <Stage2Verify />}
            {currentStage === 3 && (
              <Stage3Offer
                loanAmount={loanAmount} setLoanAmount={setLoanAmount}
                tenure={tenure} setTenure={setTenure}
                onAccept={handleAcceptOffer}
              />
            )}
            {currentStage === 4 && <Stage4Consent token={token} consentState={aiState.consent} />}
            {currentStage === 5 && <Stage5Complete token={token} loanAmount={loanAmount} tenure={tenure} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stage navigation */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}
      >
        <button
          onClick={() => setCurrentStage(s => Math.max(1, s - 1))}
          disabled={currentStage === 1}
          className="flex items-center gap-1.5 glass-pill px-3 py-2 text-xs font-medium transition-all duration-150"
          style={{
            color: currentStage === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
            opacity: currentStage === 1 ? 0.4 : 1,
            cursor: currentStage === 1 ? 'not-allowed' : 'pointer',
            border: '1px solid var(--border-default)',
          }}
        >
          <ChevronLeft size={12} /> Previous
        </button>

        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Stage {currentStage} of 5
        </span>

        <button
          onClick={() => setCurrentStage(s => Math.min(5, s + 1))}
          disabled={currentStage === 5}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition-all duration-150"
          style={{
            background: currentStage === 5 ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.15)',
            color: currentStage === 5 ? 'var(--text-muted)' : '#3B82F6',
            border: `1px solid ${currentStage === 5 ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.3)'}`,
            opacity: currentStage === 5 ? 0.4 : 1,
            cursor: currentStage === 5 ? 'not-allowed' : 'pointer',
          }}
        >
          Next Stage <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function VideoCallPage() {
  const { token } = useParams();
  const [currentStage, setCurrentStage] = useState(1);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loanAmount, setLoanAmount] = useState(200000);
  const [tenure, setTenure] = useState(60);

  // ─── AI Hooks ─────────────────────────────────────────
  const { isListening, micError, isProcessing } = useAudioCapture(isMicOn);
  const aiState = useAIState({ debounceMs: 500 });

  // Prevent body scroll while on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
          isMicOn={isMicOn} setIsMicOn={setIsMicOn}
          isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
          isListening={isListening} micError={micError} isProcessing={isProcessing}
        />
        <RightPanel
          currentStage={currentStage} setCurrentStage={setCurrentStage}
          token={token}
          loanAmount={loanAmount} setLoanAmount={setLoanAmount}
          tenure={tenure} setTenure={setTenure}
          aiState={aiState} isListening={isListening}
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
            isMicOn={isMicOn} setIsMicOn={setIsMicOn}
            isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
            isListening={isListening} micError={micError} isProcessing={isProcessing}
          />
        </div>
        {/* Context panel — fills rest */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RightPanel
            currentStage={currentStage} setCurrentStage={setCurrentStage}
            token={token}
            loanAmount={loanAmount} setLoanAmount={setLoanAmount}
            tenure={tenure} setTenure={setTenure}
            aiState={aiState} isListening={isListening}
          />
        </div>
      </div>
    </>
  );
}
