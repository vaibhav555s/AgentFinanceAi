import { useNavigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import {
  Video, Shield, Zap, Link as LinkIcon, MessageCircle,
  ShieldCheck, CheckCircle, Lock, FileText, Mic,
  User, Activity, TrendingUp
} from 'lucide-react';

/* ── Animation Variants ─────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Count-up hook ─────────────────────────────── */
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ''));
    const raf = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numeric));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, target, duration]);

  return { ref, count };
}

/* ── Feature Card ──────────────────────────────── */
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass-card p-7 flex flex-col gap-4 cursor-default"
      style={{
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        <Icon size={20} style={{ color: '#3B82F6' }} />
      </div>
      <div>
        <h3
          className="text-base font-semibold mb-1.5"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Step Card ─────────────────────────────────── */
function StepCard({ number, icon: Icon, title, description, delay }) {
  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card p-6 flex flex-col gap-3 cursor-default min-w-0"
      style={{ flex: '1 1 0', transition: 'box-shadow 0.25s ease, border-color 0.25s ease' }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.3), 0 8px 32px rgba(0,0,0,0.25)';
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'rgba(59,130,246,0.18)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          {number}
        </div>
        <Icon size={18} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div>
        <h4
          className="text-sm font-semibold mb-1"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}
        >
          {title}
        </h4>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Stat Item ─────────────────────────────────── */
function StatItem({ value, label, suffix = '', isSpecial = false }) {
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
  const hasNumeric = !isNaN(numeric) && numeric > 0;
  const { ref, count } = useCountUp(value);

  return (
    <div ref={ref} className="flex flex-col items-center text-center gap-2">
      <span
        className="gradient-text-stat"
        style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, lineHeight: 1 }}
      >
        {isSpecial ? value : hasNumeric ? `${count}${suffix}` : value}
      </span>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

/* ── Hero Preview Card ─────────────────────────── */
function HeroPreviewCard() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0], rotate: [-2, -1, -2] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="glass-card p-4 w-full max-w-sm mx-auto"
      style={{
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.15)',
        transform: 'rotate(-2deg)',
      }}
    >
      {/* Mock video call UI */}
      <div
        className="rounded-xl overflow-hidden mb-3"
        style={{ background: '#0D1117', aspectRatio: '16/9', position: 'relative' }}
      >
        {/* Fake video tiles */}
        <div className="absolute inset-0 flex gap-1.5 p-1.5">
          {/* Main video */}
          <div
            className="flex-1 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.2)', border: '2px solid rgba(59,130,246,0.4)' }}
              >
                <User size={16} style={{ color: '#3B82F6' }} />
              </div>
              <div className="flex items-center gap-0.5">
                {[3, 5, 2, 6, 4].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, h / 3, 1] }}
                    transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity }}
                    style={{ width: 2, height: h * 2, background: '#3B82F6', borderRadius: 2, transformOrigin: 'bottom' }}
                  />
                ))}
              </div>
            </div>
            {/* AI badge */}
            <div
              className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#60A5FA' }}
            >
              <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              AI Agent
            </div>
          </div>
          {/* Side panel */}
          <div className="w-24 flex flex-col gap-1.5">
            <div
              className="flex-1 rounded-lg p-1.5"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <div className="text-[8px] font-semibold mb-1" style={{ color: '#10B981' }}>ID VERIFIED</div>
              <div className="flex items-center gap-0.5">
                <ShieldCheck size={8} style={{ color: '#10B981' }} />
                <div className="text-[7px]" style={{ color: 'rgba(16,185,129,0.8)' }}>Liveness ✓</div>
              </div>
            </div>
            <div
              className="rounded-lg p-1.5"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <div className="text-[8px] font-semibold mb-0.5" style={{ color: '#60A5FA' }}>CREDIT</div>
              <div className="text-[10px] font-bold" style={{ color: '#F8FAFC' }}>742</div>
              <div className="mt-0.5 rounded-full overflow-hidden" style={{ height: 2, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ width: '74%', height: '100%', background: 'linear-gradient(90deg, #3B82F6, #10B981)' }} />
              </div>
            </div>
            <div
              className="rounded-lg p-1.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-[7px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Offer</div>
              <div className="text-[9px] font-bold" style={{ color: '#F8FAFC' }}>₹2.5L</div>
              <div className="text-[7px]" style={{ color: '#10B981' }}>@ 10.5%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call controls bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1.5">
          {[Mic, Video, Activity].map((Icon, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: i === 0 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <Icon size={11} style={{ color: i === 0 ? '#3B82F6' : 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[9px] font-semibold"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          Accept Offer →
        </div>
      </div>
    </motion.div>
  );
}

/* ── Trust Badge ───────────────────────────────── */
function TrustBadge({ icon: Icon, text }) {
  return (
    <div
      className="glass-pill flex items-center gap-2 px-3 py-2"
      style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
    >
      <Icon size={13} style={{ color: '#3B82F6' }} />
      {text}
    </div>
  );
}

/* ── Section Wrapper ───────────────────────────── */
function Section({ children, className = '', style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={`relative z-10 ${className}`}
      style={style}
    >
      {children}
    </motion.section>
  );
}

/* ── MAIN COMPONENT ────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: 'Live AI Interview',
      description: 'Our AI agent conducts the entire loan interview over a secure video call. No forms, just a natural conversation that feels effortless.',
    },
    {
      icon: Shield,
      title: 'Real-Time Verification',
      description: 'Identity, liveness, PAN, Aadhaar — verified instantly as you speak. No uploads, no waiting, no back-and-forth emails.',
    },
    {
      icon: Zap,
      title: 'Instant Decision',
      description: 'Credit scoring, fraud detection, and a personalised loan offer — all computed before the call ends. Truly instant approvals.',
    },
  ];

  const steps = [
    { icon: LinkIcon, title: 'Receive Link', description: 'Tokenised link via SMS or WhatsApp — unique to each applicant.' },
    { icon: Video, title: 'Join Call', description: 'Browser-based, no app needed. Works on any device, anywhere.' },
    { icon: MessageCircle, title: 'AI Interview', description: 'Conversational KYC extraction powered by our language model.' },
    { icon: ShieldCheck, title: 'Verification', description: 'Documents, liveness detection, fraud check — all real-time.' },
    { icon: CheckCircle, title: 'Loan Offer', description: 'Personalised offer accepted on the call. Disbursed within hours.' },
  ];

  const stats = [
    { value: '5', suffix: ' mins', label: 'Average Onboarding Time', isSpecial: false, display: '< 5 mins' },
    { value: '94', suffix: '%', label: 'Application Completion Rate', isSpecial: false },
    { value: 'Zero', suffix: '', label: 'Branch Visits Required', isSpecial: true },
    { value: '100', suffix: '%', label: 'AI-Powered Decisions', isSpecial: false },
  ];

  return (
    <div
      className="relative min-h-screen"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Background orbs ─────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -50, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="orb"
          style={{
            width: 700,
            height: 700,
            top: '-15%',
            left: '-10%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          }}
        />
        <motion.div
          animate={{
            x: [0, -50, 25, 0],
            y: [0, 40, -30, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="orb"
          style={{
            width: 600,
            height: 600,
            bottom: '-10%',
            right: '-8%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
          }}
        />
        <motion.div
          animate={{
            x: [0, 30, -15, 0],
            y: [0, -20, 35, 0],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="orb"
          style={{
            width: 400,
            height: 400,
            top: '40%',
            left: '40%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── HERO ────────────────────────────────── */}
      <section className="relative z-10 flex items-center justify-center min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 glass-pill px-4 py-2 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Live AI Loan Onboarding — Built for India
            </span>
          </motion.div>

          {/* Heading */}
          <div className="mb-6">
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="leading-tight mb-2"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(38px, 6vw, 72px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Loan Approvals.
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="leading-tight"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(38px, 6vw, 72px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Reimagined{' '}
              <span className="gradient-text-blue">with AI.</span>
            </motion.h1>
          </div>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.46 }}
            className="mx-auto mb-10 text-lg leading-relaxed"
            style={{
              color: 'var(--text-secondary)',
              maxWidth: 520,
              fontSize: 'clamp(15px, 2vw, 18px)',
            }}
          >
            End-to-end loan onboarding through a live AI video call.
            No forms. No branches. No waiting.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.56 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-8"
          >
            <button
              onClick={() => navigate('/session/demo-token-123')}
              className="btn-primary flex items-center gap-2 text-sm px-6 py-3"
            >
              <Video size={16} />
              Start Demo Session
            </button>
            <button
              onClick={() => navigate('/ops')}
              className="btn-outline flex items-center gap-2 text-sm px-6 py-3"
            >
              <Activity size={16} />
              View Ops Dashboard
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.66 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-16"
          >
            <TrustBadge icon={Lock} text="256-bit Encrypted" />
            <TrustBadge icon={ShieldCheck} text="RBI Compliant" />
            <TrustBadge icon={Zap} text="AI-Powered" />
            <TrustBadge icon={FileText} text="Zero Paperwork" />
          </motion.div>

          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroPreviewCard />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────── */}
      <Section className="px-4 pb-0" style={{ paddingTop: 120 }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
            <span
              className="inline-block mb-4 text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#3B82F6' }}
            >
              Capabilities
            </span>
            <h2
              className="mb-4"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Everything happens on the call.
            </h2>
            <p
              className="mx-auto text-base"
              style={{ color: 'var(--text-secondary)', maxWidth: 480 }}
            >
              No form fills. No branch visits. Just a conversation.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ────────────────────────── */}
      <Section className="px-4" style={{ paddingTop: 120 }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
            <span
              className="inline-block mb-4 text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#3B82F6' }}
            >
              Process
            </span>
            <h2
              className="mb-4"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              From link to loan in minutes.
            </h2>
            <p
              className="mx-auto"
              style={{ color: 'var(--text-secondary)', maxWidth: 440 }}
            >
              Five simple steps. Zero branch visits. One call.
            </p>
          </motion.div>

          {/* Desktop timeline */}
          <div className="hidden md:flex items-start gap-0">
            {steps.map((step, i) => (
              <div key={step.title} className="flex items-start" style={{ flex: '1 1 0', minWidth: 0 }}>
                <StepCard number={i + 1} {...step} />
                {i < steps.length - 1 && (
                  <div
                    className="mt-7 mx-0"
                    style={{
                      width: 24,
                      height: 1,
                      borderTop: '2px dashed rgba(59,130,246,0.25)',
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      marginTop: 28,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Mobile timeline */}
          <motion.div variants={stagger} className="flex md:hidden flex-col gap-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-4 items-stretch">
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.18)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'rgba(59,130,246,0.2)', marginTop: 4, marginBottom: 4 }} />
                  )}
                </div>
                <motion.div
                  variants={cardVariant}
                  className="glass-card p-4 flex-1 mb-0"
                  style={{ marginBottom: i < steps.length - 1 ? 0 : 0 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.icon size={15} style={{ color: '#3B82F6' }} />
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{step.description}</p>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── STATS ───────────────────────────────── */}
      <Section className="px-4" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp}
            className="glass-card overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              boxShadow: '0 0 80px rgba(59,130,246,0.06)',
            }}
          >
            <div className="px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s) => (
                <StatItem
                  key={s.label}
                  value={s.value}
                  suffix={s.suffix}
                  label={s.label}
                  isSpecial={s.isSpecial}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── CTA BANNER ──────────────────────────── */}
      <Section className="px-4 pb-24" style={{ paddingTop: 40 }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            className="glass-card p-12"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)',
              border: '1px solid rgba(59,130,246,0.15)',
              boxShadow: '0 0 60px rgba(59,130,246,0.08)',
            }}
          >
            <div
              className="inline-flex items-center gap-2 glass-pill px-3 py-1.5 mb-6"
              style={{ fontSize: 12, color: '#3B82F6' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Ready to get started?
            </div>
            <h2
              className="mb-4"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(24px, 4vw, 38px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Experience the future of lending.
            </h2>
            <p className="mb-8 text-base" style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 32px' }}>
              See how AgentFinance AI transforms loan onboarding in under 5 minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/session/demo-token-123')}
                className="btn-primary flex items-center gap-2 text-sm px-7 py-3.5"
              >
                <Video size={16} />
                Start Demo Session
              </button>
              <button
                onClick={() => navigate('/ops')}
                className="btn-outline flex items-center gap-2 text-sm px-7 py-3.5"
              >
                <TrendingUp size={16} />
                View Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  );
}
