/**
 * AadhaarVerificationPage — Main page component
 * ───────────────────────────────────────────────
 * Centered card UI with Upload → Verify → Done flow.
 */
import { useState, useCallback } from 'react';
import { ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import AadhaarUploader from './AadhaarUploader';
import VerificationStatus from './VerificationStatus';
import { useAadhaarVerification } from './useAadhaarVerification';
import { STATUS } from './types';

export default function AadhaarVerificationPage({ onVerified }) {
  const { status, data, error, progress, verifyAadhaar, reset, isLoading } =
    useAadhaarVerification();
  const [file, setFile] = useState(null);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!file) return;
    const result = await verifyAadhaar(file);
    if (result) {
      // Notify parent after short delay for UX
      setTimeout(() => {
        onVerified?.(result);
      }, 500);
    }
  }, [file, verifyAadhaar, onVerified]);

  const handleRetry = useCallback(() => {
    setFile(null);
    reset();
  }, [reset]);

  const showUploader = status === STATUS.IDLE || status === STATUS.ERROR;
  const showVerifyBtn = file && status === STATUS.IDLE;
  const showContinueBtn = status === STATUS.SUCCESS;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 16px 40px',
        position: 'relative',
      }}
    >
      {/* ── Background orbs ────────────────────────────── */}
      <div
        className="orb"
        style={{
          width: 400,
          height: 400,
          background: 'rgba(59,130,246,0.06)',
          top: '10%',
          left: '-5%',
        }}
      />
      <div
        className="orb"
        style={{
          width: 350,
          height: 350,
          background: 'rgba(139,92,246,0.05)',
          bottom: '10%',
          right: '-5%',
        }}
      />

      {/* ── Main card ──────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '36px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <ShieldCheck size={26} style={{ color: '#3B82F6' }} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
              fontFamily: "'Sora', 'Inter', sans-serif",
            }}
            className="gradient-text-blue"
          >
            Verify with Aadhaar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Upload your Aadhaar document to verify your identity
          </p>
        </div>

        {/* ── Uploader ───────────────────────────────── */}
        {showUploader && (
          <AadhaarUploader
            onFileSelect={handleFileSelect}
            disabled={isLoading}
          />
        )}

        {/* ── Status / Results ────────────────────────── */}
        <VerificationStatus
          status={status}
          data={data}
          error={error}
          progress={progress}
          onRetry={handleRetry}
        />

        {/* ── Action buttons ─────────────────────────── */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showVerifyBtn && (
            <button
              className="btn-primary"
              onClick={handleVerify}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Verify Aadhaar
              <ArrowRight size={16} />
            </button>
          )}

          {showContinueBtn && (
            <>
              <button
                className="btn-primary"
                onClick={() => onVerified?.(data)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                Continue
                <ArrowRight size={16} />
              </button>
              <button
                className="btn-outline"
                onClick={handleRetry}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <RotateCcw size={14} />
                Verify Another
              </button>
            </>
          )}
        </div>

        {/* ── Privacy notice ─────────────────────────── */}
        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.7,
          }}
        >
          🔒 Your document is processed locally. No data is sent to any server.
        </div>
      </div>
    </div>
  );
}
