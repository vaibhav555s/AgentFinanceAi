/**
 * useAadhaarVerification — Custom hook for the verification flow
 * ──────────────────────────────────────────────────────────────
 * Manages the full Upload → Extract → Parse → Verify lifecycle.
 */
import { useState, useCallback, useRef } from 'react';
import { extractQR } from './QRExtractor';
import { parseAadhaar } from './AadhaarParser';
import { STATUS, ACCEPTED_TYPES, MAX_FILE_SIZE_MB } from './types';

export function useAadhaarVerification() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const fileRef = useRef(null);

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE);
    setData(null);
    setError(null);
    setProgress('');
    fileRef.current = null;
  }, []);

  const verifyAadhaar = useCallback(async (file) => {
    // ── Validate file ─────────────────────────────────
    if (!file) {
      setError('No file selected');
      setStatus(STATUS.ERROR);
      return null;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Accepted: PNG, JPG, JPEG, PDF`);
      setStatus(STATUS.ERROR);
      return null;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum ${MAX_FILE_SIZE_MB}MB allowed.`);
      setStatus(STATUS.ERROR);
      return null;
    }

    fileRef.current = file;
    setError(null);
    setData(null);

    try {
      // ── Step 1: Loading ───────────────────────────────
      setStatus(STATUS.LOADING);
      setProgress('Reading document...');
      await sleep(400); // Brief pause for UX

      // ── Step 2: Extract QR ────────────────────────────
      setStatus(STATUS.EXTRACTING);
      setProgress('Scanning for QR code...');

      const qrData = await extractQR(file);

      if (!qrData) {
        setError('No QR code found in the document. Please upload a clear Aadhaar with a visible QR code.');
        setStatus(STATUS.ERROR);
        return null;
      }

      // ── Step 3: Parse & Verify ────────────────────────
      setStatus(STATUS.VERIFYING);
      setProgress('Verifying Aadhaar data...');
      await sleep(300);

      const parsed = parseAadhaar(qrData);

      if (!parsed || !parsed.verified) {
        setError('Could not parse Aadhaar data. The QR code may be damaged or in an unsupported format.');
        setStatus(STATUS.ERROR);
        return null;
      }

      // ── Success ───────────────────────────────────────
      setData(parsed);
      setStatus(STATUS.SUCCESS);
      setProgress('');

      // Clear the file reference for security
      fileRef.current = null;

      return parsed;
    } catch (err) {
      console.error('[AadhaarVerification] Error:', err);
      setError(err.message || 'Verification failed. Please try again.');
      setStatus(STATUS.ERROR);
      fileRef.current = null;
      return null;
    }
  }, []);

  return {
    status,
    data,
    error,
    progress,
    verifyAadhaar,
    reset,
    isLoading: [STATUS.LOADING, STATUS.EXTRACTING, STATUS.VERIFYING].includes(status),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
