/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Inter', 'sans-serif'],
      },
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'accent-blue': '#3B82F6',
        'accent-emerald': '#10B981',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
        'accent-purple': '#8B5CF6',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
      },
      backdropBlur: {
        glass: '24px',
        nav: '20px',
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'float-reverse': 'floatReverse 10s ease-in-out infinite',
        'float-card': 'floatCard 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-30px) translateX(15px)' },
          '66%': { transform: 'translateY(15px) translateX(-10px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(25px) translateX(-20px)' },
          '66%': { transform: 'translateY(-15px) translateX(10px)' },
        },
        floatCard: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-12px) rotate(-1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 40px rgba(59,130,246,0.2), 0 0 80px rgba(59,130,246,0.08)',
        'glow-blue-sm': '0 0 20px rgba(59,130,246,0.15)',
        'glow-emerald': '0 0 40px rgba(16,185,129,0.2)',
        'glass': '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover': '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
}

