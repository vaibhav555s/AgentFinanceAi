import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Shield, AlertTriangle, FileText, Download, CheckCircle,
  Eye, Lock, Zap, ChevronRight, LayoutDashboard, Search
} from 'lucide-react';

const FRAMEWORKS = [
  {
    icon: Shield,
    title: 'KYC & AML (RBI MD)',
    badge: 'Compliant',
    description: 'Video KYC (V-KYC) complies with RBI master direction on KYC. AML screening uses FATF watchlists and PEP databases.',
    version: 'PMLA 2002 + 2023 Amendments',
  },
  {
    icon: Lock,
    title: 'Data Privacy (DPDPA 2023)',
    badge: 'Certified',
    description: 'DPDPA 2023 consent management, data minimization, and right-to-erasure workflows. ISO 27001:2022 certified.',
    version: 'DPDPA 2023 + ISO 27001',
  },
  {
    icon: Eye,
    title: 'Liveness & Fraud Detection',
    badge: 'Live',
    description: 'Real-time 3D liveness detection, deepfake identification, device fingerprinting and velocity checks.',
    version: 'face-api.js v0.22 + Custom ML',
  },
  {
    icon: FileText,
    title: 'Audit Logs & Record Keeping',
    badge: 'Enabled',
    description: 'AI decision traces, transcripts, and consent events are logged to an immutable trail retained for 7 years.',
    version: 'Immutable append-only store',
  },
];

function useComplianceData() {
  const [flags, setFlags] = useState([]);
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: fData }, { data: aData }] = await Promise.all([
        supabase.from('regulatory_flags').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('audit_reports').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setFlags(fData || []);
      setAudits(aData || []);
    };
    fetchAll();

    const channel = supabase.channel('reg_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulatory_flags' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_reports' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { flags, audits };
}

export default function CompliancePage() {
  const navigate = useNavigate();
  const { flags, audits } = useComplianceData();
  
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
  const fadeItem = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

  // Set pure black bg
  useEffect(() => {
    document.body.style.backgroundColor = '#0A0A0A';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-32 pb-20 px-10 flex flex-col items-center">
      {/* Top Nav Pill */}
      <div className="fixed top-8 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <motion.nav 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center gap-1 bg-[#141414]/80 backdrop-blur-2xl border border-white/5 px-4 py-2 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <button 
            onClick={() => navigate('/ops')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] text-white/40 hover:text-white transition-all group"
          >
            <LayoutDashboard size={14} className="group-hover:text-violet-500 transition-colors" />
            Control Center
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <span className="px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-violet-500">Compliance Center</span>
        </motion.nav>
      </div>

      <div className="w-full max-w-[1400px]">
        {/* Massive Header */}
        <header className="mb-24">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-[12px] uppercase tracking-[0.4em] text-violet-500 font-bold mb-6 block">Regulatory Shield</span>
            <h1 className="text-[120px] font-medium text-white leading-[0.9] tracking-[-0.04em] lowercase">
              regulatory <br />
              <span className="opacity-20 italic">compliance</span>
            </h1>
          </motion.div>
        </header>

        {/* Frameworks Row */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-4 gap-12 py-16 border-y border-white/5 mb-32">
          {FRAMEWORKS.map((f, i) => (
            <motion.div key={i} variants={fadeItem} className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <f.icon size={20} className="text-violet-500" />
                <span className="px-3 py-1 border border-violet-500/20 text-violet-500 text-[9px] font-bold uppercase tracking-widest rounded-full">{f.badge}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[18px] font-medium lowercase leading-tight">{f.title}</h3>
                <p className="text-[12px] text-white/30 leading-relaxed font-medium">{f.description}</p>
              </div>
              <span className="text-[10px] text-white/10 font-mono uppercase mt-auto">{f.version}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Audit Trail Section */}
        <section className="flex flex-col gap-12 mb-32">
          <div className="flex items-center justify-between border-b border-white/5 pb-8">
            <h2 className="text-[32px] font-medium lowercase">immutable audit trail</h2>
            <button className="flex items-center gap-2 text-white/30 hover:text-white transition-colors">
              <Download size={16} />
              <span className="text-[12px] uppercase tracking-widest font-bold">Export Logs</span>
            </button>
          </div>

          <div className="flex flex-col">
            {audits.map((log, i) => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="group py-10 border-b border-white/5 last:border-0 flex items-center justify-between -mx-10 px-10 hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex flex-col gap-1 w-64">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Report Hash</span>
                  <span className="text-[14px] font-mono text-white/60 lowercase">{log.sha256_hash?.substring(0, 16)}...</span>
                </div>
                <div className="flex flex-col gap-1 w-64">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">App ID</span>
                  <span className="text-[14px] font-mono text-white lowercase">APP-{log.application_id.slice(0, 8)}</span>
                </div>
                <div className="flex flex-col gap-1 w-64">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Timestamp</span>
                  <span className="text-[14px] text-white/60 lowercase">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-end gap-4 w-48">
                  <button 
                    onClick={() => {
                        const fileData = JSON.stringify(log.report_json, null, 2);
                        const blob = new Blob([fileData], {type: "text/plain"});
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = `audit_${log.application_id}.json`;
                        link.href = url; link.click();
                    }}
                    className="text-[11px] font-bold uppercase tracking-widest px-6 py-3 border border-white/5 text-white/30 hover:border-white hover:text-white transition-all"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))}
            {audits.length === 0 && <p className="py-20 text-center text-white/20 lowercase italic">No audit records found in repository.</p>}
          </div>
        </section>

        {/* Regulatory Flags Section */}
        <section className="flex flex-col gap-12">
          <div className="flex items-center justify-between border-b border-white/5 pb-8">
            <h2 className="text-[32px] font-medium lowercase">regulatory flags</h2>
            <div className="flex items-center gap-2 border border-white/5 px-6 py-3 rounded-full text-white/20">
              <Search size={14} />
              <span className="text-[12px] lowercase tracking-tight">Filter records...</span>
            </div>
          </div>

          <div className="flex flex-col">
            {flags.map((flag, i) => (
              <motion.div 
                key={flag.id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="group py-10 border-b border-white/5 last:border-0 flex items-start justify-between -mx-10 px-10 hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex flex-col gap-4 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 border rounded-full ${flag.severity === 'error' || flag.severity === 'high' ? 'border-red-500 text-red-500' : 'border-white/10 text-white/40'}`}>
                      {flag.severity}
                    </span>
                    <span className="text-[12px] font-mono text-white/20">APPID-{flag.application_id.slice(0, 8)}</span>
                  </div>
                  <h4 className="text-[20px] font-medium lowercase">{flag.flag_type}</h4>
                  <p className="text-[14px] text-white/40 leading-relaxed capitalize">{flag.description}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                   <span className="text-[12px] text-white/20 font-mono italic">{new Date(flag.created_at).toLocaleTimeString()}</span>
                   <span className="text-[10px] text-violet-500/50 uppercase tracking-widest font-bold mt-2">Active Monitor</span>
                </div>
              </motion.div>
            ))}
            {flags.length === 0 && <p className="py-20 text-center text-white/20 lowercase italic">Repository at baseline. No active flags.</p>}
          </div>
        </section>

      </div>
    </div>
  );
}
