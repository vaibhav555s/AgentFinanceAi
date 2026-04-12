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

/* ─── Top Navigation ──────────────────────────────────── */
function TopNav({ active, setActive }) {
  const navigate = useNavigate();
  return (
    <div className="fixed top-8 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center gap-1 bg-[#141414]/80 backdrop-blur-2xl border border-white/5 px-2 py-2 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
      >
        <button 
          onClick={() => navigate('/')}
          className="p-3 hover:bg-white/5 rounded-full transition-colors group"
        >
          <Zap size={16} className="text-white group-hover:text-violet-400" />
        </button>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 flex items-center gap-2 ${
              active === id ? 'bg-white text-black' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        <button 
          onClick={() => navigate('/compliance')}
          className="px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] text-white/40 hover:text-white/70 hover:bg-white/5 flex items-center gap-2"
        >
          <Shield size={14} />
          Compliance
        </button>
      </motion.nav>
    </div>
  );
}

function StatCard({ label, value, trend, trendColor = 'text-white' }) {
  return (
    <motion.div variants={fadeItem} className="flex flex-col border-r border-white/5 last:border-0 pr-8">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">{label}</span>
      <div className="text-[48px] font-medium tracking-tight text-white leading-none mb-3">
        {value}
      </div>
      {trend && (
        <span className={`text-[12px] font-medium lowercase tracking-tight ${trendColor}`}>{trend}</span>
      )}
    </motion.div>
  );
}

/* ─── Overview section ───────────────────────────────── */
function OverviewSection({ data }) {
  const { sessions, events, flags } = data;
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex flex-col gap-24">
      {/* Stats Row */}
      <motion.div
        initial="hidden" animate="visible" variants={stagger}
        className="flex flex-wrap gap-20 py-12 border-y border-white/5"
      >
        <StatCard 
          label="Active Sessions" 
          value={sessions.filter(s => s.status === 'live').length} 
          trend={`${sessions.filter(s => s.status === 'live').length} live now`} 
        />
        <StatCard 
          label="Fraud Flags" 
          value={flags.filter(f => f.severity === 'high').length} 
          trend={flags.filter(f => f.severity === 'high').length === 0 ? 'All clear' : 'Action needed'} 
          trendColor="text-violet-500"
        />
        <StatCard 
          label="Avg Session Time" 
          value="4:32" 
          trend="12% faster than avg" 
        />
        <StatCard 
          label="Offers Accepted" 
          value={sessions.filter(s => s.application_stage === 'completed').length} 
          trend="Today" 
          trendColor="text-violet-500"
        />
      </motion.div>

      {/* Monitor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
        {/* Transcript */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-[20px] font-medium text-white lowercase">live transcript</h3>
            <span className="text-[10px] text-violet-500 font-bold uppercase tracking-widest animate-pulse">Auto-scrolling</span>
          </div>
          <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto scrollbar-hide pr-4">
            {events.slice(0, 50).map((entry, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 border-l border-white/5 pl-6 pb-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${entry.role === 'ai' ? 'text-violet-500' : 'text-white/30'}`}>
                    {entry.role === 'ai' ? 'AI AGENT' : 'SYSTEM/USER'}
                  </span>
                  <span className="text-[9px] text-white/20">{new Date(entry.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-[14px] text-white leading-relaxed lowercase">{entry.metadata?.text || entry.event}</p>
              </motion.div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-[20px] font-medium text-white lowercase">session status</h3>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${sessions.length > 0 ? 'bg-violet-500 shadow-[0_0_10px_#7C3AED]' : 'bg-white/10'}`} />
               <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{sessions.length > 0 ? 'LIVE' : 'STANDBY'}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-12">
            {sessions[0] && (
              <div className="flex flex-col gap-4">
                <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">LATEST ACTIVITY</span>
                <div className="text-[32px] font-medium text-white leading-tight lowercase">{sessions[0].profiles?.name || 'anonymous'}</div>
                <div className="text-[12px] font-mono text-white/20 lowercase">TKN-{sessions[0].id.slice(0, 8)}</div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">PROGRESSION</span>
              <div className="flex flex-col gap-4">
                {['KYC', 'BUREAU', 'OFFER', 'COMPLETE'].map((s, i) => {
                  const currentIdx = ['kyc', 'bureau', 'offer', 'completed'].indexOf(sessions[0]?.application_stage || 'kyc');
                  const isDone = i <= currentIdx;
                  return (
                    <div key={s} className="flex items-center justify-between">
                      <span className={`text-[12px] font-bold tracking-tight ${isDone ? 'text-white' : 'text-white/10'}`}>{s}</span>
                      <div className={`w-12 h-[1px] ${isDone ? 'bg-white' : 'bg-white/10'}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-white/5">
              <div className="flex flex-col">
                 <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-2">SCORE</span>
                 <div className="text-[24px] font-medium text-white">{sessions[0]?.bureau_score || '—'}</div>
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-2">ELAPSED</span>
                 <SessionTimer />
              </div>
            </div>
          </div>
        </div>

        {/* Risk & Fraud */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-[20px] font-medium text-white lowercase">fraud & risk</h3>
            <span className="text-[10px] text-violet-500 font-bold uppercase tracking-widest">Active</span>
          </div>

          <div className="flex flex-col gap-10">
            {(() => {
              const score = sessions[0]?.fraud_risk_score || 0;
              return (
                <div className="flex flex-col gap-4">
                  <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">AI RISK SCORE</span>
                  <div className="text-[64px] font-medium text-white leading-none">{score}<span className="text-[24px] text-white/20">/100</span></div>
                  <div className="w-full h-[1px] bg-white/5 relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} className="absolute inset-0 bg-violet-500" />
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-6">
              <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">REAL-TIME ANALYTICS</span>
              <div className="flex flex-col gap-4">
                {[
                  { check: 'Liveness Detect', status: 'pass' },
                  { check: 'Document Auth', status: 'pass' },
                  { check: 'Face Match', status: 'pass' },
                  { check: 'AML Screening', status: 'pass' },
                ].map(item => (
                  <div key={item.check} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-[12px] text-white/50 lowercase">{item.check}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Verified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── Live Sessions ──────────────────────────────────── */
function LiveSessionsSection({ data }) {
  const { sessions } = data;
  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between border-b border-white/5 pb-8">
        <h2 className="text-[32px] font-medium text-white lowercase">session repository</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white/30 border border-white/5 px-6 py-3 rounded-full hover:border-white/20 transition-colors">
            <Search size={14} />
            <span className="text-[12px] lowercase tracking-tight">search archive...</span>
          </div>
          <button className="text-white/30 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        {sessions.map((s, i) => {
          const sc = statusCfg[s.status] || statusCfg.live;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group py-10 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/[0.01] transition-colors -mx-10 px-10"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">TKN-{s.id.slice(0, 8)}</span>
                <span className="text-[20px] font-medium text-white lowercase">{s.profiles?.name || 'anonymous applicant'}</span>
              </div>

              <div className="flex gap-20 items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Amount</span>
                  <span className="text-[16px] text-white font-medium">{s.metadata?.amount || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Risk Score</span>
                  <span className={`text-[16px] font-medium ${s.fraud_risk_score > 60 ? 'text-red-500' : 'text-white'}`}>{s.fraud_risk_score || '0'}</span>
                </div>
                <div className="flex flex-col gap-1 w-32">
                   <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Stage</span>
                   <div className="w-full h-[1px] bg-white/5 relative mt-2">
                     <div className="absolute inset-0 bg-white" style={{ width: `${(['kyc','bureau','offer','completed'].indexOf(s.application_stage) + 1)/4 * 100}%` }} />
                   </div>
                </div>
                <div className="w-32 flex justify-end">
                   <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 border rounded-full ${s.status === 'live' ? 'border-violet-500 text-violet-500 animate-pulse' : 'border-white/10 text-white/40'}`}>
                     {sc.label}
                   </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Fraud Signals ──────────────────────────────────── */
function FraudSignalsSection({ data }) {
  const { flags, sessions } = data;

  return (
    <div className="flex flex-col gap-24">
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

        const activeTotal = sessions.length || 1;
        const distrib = [
          { label: 'no risk', count: counts.clear, color: 'bg-white/10' },
          { label: 'low', count: counts.low, color: 'bg-white/20' },
          { label: 'medium', count: counts.medium, color: 'bg-violet-400' },
          { label: 'high', count: counts.high, color: 'bg-red-500' },
        ];

        return (
          <div className="grid grid-cols-4 gap-20 py-12 border-y border-white/5">
            {distrib.map(d => (
              <motion.div key={d.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{d.label}</span>
                <div className="text-[48px] font-medium text-white leading-none">{d.count}</div>
                <div className="w-full h-[1px] bg-white/5 relative">
                   <div className={`absolute inset-0 ${d.color}`} style={{ width: `${(d.count / activeTotal) * 100}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Events */}
      <div className="flex flex-col gap-12">
        <h3 className="text-[32px] font-medium text-white lowercase">anomalous flags</h3>
        <div className="flex flex-col">
          {flags.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group py-12 border-b border-white/5 last:border-0 flex items-start justify-between -mx-10 px-10"
            >
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex items-center gap-4">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 border rounded-full ${f.severity === 'high' ? 'border-red-500 text-red-500' : 'border-white/10 text-white/40'}`}>
                    {f.severity}
                  </span>
                  <span className="text-[10px] font-mono text-white/20 uppercase">APPID-{f.application_id.slice(0, 8)}</span>
                </div>
                <h4 className="text-[20px] font-medium text-white lowercase leading-tight">{f.flag_type}</h4>
                <p className="text-[14px] text-white/40 leading-relaxed capitalize">{f.description}</p>
              </div>
              <span className="text-[12px] text-white/20 font-mono italic">{new Date(f.created_at).toLocaleTimeString()}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Transcripts section ────────────────────────────── */
function TranscriptsSection({ data }) {
  const { sessions } = data;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between border-b border-white/5 pb-8">
        <h2 className="text-[32px] font-medium text-white lowercase">conversation archive</h2>
        <div className="flex items-center gap-4 text-white/30 border border-white/5 px-6 py-3 rounded-full">
          <Search size={14} />
          <span className="text-[12px] lowercase tracking-tight">find by keyword...</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col gap-6 p-10 border border-white/5 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">TKN-{s.id.slice(0, 8)}</span>
                <span className="text-[24px] font-medium text-white lowercase leading-tight">{s.profiles?.name || 'anonymous'}</span>
              </div>
              <button className="p-4 rounded-full border border-white/5 text-white/30 hover:bg-white hover:text-black hover:border-white transition-all">
                <Eye size={18} />
              </button>
            </div>

            <div className="flex items-center gap-8 py-4 border-y border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Date</span>
                <span className="text-[12px] text-white/60 lowercase tracking-tight">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Status</span>
                <span className="text-[12px] text-violet-500 lowercase font-bold">{s.status}</span>
              </div>
            </div>

            <p className="text-[14px] text-white/30 leading-relaxed italic line-clamp-2 gap-2 flex flex-col">
               <span className="text-violet-500 uppercase text-[9px] font-bold tracking-widest block not-italic">Recent Segment</span>
               "Yes I understand the terms of this agreement and I'd like to proceed with the primary offer of 5,00,000 INR..."
            </p>

            <div className="flex gap-4">
               <button className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest border border-white/5 text-white/40 hover:bg-white/5 transition-all">Download PDF</button>
               <button className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest border border-white/5 text-white/40 hover:bg-white/5 transition-all">Download Audio</button>
            </div>
          </motion.div>
        ))}
      </div>
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

  // Force dark bg
  useEffect(() => {
    document.body.style.backgroundColor = '#0A0A0A';
    document.body.style.overflow = 'auto'; // allow scroll for the whole page
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  const sections = {
    overview:    <OverviewSection data={opsData} />,
    live:        <LiveSessionsSection data={opsData} />,
    fraud:       <FraudSignalsSection data={opsData} />,
    transcripts: <TranscriptsSection data={opsData} />,
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-10 flex flex-col items-center">
      <TopNav active={active} setActive={setActive} />

      <div className="w-full max-w-[1400px]">
        {/* Massive Header */}
        <header className="mb-20">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-[12px] uppercase tracking-[0.4em] text-violet-500 font-bold mb-6 block">Operations Control</span>
            <h1 className="text-[120px] font-medium text-white leading-[0.9] tracking-[-0.04em] lowercase">
              {active} <br />
              <span className="opacity-20 italic">monitor</span>
            </h1>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {sections[active]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
