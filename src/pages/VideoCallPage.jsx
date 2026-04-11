import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Lock, Upload, Download,
  CheckCircle2, ShieldCheck, Zap, Activity,
  Fingerprint, ScanFace, Banknote, Mic,
  AlertTriangle, RefreshCw, User,
} from 'lucide-react';
import useAudioCapture from '../hooks/useAudioCapture.js';
import useAIState from '../hooks/useAIState.js';
import {
  subscribeOrchestrator,
  getOrchestratorState,
  triggerAadhaarVerify,
  retryAadhaarUpload,
  updateOffer,
  triggerConsent,
  PHASES,
} from '../modules/orchestration/sessionOrchestrator.js';

/* ─── Helpers ─────────────────────────────────────────── */
function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}
function fmtINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ─── Color Tokens ────────────────────────────────────── */
const C = {
  bg: '#080810',
  panel: '#0A0A12',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)',
  text: '#F8FAFC',
  textSub: '#94A3B8',
  textMuted: '#475569',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

/* ─── Progress Steps ──────────────────────────────────── */
const STEPS = [
  { phase: PHASES.CHAT, icon: Fingerprint, label: 'IDENTIFY' },
  { phase: PHASES.AADHAAR_UPLOAD, icon: Upload, label: 'VERIFY' },
  { phase: PHASES.FACE_SCAN, icon: ScanFace, label: 'BIOMETRIC' },
  { phase: PHASES.OFFER, icon: Banknote, label: 'OFFER' },
  { phase: PHASES.CONSENT, icon: ShieldCheck, label: 'CONSENT' },
];

function phaseToStep(phase) {
  const order = [
    PHASES.CHAT,
    PHASES.AADHAAR_UPLOAD, PHASES.AADHAAR_VERIFY, PHASES.AADHAAR_DONE,
    PHASES.FACE_SCAN, PHASES.FACE_DONE,
    PHASES.BUREAU,
    PHASES.OFFER,
    PHASES.CONSENT,
    PHASES.COMPLETE,
  ];
  const idx = order.indexOf(phase);
  if (idx < 1) return 1;
  if (idx < 4) return 2;
  if (idx < 6) return 3;
  if (idx < 8) return 4;
  return 5;
}

/* ─── Typewriter ──────────────────────────────────────── */
function Typewriter({ phase }) {
  const captions = {
    [PHASES.CHAT]: ['Listening to your response...', 'Extracting financial data...', 'Analyzing your profile...'],
    [PHASES.AADHAAR_UPLOAD]: ['Waiting for Aadhaar upload...', 'Document verification ready...'],
    [PHASES.AADHAAR_VERIFY]: ['Reading Aadhaar document...', 'Fetching identity data...', 'Cross-referencing fields...'],
    [PHASES.AADHAAR_DONE]: ['Identity verified successfully...', 'Proceeding to biometric check...'],
    [PHASES.FACE_SCAN]: ['Scanning facial features...', 'Analyzing age from camera...', 'Comparing with document...'],
    [PHASES.FACE_DONE]: ['Biometric check complete...', 'Running credit assessment...'],
    [PHASES.BUREAU]: ['Connecting to credit bureau...', 'Pulling credit report...', 'Evaluating eligibility...'],
    [PHASES.OFFER]: ['Generating personalised offer...', 'Structuring loan terms...'],
    [PHASES.CONSENT]: ['Capturing verbal consent...', 'Generating audit trail...'],
    [PHASES.COMPLETE]: ['Session complete. Disbursement queued...'],
  };
  const list = captions[phase] || captions[PHASES.CHAT];
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const phrase = list[idx % list.length];

  useEffect(() => { setIdx(0); setText(''); setCharIdx(0); setDone(false); }, [phase]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setIdx(i => i + 1); setText(''); setCharIdx(0); setDone(false); }, 3000);
      return () => clearTimeout(t);
    }
    if (charIdx < phrase.length) {
      const t = setTimeout(() => { setText(phrase.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, 38);
      return () => clearTimeout(t);
    } else { setDone(true); }
  }, [charIdx, phrase, done]);

  return (
    <div className="flex items-center gap-2">
      <Activity size={13} style={{ color: C.blue }} className="animate-pulse flex-shrink-0" />
      <span style={{ fontSize: 11, color: C.textSub, letterSpacing: '0.05em' }}>
        {text}
        <span style={{ display: 'inline-block', width: 3, height: 11, background: C.blue, marginLeft: 3, verticalAlign: 'middle', animation: 'pulse 1s infinite' }} />
      </span>
    </div>
  );
}

/* ─── Speaking Bars ───────────────────────────────────── */
function SpeakingBars() {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: [`${20 + Math.random() * 30}%`, `${55 + Math.random() * 45}%`, `${20 + Math.random() * 30}%`] }}
          transition={{ duration: 0.55 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 3, borderRadius: 999, backgroundColor: C.blue, opacity: 0.85 }}
        />
      ))}
    </div>
  );
}

/* ─── Confidence Badge ────────────────────────────────── */
function ConfBadge({ level }) {
  const cfg = {
    High: { color: C.green, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    Medium: { color: C.yellow, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    Low: { color: C.red, bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  }[level] || { color: C.textMuted, bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.25)' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
      {level}
    </span>
  );
}

/* ─── Camera Frame ────────────────────────────────────── */
function CameraFrame({ isVideoOn, onCameraReady }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let active = null;
    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          active = s; setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
          onCameraReady?.();
        })
        .catch(() => onCameraReady?.());
    } else {
      stream?.getTracks().forEach(t => t.stop());
      setStream(null);
      onCameraReady?.();
    }
    return () => active?.getTracks().forEach(t => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOn]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, background: '#0D0D14' }}>
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isVideoOn && stream ? 1 : 0, transition: 'opacity 0.5s', transform: 'scaleX(-1)' }}
      />
      {(!isVideoOn || !stream) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VideoOff size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}
    </div>
  );
}

/* ─── Face Scan Overlay ───────────────────────────────── */
function FaceScanOverlay({ overlay }) {
  if (!overlay) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      >
        {overlay === 'scanning' && (
          <>
            {/* Scanning frame */}
            <div style={{ position: 'relative', width: 180, height: 200 }}>
              {/* Corner brackets */}
              {[{ top: 0, left: 0, borderRadius: '8px 0 0 0' }, { top: 0, right: 0, borderRadius: '0 8px 0 0' }, { bottom: 0, left: 0, borderRadius: '0 0 0 8px' }, { bottom: 0, right: 0, borderRadius: '0 0 8px 0' }].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, borderTop: i < 2 ? `2px solid ${C.blue}` : 'none', borderBottom: i >= 2 ? `2px solid ${C.blue}` : 'none', borderLeft: i % 2 === 0 ? `2px solid ${C.blue}` : 'none', borderRight: i % 2 === 1 ? `2px solid ${C.blue}` : 'none', ...pos }} />
              ))}
              {/* Scan line */}
              <motion.div
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)`, boxShadow: `0 0 12px ${C.blue}` }}
              />
              {/* Face dots */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScanFace size={60} style={{ color: `rgba(59,130,246,0.3)` }} />
              </div>
            </div>
            <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: 13, color: C.blue, fontWeight: 600, letterSpacing: '0.08em' }}>
              SCANNING FACE...
            </motion.p>
            <p style={{ fontSize: 11, color: C.textSub }}>Analysing biometric markers from camera</p>
          </>
        )}

        {overlay === 'scan_success' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px rgba(16,185,129,0.3)` }}>
              <CheckCircle2 size={36} style={{ color: C.green }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.green }}>Age Matched ✓</p>
            <p style={{ fontSize: 11, color: C.textSub }}>Camera age matches Aadhaar document</p>
          </motion.div>
        )}

        {overlay === 'scan_fail' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `2px solid ${C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={36} style={{ color: C.red }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.red }}>Age Mismatch Flagged</p>
            <p style={{ fontSize: 11, color: C.textSub }}>Session flagged for manual review</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Left Panel ──────────────────────────────────────── */
function LeftPanel({ isVideoOn, setIsVideoOn, isListening, isProcessing, startRecording, stopRecording, phase, leftOverlay, onJoined }) {
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  useEffect(() => {
    const onStart = () => setIsAiSpeaking(true);
    const onEnd = () => setIsAiSpeaking(false);
    window.addEventListener('ai_speaking_start', onStart);
    window.addEventListener('ai_speaking_end', onEnd);
    return () => { window.removeEventListener('ai_speaking_start', onStart); window.removeEventListener('ai_speaking_end', onEnd); };
  }, []);

  return (
    <div className="relative flex flex-col" style={{ flex: '0 0 62%', background: 'radial-gradient(ellipse at 50% 40%, #0F1628 0%, #0A0A14 60%, #060610 100%)', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Camera — pointer-events none so it never blocks button clicks */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <CameraFrame isVideoOn={isVideoOn} onCameraReady={() => onJoined?.()} />
      </div>

      {/* Face scan overlay — only captures events when actively shown */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: leftOverlay ? 'auto' : 'none' }}>
        <FaceScanOverlay overlay={leftOverlay} />
      </div>

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 12px', border: '1px solid rgba(239,68,68,0.3)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, flexShrink: 0, boxShadow: `0 0 8px ${C.red}`, animation: 'pulseGlow 1.5s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: '0.1em' }}>LIVE</span>
      </div>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 12px', border: '1px solid rgba(16,185,129,0.3)' }}>
        <Lock size={11} style={{ color: C.green }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.green, letterSpacing: '0.06em' }}>SECURE</span>
      </div>

      {/* Center AI avatar + controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4" style={{ position: 'relative', zIndex: 5 }}>
        {/* Glow + Avatar */}
        <div style={{ position: 'relative' }}>
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', filter: 'blur(16px)' }}
          />
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: `2px solid rgba(59,130,246,0.5)`, boxShadow: `0 0 28px rgba(59,130,246,0.35), 0 0 56px rgba(59,130,246,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: C.blue }}>AI</span>
          </div>
        </div>

        {/* Status text */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {!isAiSpeaking && isListening && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', boxShadow: '0 0 10px #F87171', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 15, fontFamily: 'Sora, sans-serif', color: isAiSpeaking ? C.blue : isListening ? '#F87171' : C.text, fontWeight: 600, transition: 'color 0.3s' }}>
              {isAiSpeaking ? 'AI Officer is Speaking...' : isListening ? 'Recording your response...' : 'Ready for your response...'}
            </span>
          </div>

          <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isAiSpeaking ? <SpeakingBars /> : (
              <button
                disabled={isAiSpeaking || isProcessing}
                onClick={isListening ? stopRecording : startRecording}
                style={{
                  padding: '8px 24px', borderRadius: 999, fontWeight: 600, fontSize: 13,
                  background: isListening ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isListening ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.18)'}`,
                  color: isListening ? '#F87171' : C.text,
                  cursor: isAiSpeaking || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isAiSpeaking || isProcessing ? 0.45 : 1,
                  boxShadow: isListening ? '0 0 18px rgba(248,113,113,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isProcessing ? 'Processing...' : isListening ? 'Tap to Stop & Send' : 'Tap to Speak'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom caption bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.border}`, flexShrink: 0, zIndex: 10 }}>
        <div className="flex-1 min-w-0">
          <Typewriter phase={phase} />
        </div>
        <button
          onClick={() => setIsVideoOn(v => !v)}
          style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${isVideoOn ? 'rgba(59,130,246,0.4)' : C.border}`, background: 'rgba(0,0,0,0.4)', boxShadow: isVideoOn ? '0 0 12px rgba(59,130,246,0.2)' : 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {isVideoOn ? <Video size={13} style={{ color: C.blue }} /> : <VideoOff size={13} style={{ color: C.textMuted }} />}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RIGHT PANEL COMPONENTS
══════════════════════════════════════════════════════════ */

/* ─── Phase: CHAT — Dynamic KYC Extraction ────────────── */
function PanelChat({ kycFields }) {
  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: C.text }}>Extracting Profile</h3>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid rgba(59,130,246,0.25)`, borderTopColor: C.blue }} />
      </div>
      <p style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>Listening to the conversation and extracting information...</p>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {kycFields.filter(f => f.value && f.value !== '—').map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{f.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{f.value}</span>
              </div>
              <ConfBadge level={f.confidence} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Placeholder rows for unfilled */}
        {kycFields.filter(f => !f.value || f.value === '—').map(f => (
          <div key={f.label} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: `1px dashed rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</span>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 60, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phase: AADHAAR_UPLOAD ────────────────────── */
function PanelAadhaarUpload({ aadhaar }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const hasError = aadhaar?.status === 'failed';

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setTimeout(() => triggerAadhaarVerify(f), 800);
  }

  // Reset file picker when aadhaar error changes (allow re-upload)
  useEffect(() => {
    if (hasError) setFile(null);
  }, [hasError]);

  return (
    <div className="p-5 flex flex-col gap-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Upload Aadhaar Card</h3>
        <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
          The AI has collected your basic details. Please upload your Aadhaar card so we can verify your identity and extract your date of birth.
        </p>
      </motion.div>

      {/* Error banner */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <AlertTriangle size={14} style={{ color: C.red, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 3 }}>Document Verification Failed</p>
            <p style={{ fontSize: 11, color: '#FCA5A5', lineHeight: 1.6 }}>
              {aadhaar.error || 'Could not read the Aadhaar document. Please upload a clear image with a visible QR code.'}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        style={{
          borderRadius: 14,
          border: file ? `1px solid ${C.green}` : hasError ? `2px dashed rgba(239,68,68,0.4)` : `2px dashed rgba(59,130,246,0.35)`,
          background: file ? 'rgba(16,185,129,0.06)' : hasError ? 'rgba(239,68,68,0.03)' : 'rgba(59,130,246,0.04)',
          padding: '32px 20px',
          cursor: file ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          transition: 'all 0.3s',
        }}
      >
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleFile(e.target.files[0])} />

        {file ? (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}>
              <CheckCircle2 size={40} style={{ color: C.green }} />
            </motion.div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{file.name}</span>
            <span style={{ fontSize: 11, color: C.textSub }}>Processing your document...</span>
          </>
        ) : (
          <>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <Upload size={36} style={{ color: hasError ? C.red : C.blue, opacity: 0.7 }} />
            </motion.div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{hasError ? 'Try uploading again' : 'Tap to upload Aadhaar'}</p>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>or drag and drop here • JPG, PNG, PDF</p>
            </div>
          </>
        )}
      </motion.div>

      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <ShieldCheck size={14} style={{ color: C.blue, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: C.textSub, lineHeight: 1.6 }}>Your document is processed locally. No raw files are transmitted to any external server.</p>
      </div>
    </div>
  );
}

/* ─── Phase: AADHAAR_VERIFY ───────────────────────────── */
function PanelAadhaarVerify() {
  const steps = ['Reading document data', 'Verifying security features', 'Cross-referencing fields', 'Extracting identity info'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 600);
      return () => clearTimeout(t);
    }
  }, [step, steps.length]);

  return (
    <div className="p-5 flex flex-col gap-5 items-center" style={{ paddingTop: 40 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid rgba(59,130,246,0.15)`, borderTopColor: C.blue }}
      />
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Verifying Aadhaar</h3>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ fontSize: 12, color: C.textSub }}>
            {steps[step]}...
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full flex flex-col gap-2" style={{ maxWidth: 280 }}>
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: i <= step ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i <= step ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
              {i <= step ? <CheckCircle2 size={11} style={{ color: C.green }} /> : <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.textMuted }} />}
            </div>
            <span style={{ fontSize: 12, color: i <= step ? C.text : C.textMuted, transition: 'color 0.4s' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phase: AADHAAR_DONE ─────────────────────────────── */
function PanelAadhaarDone({ aadhaar, kycMismatch }) {
  const fields = [
    { label: 'NAME', value: aadhaar.name, mismatch: kycMismatch?.nameMismatch },
    { label: 'DATE OF BIRTH', value: aadhaar.dob, mismatch: false },
    { label: 'AGE', value: aadhaar.age ? `${aadhaar.age} years` : 'N/A', mismatch: kycMismatch?.ageMismatch },
    { label: 'AADHAAR NUMBER', value: aadhaar.aadhaarNumber, mismatch: false },
  ];

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Verified badge */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.6 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.25)` }}>
        <CheckCircle2 size={24} style={{ color: C.green, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Aadhaar Verified ✓</p>
          <p style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Identity confirmed successfully</p>
        </div>
      </motion.div>

      {/* KYC Mismatch Warning */}
      {kycMismatch?.flagged && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} style={{ color: C.red, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>KYC Mismatch Detected</span>
          </div>
          <p style={{ fontSize: 11, color: '#FCA5A5', lineHeight: 1.6 }}>
            The details provided verbally do not match the Aadhaar document.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {kycMismatch.nameMismatch && (
              <div style={{ fontSize: 11, color: C.textSub }}>
                <span style={{ color: C.red }}>Name:</span> Stated “{kycMismatch.statedName}” ≠ Aadhaar “{kycMismatch.aadhaarName}”
              </div>
            )}
            {kycMismatch.ageMismatch && (
              <div style={{ fontSize: 11, color: C.textSub }}>
                <span style={{ color: C.red }}>Age:</span> Stated {kycMismatch.statedAge}y ≠ Aadhaar {kycMismatch.aadhaarAge}y
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Extracted fields */}
      <div className="flex flex-col gap-2">
        {fields.map((f, i) => (
          <motion.div key={f.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
            style={{ padding: '10px 14px', borderRadius: 10, background: f.mismatch ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${f.mismatch ? 'rgba(239,68,68,0.3)' : C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 10, color: f.mismatch ? '#FCA5A5' : C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block' }}>{f.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2, display: 'block' }}>{f.value}</span>
              </div>
              {f.mismatch && <AlertTriangle size={14} style={{ color: C.red, flexShrink: 0 }} />}
            </div>
          </motion.div>
        ))}
      </div>

      {kycMismatch?.flagged ? (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          onClick={retryAadhaarUpload}
          style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: C.red, border: `1px solid rgba(239,68,68,0.4)`, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
          <RefreshCw size={14} /> Upload Correct Document
        </motion.button>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontSize: 11, color: C.textSub, fontStyle: 'italic', textAlign: 'center' }}>
          Starting biometric age verification...
        </motion.p>
      )}
    </div>
  );
}

/* ─── Phase: FACE_SCAN / FACE_DONE ───────────────────── */
function PanelFaceScan({ faceAge, phase }) {
  return (
    <div className="p-5 flex flex-col gap-4 items-center" style={{ paddingTop: 32 }}>
      <ScanFace size={48} style={{ color: phase === PHASES.FACE_DONE ? (faceAge.status === 'matched' ? C.green : C.red) : C.blue, opacity: 0.8 }} />
      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: C.text }}>
        {phase === PHASES.FACE_SCAN ? 'Biometric Age Check' : faceAge.status === 'matched' ? 'Age Matched ✓' : 'Age Mismatch Detected'}
      </h3>

      {phase === PHASES.FACE_SCAN && (
        <p style={{ fontSize: 12, color: C.textSub, textAlign: 'center' }}>
          Camera is scanning your face. Please look directly at the camera.
        </p>
      )}

      {phase === PHASES.FACE_DONE && (
        <div className="w-full flex flex-col gap-3">
          {[
            { label: 'Camera Age Estimate', value: `${faceAge.estimatedAge} years`, good: true },
            { label: 'Aadhaar Age', value: `${faceAge.aadhaarAge} years`, good: true },
            { label: 'Age Delta', value: `${faceAge.delta} year${faceAge.delta !== 1 ? 's' : ''}`, good: faceAge.delta <= 5 },
            { label: 'Confidence Score', value: `${(faceAge.confidence * 100).toFixed(0)}%`, good: true },
            { label: 'Verdict', value: faceAge.status === 'matched' ? 'PASS' : 'FLAG — MISMATCH', good: faceAge.status === 'matched' },
          ].map((row, i) => (
            <motion.div key={row.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.textSub }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: row.good ? C.green : C.red }}>{row.value}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Phase: BUREAU ───────────────────────────────────── */
function PanelBureau({ bureau, policy }) {
  const checks = ['Connecting to CIBIL bureau', 'Pulling credit report', 'Evaluating DPD history', 'Checking written-off accounts', 'Running policy engine'];
  const [step, setStep] = useState(0);
  const isFailed = bureau?.status === 'fail' && policy?.decision;

  useEffect(() => {
    if (!isFailed && step < checks.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 400);
      return () => clearTimeout(t);
    }
  }, [step, checks.length, isFailed]);

  // If bureau has returned a FAIL, show the rejection + audit trail
  if (isFailed) {
    return (
      <div className="p-5 flex flex-col gap-4" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: `2px solid ${C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={30} style={{ color: C.red }} />
          </div>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: C.red }}>Application Declined</h3>
          <p style={{ fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 1.6 }}>
            Based on our credit assessment, we are unable to proceed.
          </p>
        </div>

        {/* Bureau Summary */}
        <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 10 }}>BUREAU REPORT</div>
          {[
            { label: 'Credit Score', value: bureau.creditScore, color: bureau.creditScore >= 650 ? C.green : C.red },
            { label: 'Active Loans', value: bureau.activeLoans },
            { label: 'DPD History', value: bureau.dpdHistory },
            { label: 'Written-Off', value: bureau.writtenOffAccounts, color: bureau.writtenOffAccounts > 0 ? C.red : C.green },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 11, color: C.textSub }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: row.color || C.text }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Policy Audit Trail */}
        {policy?.rules && (
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 10 }}>POLICY AUDIT TRAIL</div>
            {policy.rules.map((r, i) => (
              <motion.div key={r.rule} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < policy.rules.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: r.result === 'pass' ? 'rgba(16,185,129,0.15)' : r.result === 'fail' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${r.result === 'pass' ? C.green : r.result === 'fail' ? C.red : C.yellow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {r.result === 'pass' ? <CheckCircle2 size={9} style={{ color: C.green }} /> : r.result === 'fail' ? <AlertTriangle size={9} style={{ color: C.red }} /> : <Activity size={9} style={{ color: C.yellow }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{r.rule.replace(/_/g, ' ').toUpperCase()}</div>
                  <div style={{ fontSize: 10, color: C.textSub, lineHeight: 1.5 }}>{r.explanation}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.result === 'pass' ? C.green : r.result === 'fail' ? C.red : C.yellow, flexShrink: 0, textTransform: 'uppercase' }}>{r.result}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Loading animation
  return (
    <div className="p-5 flex flex-col gap-5 items-center" style={{ paddingTop: 40 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid rgba(245,158,11,0.15)`, borderTopColor: C.yellow }}
      />
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Credit Bureau Check</h3>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ fontSize: 12, color: C.textSub }}>
            {checks[step]}...
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full flex flex-col gap-2">
        {checks.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: i <= step ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i <= step ? C.yellow : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
              {i <= step ? <CheckCircle2 size={10} style={{ color: C.yellow }} /> : <div style={{ width: 3, height: 3, borderRadius: '50%', background: C.textMuted }} />}
            </div>
            <span style={{ fontSize: 11, color: i <= step ? C.text : C.textMuted, transition: 'color 0.4s' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phase: OFFER ────────────────────────────────────── */
function PanelOffer({ offer, bureau, policy, onUpdateOffer }) {
  const [amount, setAmount] = useState(offer.amount);
  const [tenure, setTenure] = useState(offer.tenure);
  const [showAudit, setShowAudit] = useState(false);
  const emi = calcEMI(amount, offer.interestRate, tenure);
  const loanFill = ((amount - 100000) / (500000 - 100000)) * 100;
  const tenureFill = ((tenure - 12) / (84 - 12)) * 100;
  const isRefer = policy?.decision === 'REFER';

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Bureau + Policy decision */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 10, background: isRefer ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.08)', border: `1px solid ${isRefer ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={16} style={{ color: isRefer ? C.yellow : C.green }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: isRefer ? C.yellow : C.green }}>
              Credit Score: {bureau.creditScore} — {isRefer ? 'Manual Review ⚠' : 'Eligible ✓'}
            </span>
            <p style={{ fontSize: 10, color: C.textSub, marginTop: 1 }}>{bureau.dpdHistory}</p>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: isRefer ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isRefer ? C.yellow : C.green, letterSpacing: '0.08em' }}>
            {policy?.decision || 'PASS'}
          </span>
        </div>
        {/* Quick bureau stats */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 6, borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          {[
            { label: 'Active Loans', value: bureau.activeLoans ?? 0 },
            { label: 'Written-Off', value: bureau.writtenOffAccounts ?? 0, bad: (bureau.writtenOffAccounts ?? 0) > 0 },
            { label: 'Utilization', value: `${bureau.creditUtilization ?? 0}%` },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.05em', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.bad ? C.red : C.text }}>{s.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Offer card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: 14, background: 'linear-gradient(145deg, rgba(20,20,32,0.9), rgba(10,10,18,1))', border: `1px solid ${C.borderHi}`, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: C.blue, opacity: 0.06, borderRadius: '50%', filter: 'blur(40px)' }} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <Zap size={12} style={{ color: C.blue }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: '0.1em' }}>PERSONALISED OFFER</span>
        </div>

        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 4 }}>APPROVED AMOUNT</div>
        <motion.div key={amount} initial={{ opacity: 0.7, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: '-0.03em', marginBottom: 16 }}>
          {fmtINR(amount)}
        </motion.div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <div>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 3 }}>EMI / MONTH</div>
            <motion.div key={emi} initial={{ opacity: 0.7 }} animate={{ opacity: 1 }} style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{fmtINR(emi)}</motion.div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 3 }}>INTEREST RATE</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{offer.interestRate}% p.a.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 3 }}>TENURE</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{tenure} mo</div>
          </div>
        </div>
      </motion.div>

      {/* Sliders */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 11, color: C.textSub, marginBottom: 12 }}>Adjust your preferences:</p>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.textSub }}>Loan Amount</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>{fmtINR(amount)}</span>
          </div>
          <input type="range" min={100000} max={500000} step={10000} value={amount}
            onChange={e => { const v = Number(e.target.value); setAmount(v); onUpdateOffer(v, tenure); }}
            style={{ width: '100%', height: 4, borderRadius: 4, outline: 'none', cursor: 'pointer', background: `linear-gradient(to right, ${C.blue} 0%, ${C.blue} ${loanFill}%, rgba(255,255,255,0.08) ${loanFill}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.textSub }}>Tenure</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>{tenure} months</span>
          </div>
          <input type="range" min={12} max={84} step={6} value={tenure}
            onChange={e => { const v = Number(e.target.value); setTenure(v); onUpdateOffer(amount, v); }}
            style={{ width: '100%', height: 4, borderRadius: 4, outline: 'none', cursor: 'pointer', background: `linear-gradient(to right, ${C.blue} 0%, ${C.blue} ${tenureFill}%, rgba(255,255,255,0.08) ${tenureFill}%, rgba(255,255,255,0.08) 100%)` }}
          />
        </div>
      </motion.div>

      {/* Policy Audit Toggle */}
      {policy?.rules && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <button onClick={() => setShowAudit(!showAudit)}
            style={{ width: '100%', padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📋 Policy Audit Trail ({policy.rules.filter(r => r.result === 'pass').length}/{policy.rules.length} passed)</span>
            <span style={{ fontSize: 10 }}>{showAudit ? '▲' : '▼'}</span>
          </button>
          {showAudit && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
              {policy.rules.map((r, i) => (
                <div key={r.rule} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < policy.rules.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                  <span style={{ fontSize: 12 }}>{r.result === 'pass' ? '✅' : r.result === 'fail' ? '❌' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{r.rule.replace(/_/g, ' ')}</span>
                    <p style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{r.explanation}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => triggerConsent('Yes, I agree to the terms and conditions of this loan offer')}
        style={{ width: '100%', padding: '14px 0', borderRadius: 10, background: C.text, color: C.bg, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,255,255,0.12)', letterSpacing: '0.02em' }}
      >
        Accept Offer & Confirm →
      </motion.button>
    </div>
  );
}

/* ─── Phase: CONSENT ──────────────────────────────────── */
function PanelConsent({ consent, token }) {
  function downloadAuditTrail() {
    const blob = new Blob([
      `CONSENT TRAIL — AgentFinance AI\n\nSession ID: ${token}\nTimestamp: ${consent.timestamp}\n\nConsent Phrase: "${consent.phrase}"\n\nSHA-256 Hash: ${consent.hash}\n\nThis is a tamper-evident record. Do not modify.`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consent-${token}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.6 }}
        style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px rgba(16,185,129,0.2)` }}>
          <CheckCircle2 size={36} style={{ color: C.green }} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${C.blue}` }}>
        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 6 }}>DETECTED CONSENT PHRASE</div>
        <p style={{ fontSize: 13, color: C.text, fontStyle: 'italic', lineHeight: 1.6 }}>"{consent.phrase}"</p>
        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Captured at {consent.timestamp}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 6 }}>SHA-256 CONSENT HASH</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.textSub, wordBreak: 'break-all', lineHeight: 1.7 }}>{consent.hash}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <ShieldCheck size={12} style={{ color: C.green }} />
          <span style={{ fontSize: 11, color: C.green }}>Tamper-evident record stored</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <CheckCircle2 size={16} style={{ color: C.green }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: '0.02em' }}>CONSENT VERIFIED ✓</span>
      </motion.div>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        onClick={downloadAuditTrail}
        style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: 'transparent', color: C.textSub, border: `1px solid ${C.borderHi}`, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Download size={13} /> Export Consent Trail
      </motion.button>
    </div>
  );
}

/* ─── Phase: COMPLETE ─────────────────────────────────── */
function PanelComplete({ offer, token }) {
  const navigate = useNavigate();
  const emi = calcEMI(offer.amount, offer.interestRate, offer.tenure);

  return (
    <div className="p-5 flex flex-col gap-5 items-center" style={{ paddingTop: 40, textAlign: 'center' }}>
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.8 }}
        style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px rgba(16,185,129,0.2)` }}>
        <CheckCircle2 size={40} style={{ color: C.green }} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', marginBottom: 8 }}>Loan Approved!</h3>
        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>Your application is complete. Disbursement is queued for processing.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ width: '100%', padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[{ label: 'AMOUNT', value: fmtINR(offer.amount) }, { label: 'EMI', value: `${fmtINR(emi)}/mo` }, { label: 'TENURE', value: `${offer.tenure} mo` }].map(item => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.08em' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace' }}>
        SESSION: {token?.toUpperCase() || 'TKN-DEMO'}
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        onClick={() => navigate('/ops')}
        style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: C.text, color: C.bg, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', letterSpacing: '0.02em' }}>
        View Ops Dashboard
      </motion.button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RIGHT PANEL (ORCHESTRATED)
══════════════════════════════════════════════════════════ */
function RightPanel({ orchState, kycFields, token }) {
  const { phase, aadhaar, kycMismatch, faceAge, bureau, policy, offer, consent } = orchState;
  const currentStep = phaseToStep(phase);

  function renderContent() {
    switch (phase) {
      case PHASES.CHAT:
        return <PanelChat kycFields={kycFields} />;
      case PHASES.AADHAAR_UPLOAD:
        return <PanelAadhaarUpload aadhaar={aadhaar} />;
      case PHASES.AADHAAR_VERIFY:
        return <PanelAadhaarVerify />;
      case PHASES.AADHAAR_DONE:
        return <PanelAadhaarDone aadhaar={aadhaar} kycMismatch={kycMismatch} />;
      case PHASES.FACE_SCAN:
        return <PanelFaceScan faceAge={faceAge} phase={phase} />;
      case PHASES.FACE_DONE:
        return <PanelFaceScan faceAge={faceAge} phase={phase} />;
      case PHASES.BUREAU:
        return <PanelBureau bureau={bureau} policy={policy} />;
      case PHASES.OFFER:
        return <PanelOffer offer={offer} bureau={bureau} policy={policy} onUpdateOffer={(a, t) => updateOffer(a, t)} />;
      case PHASES.CONSENT:
        return <PanelConsent consent={consent} token={token} />;
      case PHASES.COMPLETE:
        return <PanelComplete offer={offer} token={token} />;
      default:
        return <PanelChat kycFields={kycFields} />;
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ flex: 1, background: C.panel, borderLeft: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.14em', fontWeight: 600, marginBottom: 3 }}>SESSION LOG</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            TKN-{token?.slice(0, 4).toUpperCase() || 'DEMO'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.06em' }}>LIVE</span>
        </div>
      </div>

      {/* Progress stepper */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.15)', flexShrink: 0 }}>
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isPast = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
              {idx < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 8, left: '50%', right: '-50%', height: 1, background: isPast ? C.green : C.border, transition: 'background 0.5s' }} />
              )}
              <div style={{ width: 18, height: 18, borderRadius: '50%', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPast ? C.green : isActive ? C.blue : C.bg, border: `1px solid ${isPast ? C.green : isActive ? C.blue : C.textMuted}`, transition: 'all 0.4s' }}>
                {isPast && <CheckCircle2 size={9} style={{ color: '#000' }} strokeWidth={3.5} />}
                {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.text }} />}
              </div>
              <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.04em', marginTop: 5, color: isPast ? C.textSub : isActive ? C.text : C.textMuted, transition: 'color 0.4s' }}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Dynamic content */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function VideoCallPage() {
  const { token } = useParams();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [orchState, setOrchState] = useState(() => getOrchestratorState());

  // Subscribe to orchestrator changes
  useEffect(() => {
    const unsub = subscribeOrchestrator(snap => setOrchState(snap));
    return unsub;
  }, []);

  // Force dark bg
  useEffect(() => {
    document.body.style.backgroundColor = C.bg;
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  // Audio capture
  const { isListening, isProcessing, startRecording, stopRecording } = useAudioCapture();

  // AI state (for live KYC extraction)
  const aiState = useAIState({ debounceMs: 400 });

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex" style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 10, overflow: 'hidden' }}>
        <LeftPanel
          isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
          isListening={isListening} isProcessing={isProcessing}
          startRecording={startRecording} stopRecording={stopRecording}
          phase={orchState.phase}
          leftOverlay={orchState.leftOverlay}
          onJoined={() => { }}
        />
        <RightPanel
          orchState={orchState}
          kycFields={aiState.kycFields}
          token={token}
        />
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col" style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 10, overflow: 'hidden' }}>
        <div style={{ flex: '0 0 42%', position: 'relative', overflow: 'hidden' }}>
          <LeftPanel
            isVideoOn={isVideoOn} setIsVideoOn={setIsVideoOn}
            isListening={isListening} isProcessing={isProcessing}
            startRecording={startRecording} stopRecording={stopRecording}
            phase={orchState.phase}
            leftOverlay={orchState.leftOverlay}
            onJoined={() => { }}
          />
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RightPanel orchState={orchState} kycFields={aiState.kycFields} token={token} />
        </div>
      </div>
    </>
  );
}
