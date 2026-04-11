import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  Video, VideoOff, Lock, Upload, Download,
  CheckCircle2, ShieldCheck, Zap, Activity,
  Fingerprint, ScanFace, Banknote, Mic,
  AlertTriangle, RefreshCw, User, Check,
  Star, Shield
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
  finalizeNegotiation,
  PHASES,
} from '../modules/orchestration/sessionOrchestrator.js';
import { processVideoFrame } from '../modules/interaction/liveInteraction.js';

/* ─── Helpers ────────────────────────────────────────── */
function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}
function fmtINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ─── Animated Number Component ─────────────────────── */
function AnimatedNumber({ value, type = 'number' }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => {
    if (type === 'currency') return fmtINR(Math.round(current));
    if (type === 'percent') return current.toFixed(1) + '%';
    if (type === 'mo') return Math.round(current) + ' mo';
    return Math.round(current);
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

/* ─── Color Tokens ──────────────────────────────────── */
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

/* ─── Progress Steps ───────────────────────────────── */
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

/* ─── Typewriter ────────────────────────────────────── */
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

/* ─── Speaking Bars ─────────────────────────────────── */
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

/* ─── Confidence Badge ─────────────────────────────── */
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

/* ─── Camera Frame ──────────────────────────────────── */
function CameraFrame({ isVideoOn, onCameraReady, phase }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let active = null;

    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          active = s;
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
          onCameraReady?.();
        })
        .catch(() => onCameraReady?.());
    } else {
      stream?.getTracks().forEach(t => t.stop());
      setStream(null);
      onCameraReady?.();
    }
    return () => {
      active?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOn]);

  const hasScanned = useRef(false);
  useEffect(() => {
    if (phase !== PHASES.FACE_SCAN) {
      hasScanned.current = false;
    }

    if (phase === PHASES.FACE_SCAN && isVideoOn && videoRef.current && canvasRef.current && !hasScanned.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        hasScanned.current = true;
        // Wait 800ms for the user to settle into the frame
        const timeout = setTimeout(() => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.8);
          processVideoFrame(frameData).catch(console.error);
        }, 800);
        return () => clearTimeout(timeout);
      }
    }
  }, [phase, isVideoOn]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, background: '#0D0D14' }}>
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isVideoOn && stream ? 1 : 0, transition: 'opacity 0.5s', transform: 'scaleX(-1)' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {(!isVideoOn || !stream) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VideoOff size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}
    </div>
  );
}

/* ─── Face Scan Overlay ────────────────────────────── */
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

/* ─── Left Panel ────────────────────────────────────── */
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
        <CameraFrame isVideoOn={isVideoOn} onCameraReady={() => onJoined?.()} phase={phase} />
      </div>

      {/* Face scan overlay â€” only captures events when actively shown */}
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RIGHT PANEL COMPONENTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* ─── Phase: CHAT ─ Dynamic KYC Extraction ────────── */
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
        {kycFields.filter(f => f.value === '—' || !f.value).map(f => (
          <div key={f.label} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: `1px dashed rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</span>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 60, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phase: AADHAAR_UPLOAD ──────────────────────── */
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

/* ─── Phase: AADHAAR_VERIFY ───────────────────────── */
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

/* ─── Phase: AADHAAR_DONE ─────────────────────────── */
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
                <span style={{ color: C.red }}>Name:</span> Stated â€œ{kycMismatch.statedName}â€ â‰  Aadhaar â€œ{kycMismatch.aadhaarName}â€
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
  let title = 'Biometric Age Check';
  let titleColor = C.text;
  let iconColor = C.blue;

  if (phase === PHASES.FACE_DONE) {
    if (faceAge.status === 'matched') {
      title = 'Age Matched ✓';
      titleColor = C.text;
      iconColor = C.green;
    } else if (faceAge.status === 'spoof') {
      title = 'LIVENESS SPOOF DETECTED';
      titleColor = C.red;
      iconColor = C.red;
    } else {
      title = 'Age Mismatch Detected';
      titleColor = C.text;
      iconColor = C.red;
    }
  }

  return (
    <div className="p-5 flex flex-col gap-4 items-center" style={{ paddingTop: 32 }}>
      <ScanFace size={48} style={{ color: iconColor, opacity: 0.8 }} />
      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: titleColor }}>
        {title}
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
            { label: 'Age Delta', value: `${faceAge.delta} year${faceAge.delta !== 1 ? 's' : ''}`, good: faceAge.delta <= 12 },
            { label: 'Liveness Match', value: faceAge.status !== 'spoof' ? 'LIVE PERSON' : 'SPOOF (PHOTO/VIDEO)', good: faceAge.status !== 'spoof' },
            { label: 'Verdict', value: faceAge.status === 'matched' ? 'PASS' : 'FLAGGED', good: faceAge.status === 'matched' },
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

/* --- Phase: BUREAU -------------------------------------- */
function PanelBureau({ bureau, policy }) {
  const checks = ['Connecting to CIBIL bureau', 'Pulling credit report', 'Evaluating DPD history', 'Checking written-off accounts', 'Running policy engine'];
  const [step, setStep] = useState(0);
  const isFailed = bureau?.status === 'fail' || policy?.decision === 'FAIL';

  useEffect(() => {
    if (!isFailed && step < checks.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 400);
      return () => clearTimeout(t);
    }
  }, [step, checks.length, isFailed]);

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

        {policy?.rules && (
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 10 }}>POLICY AUDIT TRAIL</div>
            {policy.rules.map((r, i) => (
              <div key={r.rule} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < policy.rules.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                <span style={{ fontSize: 12 }}>{r.result === 'pass' ? '✅' : r.result === 'fail' ? '❌' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{r.rule}</span>
                  <p style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{r.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-6" style={{ paddingTop: 40 }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ width: 100, height: 100, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.1)', borderTopColor: C.blue }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={32} style={{ color: C.blue }} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Bureau Integration</h3>
        <p style={{ fontSize: 12, color: C.textSub }}>Fetching real-time credit data and evaluating policy gates...</p>
      </div>

      <div className="flex flex-col gap-3">
        {checks.map((c, i) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step >= i ? 1 : 0.3, transition: 'opacity 0.3s' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: step > i ? C.green : step === i ? 'rgba(59,130,246,0.1)' : 'transparent', border: `1px solid ${step > i ? C.green : step === i ? C.blue : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {step > i ? <Check size={10} style={{ color: '#000' }} /> : step === i && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.blue }} />}
            </div>
            <span style={{ fontSize: 11, color: step === i ? C.text : C.textSub, fontWeight: step === i ? 600 : 400 }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Phase: OFFER -------------------------------------- */
function PanelOffer({ offer, bureau, policy, negotiation, onUpdateOffer }) {
  const [showAudit, setShowAudit] = useState(false);
  const emi = calcEMI(offer.amount, offer.interestRate, offer.tenure);
  const { policyLimits, log: negLog, currentRound } = negotiation || {};
  const maxAmount = policyLimits?.maxAmount || 500000;
  const eligibilityPct = Math.min(100, Math.round((offer.amount / maxAmount) * 100));
  const isRefer = policy?.decision === 'REFER';

  const renderIcon = (name) => {
    switch (name) {
      case 'star': return <Star size={14} style={{ color: C.yellow }} />;
      case 'zap': return <Zap size={14} style={{ color: C.blue }} />;
      case 'shield': return <Shield size={14} style={{ color: C.green }} />;
      default: return <Star size={14} style={{ color: C.text }} />;
    }
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Intelligence Header */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.12em' }}>ENGINE INTELLIGENCE</span>
          <div style={{ padding: '2px 8px', borderRadius: 20, background: isRefer ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isRefer ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, fontSize: 8, fontWeight: 800, color: isRefer ? C.yellow : C.green }}>
            {isRefer ? 'MANUAL REVIEW REQ' : 'POLICY PASSED'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { icon: ShieldCheck, label: 'Credit', val: bureau.creditScore, color: C.green },
            { icon: Activity, label: 'Risk', val: isRefer ? 'Medium' : 'Low', color: isRefer ? C.yellow : C.blue },
            { icon: Banknote, label: 'Income', val: 'Verified', color: C.yellow }
          ].map((inf, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * idx }}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><inf.icon size={11} style={{ color: inf.color }} /></div>
              <div style={{ fontSize: 9, color: C.text, fontWeight: 700, marginBottom: 1 }}>{inf.val}</div>
              <div style={{ fontSize: 7, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{inf.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Live offer card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative', overflow: 'hidden', padding: '18px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(15,25,55,0.98) 0%, rgba(10,10,18,1) 100%)',
          border: `1px solid ${currentRound > 0 ? C.blue : C.borderHi}`,
          boxShadow: currentRound > 0 ? `0 0 40px rgba(59,130,246,0.15)` : '0 20px 50px rgba(0,0,0,0.5)'
        }}>

        <AnimatePresence>
          {currentRound > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, ${C.blue}, transparent)` }} />
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, position: 'relative' }}>
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}` }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: C.blue, letterSpacing: '0.12em' }}>
            {currentRound > 0 ? `NEGOTIATION ACTIVE • ROUND ${currentRound}` : 'PERSONALISED LOAN OFFER'}
          </span>
        </div>

        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 3 }}>APPROVED AMOUNT</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 8, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
          <AnimatedNumber value={offer.amount} type="currency" />
        </div>

        {policyLimits && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: C.textSub, fontWeight: 600 }}>Policy Headroom</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: eligibilityPct > 95 ? C.yellow : C.green }}>
                {eligibilityPct}% OF MAX LIMIT
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 10, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${eligibilityPct}%` }} transition={{ duration: 1.2, ease: 'circOut' }}
                style={{ height: '100%', borderRadius: 10, background: eligibilityPct > 95 ? `linear-gradient(90deg, ${C.blue}, ${C.yellow})` : `linear-gradient(90deg, ${C.blue}, #00d2ff)` }} />
            </div>
            {eligibilityPct >= 100 && (
              <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: 8, color: C.yellow, marginTop: 7, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.05)', padding: '4px 8px', borderRadius: 4 }}>
                <AlertTriangle size={10} /> {policyLimits.policyNote}
              </motion.div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          {[
            { label: 'EMI/MO', val: emi, t: 'currency' },
            { label: 'RATE P.A.', val: offer.interestRate, t: 'percent' },
            { label: 'TENURE', val: offer.tenure, t: 'mo' }
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}><AnimatedNumber value={s.val} type={s.t} /></div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 3 Offer Options from Policy Engine before Negotiation starts */}
      {currentRound === 0 && policyLimits?.alternatives && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, margin: '4px 0' }}>
          {policyLimits.alternatives.map((alt) => {
            const isSelected = offer.amount === alt.amount && offer.tenure === alt.tenure;
            return (
              <motion.div key={alt.id}
                onClick={() => onUpdateOffer?.(alt.amount, alt.tenure)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: '0 0 auto', width: '100px', cursor: 'pointer',
                  padding: '12px 10px', borderRadius: 12,
                  background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? C.blue : C.border}`
                }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{renderIcon(alt.icon)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.blue : C.text, textAlign: 'center', marginBottom: 4 }}>{alt.title}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text, textAlign: 'center' }}>{fmtINR(alt.amount)}</div>
                <div style={{ fontSize: 8, color: C.textMuted, textAlign: 'center', marginTop: 2 }}>{alt.tenure} mo @ {alt.interestRate}%</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Negotiation Log */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={12} style={{ color: C.blue }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: C.textSub, letterSpacing: '0.08em' }}>NEGOTIATION AUDIT TRAIL</span>
        </div>
        <div style={{ maxHeight: 130, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {!negLog || negLog.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: C.textMuted, fontSize: 11, fontStyle: 'italic', opacity: 0.6 }}>
              Awaiting verbal negotiation...
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {negLog.map((entry, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: entry.type === 'AI' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'flex-start', borderBottom: i < negLog.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: entry.type === 'AI' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${entry.type === 'AI' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, fontWeight: 900, color: entry.type === 'AI' ? C.blue : C.green }}>{entry.type === 'AI' ? 'AI' : 'U'}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: entry.type === 'AI' ? C.blue : C.green, marginBottom: 2 }}>{entry.type === 'AI' ? 'AI Officer' : 'You'}</div>
                    <p style={{ fontSize: 11, color: C.textSub, lineHeight: 1.5, margin: 0 }}>{entry.message}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Policy Audit Toggle */}
      {policy?.rules && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <button onClick={() => setShowAudit(!showAudit)}
            style={{ width: '100%', padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Policy Audit Trail ({policy.rules.filter(r => r.result === 'pass').length}/{policy.rules.length} passed)</span>
            <span style={{ fontSize: 10 }}>{showAudit ? '▲' : '▼'}</span>
          </button>
          {showAudit && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
              {policy.rules.map((r, i) => (
                <div key={r.rule} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < policy.rules.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                  <span style={{ fontSize: 12 }}>{r.result === 'pass' ? '✅' : r.result === 'fail' ? '❌' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{r.rule}</span>
                    <p style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{r.explanation}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action Hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(59,130,246,0.05)', border: `1px solid rgba(59,130,246,0.15)` }}>
        <Mic size={14} style={{ color: C.blue }} />
        <div style={{ fontSize: 10, color: C.textSub, lineHeight: 1.4 }}>
          Say <span style={{ color: C.text, fontWeight: 700 }}>"Why is the amount capped?"</span> or <span style={{ color: C.text, fontWeight: 700 }}>"Reduce EMI"</span>
        </div>
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={() => finalizeNegotiation('I accept these terms')}
        style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: C.text, color: C.bg, fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(255,255,255,0.08)', letterSpacing: '0.05em' }}>
        LOCK OFFER TERMS
      </motion.button>
    </div>
  );
}


/* ─── Phase: CONSENT ────────────────────────────────── */
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

/* ─── Phase: COMPLETE ───────────────────────────────── */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RIGHT PANEL (ORCHESTRATED)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function RightPanel({ orchState, kycFields, token }) {
  const { phase, aadhaar, kycMismatch, faceAge, bureau, policy, offer, consent, negotiation } = orchState;
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
        return <PanelOffer offer={offer} bureau={bureau} policy={policy} negotiation={negotiation} onUpdateOffer={(a, t) => updateOffer(a, t)} />;
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
