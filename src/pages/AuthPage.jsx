import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Phone, LogIn, UserPlus } from 'lucide-react';
import { signUpUser, signInUser } from '../services/authService';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signInUser(formData.email, formData.password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUpUser(formData.email, formData.password, {
          name: formData.name,
          phone: formData.phone,
        });
        if (error) throw error;
        // Proceed directly or ask them to login if auto-login is off. Supabase usually auto-logs-in unless email confirm is on.
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" 
         style={{ background: 'var(--bg-base)', paddingTop: '64px' }}>
         
      {/* Background Glow */}
      <div 
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] blur-[150px] rounded-full pointer-events-none opacity-20"
        style={{ background: '#3B82F6' }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] blur-[120px] rounded-full pointer-events-none opacity-10"
        style={{ background: '#8B5CF6' }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" 
               style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Zap size={24} style={{ color: '#3B82F6' }} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Sign in to track your loan applications' : 'Start your secure fintech journey'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      required={!isLogin}
                      type="text"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none"
                      style={{ 
                        background: 'var(--bg-input, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      required={!isLogin}
                      type="tel"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none"
                      style={{ 
                        background: 'var(--bg-input, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                required
                type="email"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ 
                  background: 'var(--bg-input, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                placeholder="you@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                required
                type="password"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ 
                  background: 'var(--bg-input, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 mt-4 text-xs text-red-500 rounded-lg bg-red-500/10 border border-red-500/20">
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-lg text-sm font-semibold text-white flex justify-center items-center gap-2 transition-all"
            style={{
              background: loading ? '#2563EB' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
            }}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : isLogin ? (
              <><LogIn size={16} /> Sign In</>
            ) : (
              <><UserPlus size={16} /> Create Account</>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-medium hover:underline transition-colors"
              style={{ color: '#3B82F6' }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
