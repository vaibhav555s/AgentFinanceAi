import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import VideoCallPage from './pages/VideoCallPage';
import OpsDashboard from './pages/OpsDashboard';
import CompliancePage from './pages/CompliancePage';
import { AadhaarVerificationPage } from './modules/aadhaar-verification';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AppLayout() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  // Footer not shown on video call page
  const showFooter = pathname !== '/session' && !pathname.startsWith('/session/');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <ScrollToTop />
      <Navbar theme={theme} onToggleTheme={toggle} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/session/:token" element={<VideoCallPage />} />
          <Route path="/ops" element={<OpsDashboard />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route
            path="/verify-aadhaar"
            element={
              <AadhaarVerificationPage
                onVerified={(data) => {
                  console.log('[APP] Aadhaar verified:', data);
                  alert('✅ Aadhaar Verified! Name: ' + data.name);
                }}
              />
            }
          />
          {/* Catch-all — redirect home */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {showFooter && <Footer />}
    </div>
  );
}

function NotFound() {
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ paddingTop: 80 }}
    >
      <div className="text-center">
        <div
          className="text-7xl font-bold mb-4 gradient-text-blue"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          404
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
        <a
          href="/"
          className="inline-block mt-6 px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: '#3B82F6',
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
