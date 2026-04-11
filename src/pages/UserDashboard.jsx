import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Plus, FileText, ArrowRight, ShieldCheck,
  Clock, CheckCircle, AlertCircle, XCircle, RefreshCw,
  Zap, TrendingUp, User, CreditCard, Activity, Lock,
  ChevronRight, Fingerprint, ScanFace, Banknote, FileCheck,
  Play, RotateCcw
} from 'lucide-react';
import { signOutUser } from '../services/authService';

/* ─── Checkpoint pipeline definition ─────────────────── */
const CHECKPOINTS = [
  { key: 'chat_started',    label: 'Chat',        icon: <User size={11} />,        step: 1 },
  { key: 'aadhaar_upload',  label: 'KYC Upload',  icon: <FileText size={11} />,    step: 2 },
  { key: 'aadhaar_done',    label: 'KYC Done',    icon: <FileCheck size={11} />,   step: 3 },
  { key: 'face_done',       label: 'Biometric',   icon: <ScanFace size={11} />,    step: 4 },
  { key: 'bureau',          label: 'Credit',      icon: <CreditCard size={11} />,  step: 5 },
  { key: 'offer',           label: 'Offer',       icon: <Banknote size={11} />,    step: 6 },
  { key: 'consent',         label: 'Consent',     icon: <ShieldCheck size={11} />, step: 7 },
  { key: 'complete',        label: 'Done',        icon: <CheckCircle size={11} />, step: 8 },
];

function getCheckpointStep(checkpoint) {
  const found = CHECKPOINTS.find(c => c.key === checkpoint);
  return found ? found.step : 1;
}

/* ─── Status helpers ──────────────────────────────────── */
function getStatusConfig(status, resumeCheckpoint) {
  const isTerminal = ['completed', 'offer_accepted', 'rejected', 'failed'].includes(status);
  const isSuccess  = ['completed', 'offer_accepted'].includes(status);
  const isFailed   = ['rejected', 'failed'].includes(status);

  if (isSuccess)  return { label: 'Approved',    color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', canResume: false, icon: <CheckCircle size={12} /> };
  if (isFailed)   return { label: 'Declined',    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',  canResume: false, icon: <XCircle size={12} /> };
  if (resumeCheckpoint === 'offer') return { label: 'Offer Ready', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', canResume: true, icon: <Zap size={12} /> };
  return { label: 'In Progress', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', canResume: true, icon: <Clock size={12} /> };
}

/* ─── Risk color helper ───────────────────────────────── */
function riskColor(score) {
  if (!score) return '#64748B';
  if (score >= 70) return '#EF4444';
  if (score >= 40) return '#F59E0B';
  return '#10B981';
}

/* ─── Pipeline Progress Bar ──────────────────────────── */
function PipelineProgress({ checkpoint }) {
  const currentStep = getCheckpointStep(checkpoint || 'chat_started');

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {CHECKPOINTS.map((cp, idx) => {
          const isDone   = cp.step < currentStep;
          const isCurrent = cp.step === currentStep;
          return (
            <div key={cp.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
              {/* Connector line */}
              {idx < CHECKPOINTS.length - 1 && (
                <div style={{
                  position: 'absolute', top: 9, left: '50%', width: '100%', height: 1,
                  background: isDone ? '#10B981' : 'rgba(255,255,255,0.07)',
                  transition: 'background 0.4s'
                }} />
              )}
              {/* Dot */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#10B981' : isCurrent ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isDone ? '#10B981' : isCurrent ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.4s',
                boxShadow: isCurrent ? '0 0 8px rgba(59,130,246,0.5)' : 'none'
              }}>
                {isDone
                  ? <CheckCircle size={9} style={{ color: '#000' }} strokeWidth={3} />
                  : <span style={{ color: isCurrent ? '#3B82F6' : 'rgba(255,255,255,0.2)', transform: 'scale(0.85)' }}>{cp.icon}</span>
                }
              </div>
              {/* Label (only show first, current, and last on mobile) */}
              <span style={{
                fontSize: 8, fontWeight: 600, letterSpacing: '0.03em',
                color: isDone ? '#10B981' : isCurrent ? '#3B82F6' : 'rgba(255,255,255,0.2)',
                whiteSpace: 'nowrap', transition: 'color 0.4s'
              }}>
                {cp.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Application Card ────────────────────────────────── */
function AppCard({ app, index, onResume }) {
  const statusCfg = getStatusConfig(app.status, app.resume_checkpoint);
  const [hovered, setHovered] = useState(false);

  const purposeLabel = app.loan_purpose
    ? app.loan_purpose.charAt(0).toUpperCase() + app.loan_purpose.slice(1)
    : 'Personal Loan';

  const intentLabel = app.intent_category
    ? app.intent_category.replace(/_/g, ' ')
    : null;

  const checkpointLabel = app.resume_checkpoint
    ? CHECKPOINTS.find(c => c.key === app.resume_checkpoint)?.label || app.resume_checkpoint
    : 'Intake';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(15,18,30,0.98) 0%, rgba(8,10,18,0.98) 100%)',
        border: `1px solid ${hovered ? statusCfg.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered
          ? `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px ${statusCfg.border}`
          : '0 8px 30px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${statusCfg.color}, transparent)` }} />

      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', fontFamily: 'Sora, sans-serif', marginBottom: 2 }}>
              {purposeLabel}
            </h3>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              #{app.id?.split('-')[0].toUpperCase() || 'N/A'}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999,
            background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em'
          }}>
            {statusCfg.icon}
            {statusCfg.label.toUpperCase()}
          </div>
        </div>

        {/* Stage line */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Stage: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{checkpointLabel}</span>
          <span style={{ margin: '0 6px', opacity: 0.3 }}>•</span>
          {new Date(app.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
        </div>

        {/* Pipeline progress */}
        <PipelineProgress checkpoint={app.resume_checkpoint} />

        {/* AI Analysis section */}
        {(app.intent_category || app.risk_score || app.fraud_risk_score) && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#3B82F6', marginBottom: 8 }}>
              AI ANALYSIS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {intentLabel && (
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>INTENT</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#E2E8F0', textTransform: 'capitalize' }}>{intentLabel}</div>
                </div>
              )}
              {app.risk_score != null && (
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>RISK</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: riskColor(app.risk_score) }}>
                    {app.risk_score}<span style={{ fontSize: 9, fontWeight: 400 }}>/100</span>
                  </div>
                </div>
              )}
              {app.fraud_risk_score != null && (
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>FRAUD IDX</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: riskColor(app.fraud_risk_score) }}>
                    {app.fraud_risk_score}<span style={{ fontSize: 9, fontWeight: 400 }}>/100</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          {statusCfg.canResume ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onResume(app.id)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))',
                border: '1px solid rgba(59,130,246,0.35)',
                color: '#60A5FA', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer', letterSpacing: '0.03em',
                boxShadow: '0 4px 15px rgba(59,130,246,0.1)',
              }}
            >
              <Play size={13} /> RESUME APPLICATION <ArrowRight size={13} />
            </motion.button>
          ) : (
            <div style={{
              width: '100%', padding: '11px 0', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600
            }}>
              Application Closed
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Stat Card ───────────────────────────────────────── */
function StatCard({ icon, label, value, color = '#3B82F6', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{
        padding: '20px 22px', borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(15,18,30,0.98), rgba(8,10,18,0.98))',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{value}</div>
      </div>
    </motion.div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────── */
export default function UserDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Query loan_applications directly (not the view) so RLS works correctly
      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, status, application_stage, resume_checkpoint, intent_category, risk_score, fraud_risk_score, loan_purpose, is_active_session, expires_at, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) setApplications(data);
    } catch (err) {
      console.error('[UserDashboard] Error fetching applications:', err);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user, fetchApplications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };

  const startNewApplication = () => {
    navigate(`/session/live-${Date.now()}`);
  };

  const resumeApplication = (appId) => {
    navigate(`/session/${appId}`);
  };

  // Derived stats
  const activeCount  = applications.filter(a => !['completed', 'offer_accepted', 'rejected', 'failed'].includes(a.status)).length;
  const approvedCount = applications.filter(a => ['completed', 'offer_accepted'].includes(a.status)).length;
  const avgRisk = applications.length
    ? Math.round(applications.reduce((sum, a) => sum + (a.risk_score || 0), 0) / applications.length)
    : null;

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base, #0A0C14)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid rgba(59,130,246,0.15)',
            borderTop: '2px solid #3B82F6',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading your portal…</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div style={{ minHeight: '100vh', paddingTop: 88, paddingBottom: 60, background: 'var(--bg-base, #0A0C14)', position: 'relative' }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 100, left: 0, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 14 }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 6 }}>BORROWER PORTAL</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#F8FAFC', fontFamily: 'Sora, sans-serif', letterSpacing: '-0.02em' }}>
              Welcome back, <span style={{ background: 'linear-gradient(90deg, #60A5FA, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{displayName}</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Manage your loan applications and track progress in real-time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={startNewApplication}
              style={{
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: 'white', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 4px 18px rgba(59,130,246,0.35)',
              }}
            >
              <Plus size={15} /> New Application
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <LogOut size={14} /> Logout
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 36 }}>
          <StatCard icon={<FileText size={20} />}    label="TOTAL APPLICATIONS" value={applications.length}   color="#3B82F6"  delay={0.05} />
          <StatCard icon={<Activity size={20} />}    label="IN PROGRESS"        value={activeCount}            color="#F59E0B"  delay={0.1}  />
          <StatCard icon={<CheckCircle size={20} />} label="APPROVED"           value={approvedCount}          color="#10B981"  delay={0.15} />
          {avgRisk != null && (
            <StatCard icon={<TrendingUp size={20} />} label="AVG RISK SCORE" value={`${avgRisk}/100`} color={riskColor(avgRisk)} delay={0.2} />
          )}
        </div>

        {/* ── Applications List ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', fontFamily: 'Sora, sans-serif' }}>Your Applications</h2>
            {activeCount > 0 && (
              <div style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '4px 12px', borderRadius: 999, fontWeight: 600 }}>
                {activeCount} resumable
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {applications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: 'center', padding: '60px 20px',
                  borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px'
                }}>
                  <FileText size={26} style={{ color: '#3B82F6' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#F8FAFC', marginBottom: 8 }}>No Applications Yet</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 380, margin: '0 auto 24px' }}>
                  Start your AI-powered loan journey. Our digital agent collects KYC, checks your bureau, and gives you an offer in minutes.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={startNewApplication}
                  style={{
                    padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    color: 'white', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
                  }}
                >
                  Start Application
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}
              >
                {applications.map((app, i) => (
                  <AppCard key={app.id} app={app} index={i} onResume={resumeApplication} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
