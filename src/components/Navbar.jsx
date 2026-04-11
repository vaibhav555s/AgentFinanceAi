import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/authService';

export default function Navbar({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Dashboard', href: '/ops' },
    { label: 'Compliance', href: '/compliance' },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled
            ? '1px solid var(--border-default)'
            : '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setMenuOpen(false)}
            >
              <div className="relative flex items-center justify-center w-7 h-7">
                <div
                  className="absolute inset-0 rounded-full animate-pulse-glow"
                  style={{ background: 'rgba(59,130,246,0.2)', borderRadius: '50%' }}
                />
                <Zap
                  size={15}
                  className="relative z-10"
                  style={{ color: '#3B82F6' }}
                  fill="#3B82F6"
                />
              </div>
              <span
                className="text-[15px] font-semibold tracking-tight"
                style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}
              >
                AgentFinance AI
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {link.label}
                </Link>
              ))}

              {/* Theme toggle */}
              <button
                onClick={onToggleTheme}
                className="ml-1 p-2 rounded-lg transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* User Dynamic Button */}
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#3B82F6',
                    background: 'rgba(59,130,246,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(59,130,246,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.7)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                  }}
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#3B82F6',
                    background: 'rgba(59,130,246,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(59,130,246,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.7)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                  }}
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile: theme + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-2 rounded-lg transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden"
              style={{
                background: 'var(--nav-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div className="px-4 pt-2 pb-4 flex flex-col gap-1">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <button
                    onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                    className="mt-1 px-4 py-3 rounded-lg text-sm font-semibold text-left transition-all duration-150"
                    style={{
                      border: '1px solid rgba(59,130,246,0.4)',
                      color: '#3B82F6',
                      background: 'rgba(59,130,246,0.06)',
                    }}
                  >
                    Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => { navigate('/auth'); setMenuOpen(false); }}
                    className="mt-1 px-4 py-3 rounded-lg text-sm font-semibold text-left transition-all duration-150"
                    style={{
                      border: '1px solid rgba(59,130,246,0.4)',
                      color: '#3B82F6',
                      background: 'rgba(59,130,246,0.06)',
                    }}
                  >
                    Login
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
