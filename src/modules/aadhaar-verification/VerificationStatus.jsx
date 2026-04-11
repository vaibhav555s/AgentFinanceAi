/**
 * VerificationStatus — Status display with step indicator
 * ────────────────────────────────────────────────────────
 */
import { CheckCircle, XCircle, Loader, User, Calendar, MapPin, CreditCard } from 'lucide-react';
import { STATUS } from './types';

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'extract', label: 'Extract' },
  { key: 'verify', label: 'Verify' },
  { key: 'done', label: 'Done' },
];

function getActiveStep(status) {
  switch (status) {
    case STATUS.IDLE:
      return -1;
    case STATUS.LOADING:
      return 0;
    case STATUS.EXTRACTING:
      return 1;
    case STATUS.VERIFYING:
      return 2;
    case STATUS.SUCCESS:
      return 3;
    case STATUS.ERROR:
      return -1;
    default:
      return -1;
  }
}

export default function VerificationStatus({ status, data, error, progress, onRetry }) {
  const activeStep = getActiveStep(status);

  return (
    <div style={{ marginTop: 24 }}>
      {/* ── Step indicator ──────────────────────────────── */}
      {status !== STATUS.IDLE && status !== STATUS.ERROR && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginBottom: 28,
          }}
        >
          {STEPS.map((step, i) => {
            const isComplete = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      background: isComplete
                        ? 'rgba(34,197,94,0.15)'
                        : isActive
                        ? 'rgba(59,130,246,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${
                        isComplete
                          ? '#22C55E'
                          : isActive
                          ? '#3B82F6'
                          : 'rgba(255,255,255,0.1)'
                      }`,
                      color: isComplete ? '#22C55E' : isActive ? '#3B82F6' : 'var(--text-muted)',
                      ...(isActive
                        ? { boxShadow: '0 0 12px rgba(59,130,246,0.3)', animation: 'stagePulse 2s ease-in-out infinite' }
                        : {}),
                    }}
                  >
                    {isComplete ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: isComplete ? '#22C55E' : isActive ? '#3B82F6' : 'var(--text-muted)',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 40,
                      height: 2,
                      background: isComplete
                        ? 'rgba(34,197,94,0.4)'
                        : 'rgba(255,255,255,0.06)',
                      marginBottom: 22,
                      marginLeft: 4,
                      marginRight: 4,
                      borderRadius: 1,
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Loading state ──────────────────────────────── */}
      {[STATUS.LOADING, STATUS.EXTRACTING, STATUS.VERIFYING].includes(status) && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Loader
            size={36}
            style={{
              color: '#3B82F6',
              animation: 'spin 1s linear infinite',
              marginBottom: 12,
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {progress || 'Processing...'}
          </div>
        </div>
      )}

      {/* ── Success state ──────────────────────────────── */}
      {status === STATUS.SUCCESS && data && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <CheckCircle size={22} style={{ color: '#22C55E' }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>
              Verification Successful
            </span>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted Details
            </div>

            {data.photo && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img
                  src={data.photo}
                  alt="Aadhaar photo"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    objectFit: 'cover',
                    border: '2px solid rgba(59,130,246,0.3)',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DetailRow icon={User} label="Name" value={data.name} />
              <DetailRow icon={Calendar} label="Date of Birth" value={data.dob} />
              <DetailRow icon={User} label="Gender" value={data.gender} />
              <DetailRow icon={MapPin} label="Address" value={data.address} />
              <DetailRow icon={CreditCard} label="Reference ID" value={data.referenceId} />
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ────────────────────────────────── */}
      {status === STATUS.ERROR && error && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <XCircle size={36} style={{ color: '#EF4444', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#EF4444', marginBottom: 16 }}>
            {error}
          </div>
          <button
            onClick={onRetry}
            className="btn-outline"
            style={{ fontSize: 13, padding: '10px 20px' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Spinner keyframe (injected once) ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(59,130,246,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={15} style={{ color: '#3B82F6' }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
