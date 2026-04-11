import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Plus, FileText, ArrowRight, ShieldCheck, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { signOutUser } from '../services/authService';

export default function UserDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    console.log('[UserDashboard] State check:', { loading, dataLoading, hasUser: !!user });
    // Redirect if unauthenticated
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase query timed out after 5s')), 5000));
      const queryPromise = supabase
        .from('application_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        
      if (!error && data) {
        setApplications(data);
      }
    } catch (err) {
      console.error('[UserDashboard] Error fetching applications:', err);
    } finally {
      console.log('[UserDashboard] Setting dataLoading to false');
      setDataLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };

  const startNewApplication = () => {
    navigate(`/session/live-${Date.now()}`); // Generate a random session token
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'completed':
      case 'offer_accepted':
        return { color: 'text-green-400', bg: 'bg-green-500/10', icon: <CheckCircle size={14} />, canResume: false };
      case 'rejected':
      case 'failed':
        return { color: 'text-red-400', bg: 'bg-red-500/10', icon: <XCircle size={14} />, canResume: false };
      case 'offer_generated':
      case 'negotiating':
        return { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: <AlertCircle size={14} />, canResume: true };
      default:
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: <Clock size={14} />, canResume: true };
    }
  };

  const resumeApplication = (appId) => {
    navigate(`/session/${appId}`);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16" style={{ background: 'var(--bg-base)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative" style={{ background: 'var(--bg-base)' }}>
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[150px] rounded-full pointer-events-none opacity-10" style={{ background: '#3B82F6' }} />
      
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Welcome back, {profile?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage your loan applications and financial products.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={startNewApplication}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                color: 'white',
                boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
              }}
            >
              <Plus size={16} /> New Application
            </button>
            
            <button 
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: 'var(--bg-input, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Financial Summary Snippet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3 mb-2" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={18} className="text-blue-400" />
              <span className="text-sm font-medium">Identity Status</span>
            </div>
            <p className="text-lg font-semibold text-green-400">Verified User</p>
          </div>
          
          <div className="p-6 rounded-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3 mb-2" style={{ color: 'var(--text-secondary)' }}>
              <FileText size={18} className="text-purple-400" />
              <span className="text-sm font-medium">Total Applications</span>
            </div>
            <p className="text-2xl font-semibold">{applications.length}</p>
          </div>
        </div>

        {/* Applications List */}
        <div>
          <h2 className="text-xl font-bold mb-6" style={{ fontFamily: 'Sora, sans-serif' }}>Your Applications</h2>
          
          {applications.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl border-dashed" style={{ borderColor: 'var(--border-default)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <FileText size={24} style={{ color: '#3B82F6' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                You haven't applied for any loans yet. Start a new application to explore our AI-driven process.
              </p>
              <button 
                onClick={startNewApplication}
                className="px-6 py-2 rounded-lg text-sm font-medium text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
              >
                Apply Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app, i) => {
                const statusStyle = getStatusDisplay(app.status);
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={app.id}
                    className="p-6 rounded-2xl relative group transition-all duration-300 flex flex-col h-full"
                    style={{
                      background: 'linear-gradient(145deg, rgba(20,25,40,0.95) 0%, rgba(10,12,20,0.95) 100%)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(59,130,246,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.4)';
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.color}`}>
                        {statusStyle.icon}
                        {(app.status || 'in_progress').replace('_', ' ')}
                      </div>
                      
                      <div className="flex gap-2">
                         {app.risk_score && app.risk_score > 60 && (
                            <div className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-medium">HIGH RISK</div>
                         )}
                         {app.risk_score && app.risk_score <= 60 && (
                            <div className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 font-medium">GOOD</div>
                         )}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1" style={{ color: '#F8FAFC' }}>
                      {app.loan_purpose || (app.stated_income ? `Personal Loan` : 'New Application')}
                    </h3>
                    
                    <div className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Stage: <span className="font-medium text-gray-300">{app.application_stage || 'Intake'}</span> • 
                      Updated: {new Date(app.updated_at).toLocaleDateString()}
                    </div>

                    {/* AI Insights Section */}
                    {app.intent_category && (
                      <div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="text-[10px] font-bold tracking-widest text-blue-400 mb-2 uppercase">AI Analysis</div>
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <div className="text-[10px] text-gray-500 uppercase">Intent</div>
                              <div className="text-xs font-semibold text-gray-200 capitalize">{app.intent_category ? app.intent_category.replace('_', ' ') : 'N/A'}</div>
                           </div>
                           <div>
                              <div className="text-[10px] text-gray-500 uppercase">Risk Score</div>
                              <div className="text-xs font-semibold text-gray-200">{app.risk_score ? `${app.risk_score}/100` : 'Pending'}</div>
                           </div>
                           <div>
                              <div className="text-[10px] text-gray-500 uppercase">Fraud Index</div>
                              <div className="text-xs font-semibold text-gray-200">{app.fraud_risk_score ? `${app.fraud_risk_score}/100` : 'Pending'}</div>
                           </div>
                           <div className="flex flex-col justify-end">
                              <span className="text-xs text-gray-500 font-mono">
                                ID: {app.id ? app.id.split('-')[0] : 'N/A'}
                              </span>
                           </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      {statusStyle.canResume ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeApplication(app.id);
                          }}
                          className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                          style={{
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            color: '#60A5FA'
                          }}
                        >
                          Resume Application <ArrowRight size={14} />
                        </button>
                      ) : (
                         <div className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                           Application Closed
                         </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
