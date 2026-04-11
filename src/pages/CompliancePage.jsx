import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Shield, AlertTriangle, FileText, Download, CheckCircle,
  Eye, Lock, Zap, Search, Globe, ChevronRight, ChevronDown, ListCheck, LayoutDashboard
} from 'lucide-react';

const FRAMEWORKS = [
  {
    icon: Shield,
    title: 'KYC & AML (RBI MD)',
    status: 'compliant',
    badge: 'Compliant',
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
];

const sevCfg = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  dot: '#10B981', label: 'OK'    },
  info:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  dot: '#3B82F6', label: 'Info'  },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   dot: '#EF4444', label: 'Alert' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  dot: '#F59E0B', label: 'Warn'  },
  clear:   { color: '#64748B', bg: 'rgba(100,116,139,0.1)', dot: '#64748B', label: 'Clear' },
};

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      {/* Sidebar */}
      <div className="flex flex-col" style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Shield size={18} style={{ color: '#10B981' }} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Compliance</span>
        </div>
        <div className="flex flex-col px-2 py-3 gap-1 flex-1">
          <button className="sidebar-link active text-left flex items-center gap-2" style={{ color: '#10B981' }}>
            <ListCheck size={14} /> Center
          </button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 12px' }} />
          <button className="sidebar-link text-left flex items-center gap-2" onClick={() => navigate('/ops')}>
            <LayoutDashboard size={14} /> Ops Dash
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto ops-scroll">
        <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
          <div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Regulatory Compliance</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Real-time monitoring of regulatory frameworks</p>
          </div>

          <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FRAMEWORKS.map((f, i) => (
              <motion.div key={i} variants={fadeItem} className="glass-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <f.icon size={16} style={{ color: '#3B82F6' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                    color: f.status === 'compliant' ? '#10B981' : '#F59E0B',
                    background: f.status === 'compliant' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                  }}>
                    {f.badge}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Audit Logs */}
          <div className="glass-card flex flex-col mt-4">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Immutable Audit Trail</h2>
              <button className="glass-pill px-3 py-1 flex items-center gap-1.5 text-xs text-blue-400">
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th className="px-5 py-3 font-medium">Report Hash</th>
                    <th className="px-5 py-3 font-medium">Application ID</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Generated By</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3" style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{log.sha256_hash?.substring(0, 8)}...</td>
                      <td className="px-5 py-3" style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{log.application_id}</td>
                      <td className="px-5 py-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3">{log.generated_by}</td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-blue-400 hover:text-blue-300 mr-3" onClick={() => {
                          const fileData = JSON.stringify(log.report_json, null, 2);
                          const blob = new Blob([fileData], {type: "text/plain"});
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.download = `audit_${log.application_id}.json`;
                          link.href = url;
                          link.click();
                        }}>JSON</button>
                      </td>
                    </tr>
                  ))}
                  {audits.length === 0 && (
                    <tr><td colSpan="5" className="px-5 py-4 text-center">No audit reports found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Regulatory Flags */}
          <div className="glass-card flex flex-col mt-4">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Regulatory Flags</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">App ID</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag, i) => {
                    const sev = sevCfg[flag.severity] || sevCfg.clear;
                    return (
                    <tr key={flag.id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{flag.flag_type}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1" style={{ color: sev.color, background: sev.bg }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sev.dot }} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{flag.application_id}</td>
                      <td className="px-5 py-3">{flag.description}</td>
                      <td className="px-5 py-3">{new Date(flag.created_at).toLocaleString()}</td>
                    </tr>
                    );
                  })}
                  {flags.length === 0 && (
                    <tr><td colSpan="5" className="px-5 py-4 text-center">No regulatory flags found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
