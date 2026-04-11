import { Link } from 'react-router-dom';
import { GitFork, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-6 h-6">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(59,130,246,0.15)', borderRadius: '50%' }}
              />
              <Zap size={12} style={{ color: '#3B82F6', position: 'relative', zIndex: 1 }} fill="#3B82F6" />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text-primary)' }}
            >
              AgentFinance AI
            </span>
          </Link>

          {/* Center */}
          <p
            className="text-xs text-center"
            style={{ color: 'var(--text-muted)', fontSize: '13px' }}
          >
            Built for AgentFinance Hackathon 2026
          </p>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-all duration-150 hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            aria-label="GitHub"
          >
            <GitFork size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
