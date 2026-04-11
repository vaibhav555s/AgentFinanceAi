import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Lock, User, Shield, Tag,
  CheckCircle, Star, FileText, Upload, Eye, SlidersHorizontal,
  Download, ChevronLeft, ChevronRight, ScanFace, CheckCircle2,
  ShieldCheck, Zap, Activity, Fingerprint, Banknote, FileCheck,
  Radar, Cpu, ArrowRight
} from 'lucide-react';

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
  { icon: ScanFace,    label: 'VERIFY' },
  { icon: Banknote,    label: 'STRUCTURE' },
  { icon: ShieldCheck, label: 'CONSENT' },
  { icon: CheckCircle2,label: 'DONE' },
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

/* ─── Fluid Voice Visualizer ─────────────────────────── */
function FluidVoiceVisualizer() {
  const bars = Array.from({ length: 12 });
  return (
    <div className="flex items-center gap-[4px] h-10">
      {bars.map((_, i) => (
        <motion.div
           key={i}
           animate={{ height: [`${20 + Math.random()*30}%`, `${60 + Math.random()*40}%`, `${20 + Math.random()*30}%`] }}
           transition={{ duration: 0.6 + Math.random()*0.5, repeat: Infinity, ease: 'easeInOut' }}
           style={{ width: 3, borderRadius: 999, backgroundColor: colors.accent, opacity: 0.8 }}
        />
      ))}
    </div>
  );
}

/* ─── Premium AI Orb ─────────────────────────────────── */
function PremiumOrb() {
  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px]">
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      
      {/* Expanding ripples */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0, 0.15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${colors.accent}` }}
      />
      <motion.div
        animate={{ scale: [1, 1.8, 1], opacity: [0, 0.05, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.25 }}
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${colors.accent}` }}
      />

      {/* Central Core */}
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ 
          rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="relative z-10 flex items-center justify-center"
        style={{
          width: 130, height: 130, borderRadius: '50%',
          background: 'linear-gradient(135deg, #050505 0%, #171717 100%)',
          boxShadow: `0 0 50px rgba(56, 189, 248, 0.25), inset 0 0 30px rgba(56, 189, 248, 0.4), inset 0 0 8px rgba(255,255,255,0.5)`,
          border: `1px solid rgba(56, 189, 248, 0.4)`
        }}
      >
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), transparent 45%)', mixBlendMode: 'overlay', opacity: 0.6 }} />
        <Cpu size={32} style={{ color: 'rgba(255,255,255,0.9)' }} />
      </motion.div>
    </div>
  );
}

/* ─── Stage 1: Identity Extraction (KYC) ───────────────── */
function Stage1KYC() {
  const [visible, setVisible] = useState(0);
  const KYC_FIELDS = [
    { label: 'PRIMARY APPLICANT',  value: 'Rahul Sharma',             conf: '99.8%' },
    { label: 'DATE OF BIRTH',      value: '14 Aug 1991 (Age 32)',     conf: '98.5%' },
    { label: 'EMPLOYMENT STATUS',  value: 'Salaried Executive',       conf: '99.1%' },
    { label: 'VERIFIED INCOME',    value: '₹85,000 / mo',             conf: '94.2%' },
    { label: 'PURPOSE OF LOAN',    value: 'Capital Expenditure',      conf: '97.0%' },
    { label: 'REQUESTED CAPITAL',  value: '₹3,00,000',                conf: '99.9%' },
  ];

  useEffect(() => {
    if (visible < KYC_FIELDS.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 350);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div className="p-6 flex flex-col gap-6" style={typography}>
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: colors.border }}>
        <Radar size={18} style={{ color: colors.accent }} />
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Identity Extraction
          </h3>
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>Secure data pipeline active</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-1.5">
                  <span style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500, letterSpacing: '-0.01em' }}>{f.value}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 4, background: 'rgba(52, 211, 153, 0.1)' }}>
                  <CheckCircle2 size={10} style={{ color: colors.success }} />
                  <span style={{ fontSize: 10, color: colors.success, fontWeight: 600, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>{f.conf}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
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
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('loading');

  useEffect(() => {
    const t = setTimeout(() => setLivenessStatus('success'), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-6 flex flex-col gap-5" style={typography}>
      {/* Uploads */}
      <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={14} style={{ color: colors.accent }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Mandatory Documents
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <UploadZone label="PAN CARD" file={panFile} onFile={setPanFile} />
          <UploadZone label="AADHAAR" file={aadhaarFile} onFile={setAadhaarFile} />
        </div>
      </div>

      {/* Liveness */}
      <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={14} style={{ color: colors.accent }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Liveness Protocol
          </span>
        </div>
        <AnimatePresence mode="wait">
          {livenessStatus === 'loading' ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4 py-2">
              <div className="relative flex items-center justify-center w-6 h-6">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#38BDF8]" />
              </div>
              <span style={{ fontSize: 12, color: colors.textSecondary, letterSpacing: '0.02em' }}>Correlating facial landmarks...</span>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: colors.success }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.success }}>Liveness Confirmed</span>
              </div>
              <span style={{ fontSize: 11, color: colors.textMuted }}>Confidence Score: 0.994 • Neural Model: Alpha-v4.2</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Age verification */}
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
            <span style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>30–33 Years</span>
          </div>
          <div className="h-6 w-px" style={{ background: colors.border }} />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: colors.textSecondary }}>Threshold Match</span>
            <div className="px-2 py-0.5 rounded" style={{ background: 'rgba(52, 211, 153, 0.1)', color: colors.success, fontSize: 10, fontWeight: 600 }}>✓ VERIFIED</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stage 3: Capital Structuring (Offer) ───────────── */
function Stage3Offer({ loanAmount, setLoanAmount, tenure, setTenure, onAccept }) {
  const emi = calcEMI(loanAmount, 12, tenure);
  const minLoan = 100000;
  const maxLoan = 500000;
  const minTenure = 12;
  const maxTenure = 84;
  const loanFill = ((loanAmount - minLoan) / (maxLoan - minLoan)) * 100;
  const tenureFill = ((tenure - minTenure) / (maxTenure - minTenure)) * 100;

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

/* ─── Stage 4: Cryptographic Consent ─────────────────── */
function Stage4Consent({ token }) {
  const hash = 'a3f9bc2e847d1c6f4b8e2d9a7c3f1b5e9d2c8a4f7b1e6c3d9a5f2b8e4d7c1a3f';
  const timestamp = formatTime();

  function downloadConsent() {
    const blob = new Blob([
      `SECURE CONSENT TRAIL — AGENT FINANCE\n\nSession Token: ${token}\nTimestamp: ${timestamp}\n\n` +
      `Parsed Vocal Intent: "Yes, I agree to the terms and conditions of this loan offer."\n\n` +
      `Cryptographic Hash (SHA-256): ${hash}\n\nStrict Tamper-Evident Record. DO NOT MODIFY.`
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

      {/* Detected phrase */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>PARSED TRANSCRIPT</div>
        <p style={{ fontSize: 14, color: colors.textPrimary, fontStyle: 'italic', lineHeight: 1.6, fontWeight: 400, marginBottom: 8 }}>
          "Yes, I agree to the terms and conditions of this loan offer."
        </p>
        <div style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'monospace' }}>Captured @ {timestamp}</div>
      </motion.div>

      {/* Hash display */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>CRYPTOGRAPHIC LEDGER HASH</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary, wordBreak: 'break-all', lineHeight: 1.5, background: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 6, marginBottom: 12, border: `1px solid rgba(255,255,255,0.04)` }}>
          {hash}
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} style={{ color: colors.success }} />
          <span style={{ fontSize: 10, color: colors.success, fontWeight: 500, letterSpacing: '0.02em' }}>Immutable record generated</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="flex items-center justify-center gap-2 py-4 mt-2" style={{ background: 'rgba(52, 211, 153, 0.05)', border: `1px solid rgba(52, 211, 153, 0.2)`, borderRadius: 10 }}>
        <CheckCircle2 size={16} style={{ color: colors.success }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.success, letterSpacing: '0.05em' }}>CONSENT VALIDATED</span>
      </motion.div>

      <button onClick={downloadConsent} className="w-full mt-2 py-4 flex items-center justify-center gap-2 font-semibold transition-all hover:bg-white/5" style={{ background: 'transparent', color: colors.textPrimary, border: `1px solid ${colors.borderHighlight}`, borderRadius: 10, fontSize: 12, letterSpacing: '0.02em', cursor: 'pointer' }}>
        <Download size={14} /> EXPORT AUDIT TRAIL
      </button>
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full p-5 mt-2" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.08em', fontWeight: 600 }}>CAPITAL</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{fmtINR(loanAmount)}</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.08em', fontWeight: 600 }}>EMI</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{fmtINR(emi)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.08em', fontWeight: 600 }}>TERM</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{tenure} mo</span>
          </div>
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

/* ─── Control Panels ─────────────────────────────────── */
function LeftPanel({ isMicOn, setIsMicOn, isVideoOn, setIsVideoOn }) {
  return (
    <div className="relative flex flex-col h-full w-full" style={{ background: colors.bgBase }}>
      {/* Absolute faint background texture or noise could go here */}
      <div className="absolute inset-0 bg-[#020202]">
        <div className="absolute w-[800px] h-[800px] -top-[400px] -left-[200px] bg-[#38BDF8] opacity-[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="flex items-center justify-center w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', letterSpacing: '0.15em', ...typography }}>LIVE LINK</span>
      </div>
      <div className="absolute top-6 right-6 flex items-center gap-1.5 z-10 px-2 py-1 rounded" style={{ background: 'rgba(52, 211, 153, 0.1)' }}>
        <Lock size={10} style={{ color: colors.success }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: colors.success, letterSpacing: '0.1em', ...typography }}>E2E ENCRYPTED</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        <PremiumOrb />
        
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: '0.2em', fontWeight: 600, ...typography }}>AI AGENT</span>
            <span style={{ fontSize: 18, color: colors.textPrimary, fontWeight: 500, letterSpacing: '-0.02em', ...typography }}>Financial Protocol v4</span>
          </div>
          <FluidVoiceVisualizer />
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8 z-20">
        <Typewriter />
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMicOn(!isMicOn)} className="flex items-center justify-center w-12 h-12 rounded-full transition-all" style={{ background: isMicOn ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMicOn ? 'rgba(56, 189, 248, 0.3)' : colors.border}` }}>
            {isMicOn ? <Mic size={16} color={colors.accent} /> : <MicOff size={16} color={colors.textSecondary} />}
          </button>
          <button onClick={() => setIsVideoOn(!isVideoOn)} className="flex items-center justify-center w-12 h-12 rounded-full transition-all" style={{ background: isVideoOn ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isVideoOn ? 'rgba(56, 189, 248, 0.3)' : colors.border}` }}>
            {isVideoOn ? <Video size={16} color={colors.accent} /> : <VideoOff size={16} color={colors.textSecondary} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function RightPanel({ currentStage, setCurrentStage, token, loanAmount, setLoanAmount, tenure, setTenure }) {
  return (
    <div className="flex flex-col h-full w-full relative z-20" style={{ background: colors.bgPanel, borderLeft: `1px solid ${colors.border}` }}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex flex-col gap-1">
          <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.15em', fontWeight: 600, ...typography }}>SESSION LOG</div>
          <div style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500, letterSpacing: '0.05em', fontFamily: 'monospace' }}>TKN-{token?.slice(0,4).toUpperCase() || 'A4X9'}</div>
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
          <motion.div key={currentStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {currentStage === 1 && <Stage1KYC />}
            {currentStage === 2 && <Stage2Verify />}
            {currentStage === 3 && <Stage3Offer loanAmount={loanAmount} setLoanAmount={setLoanAmount} tenure={tenure} setTenure={setTenure} onAccept={() => setCurrentStage(4)} />}
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
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loanAmount, setLoanAmount] = useState(200000);
  const [tenure, setTenure] = useState(60);

  useEffect(() => {
    document.body.style.backgroundColor = colors.bgBase;
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden" style={{ ...typography, background: colors.bgBase }}>
      <div className="flex-none h-[40vh] md:h-full md:w-[60%]">
        <LeftPanel isMicOn={isMicOn} setIsMicOn={setIsMicOn} isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn} />
      </div>
      <div className="flex-1 h-[60vh] md:h-full">
        <RightPanel currentStage={currentStage} setCurrentStage={setCurrentStage} token={token} loanAmount={loanAmount} setLoanAmount={setLoanAmount} tenure={tenure} setTenure={setTenure} />
      </div>
    </div>
  );
}
