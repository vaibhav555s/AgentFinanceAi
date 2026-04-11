/**
 * Aadhaar Verification Module — Public API
 * ─────────────────────────────────────────
 * Export everything from a single entry point.
 */
export { default as AadhaarVerificationPage } from './AadhaarVerificationPage';
export { default as AadhaarUploader } from './AadhaarUploader';
export { default as VerificationStatus } from './VerificationStatus';
export { useAadhaarVerification } from './useAadhaarVerification';
export { extractQR } from './QRExtractor';
export { parseAadhaar } from './AadhaarParser';
export { STATUS, ACCEPTED_TYPES } from './types';
