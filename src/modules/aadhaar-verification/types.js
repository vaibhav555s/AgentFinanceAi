/**
 * Aadhaar Verification Module — Shared Constants & Types
 * ─────────────────────────────────────────────────────────
 * Status lifecycle: idle → loading → extracting → verifying → success | error
 */

export const STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  EXTRACTING: 'extracting',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
  ERROR: 'error',
});

export const ACCEPTED_TYPES = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'application/pdf',
];

export const MAX_FILE_SIZE_MB = 10;

/**
 * @typedef {Object} AadhaarData
 * @property {boolean}  verified
 * @property {string}   [name]
 * @property {string}   [dob]
 * @property {string}   [gender]
 * @property {string}   [address]
 * @property {string}   [referenceId]
 * @property {string}   [photo]       - base64 JPEG if present
 * @property {string}   [error]
 * @property {string}   [uid]         - masked UID (last 4 digits)
 */
