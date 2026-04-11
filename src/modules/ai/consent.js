/**
 * ─── Consent Detection Module ───────────────────────────
 * Detects user's verbal consent or refusal from transcript text.
 *
 * Key design:
 *  - Once consent is LOCKED (user said "I agree"), it stays true
 *  - consentLocked prevents reversal from casual speech
 *  - Only explicit refusal after lock triggers a warning (not reversal)
 */

import { log } from '../utils/logger.js';

/* ─── Consent Phrases ────────────────────────────────── */

const CONSENT_PHRASES = [
  'i agree', 'i accept', 'i consent', 'yes i agree', 'yes i accept',
  'i am willing', 'i approve', 'that is fine', 'that works', 'sounds good',
  'i confirm', 'confirmed', 'agreed', 'accepted', 'haan', 'theek hai',
  'mujhe manzoor hai', 'maine agree kiya', 'i do agree',
  'yes please proceed', 'go ahead', 'proceed', 'let us proceed',
  'i understand and agree', 'terms accepted',
];

const REFUSAL_PHRASES = [
  'i disagree', 'i refuse', 'i do not agree', "i don't agree",
  'no i do not', 'i decline', 'i reject', 'not acceptable',
  'i am not willing', 'nahi', 'mujhe manzoor nahi', 'i do not consent',
  'cancel', 'stop', 'i want to cancel', 'abort',
];

/* ─── State ──────────────────────────────────────────── */

let consentLocked = false;
let consentTimestamp = null;
let consentPhrase = null;

/* ─── Detection ──────────────────────────────────────── */

/**
 * Detect consent or refusal from text.
 *
 * @param {string} text - User's utterance
 * @returns {{
 *   consent: boolean,
 *   locked: boolean,
 *   phrase: string|null,
 *   confidence: 'high'|'medium'|'low',
 *   refusalDetected: boolean,
 *   timestamp: string|null,
 * }}
 */
export function detectConsent(text) {
  const lower = text.toLowerCase().trim();

  // Check for refusal first
  const matchedRefusal = REFUSAL_PHRASES.find((phrase) => lower.includes(phrase));
  if (matchedRefusal) {
    if (consentLocked) {
      // Consent was already locked — do NOT reverse it, but flag the refusal
      log('CONSENT', 'WARN', `Post-lock refusal detected: "${matchedRefusal}" — consent remains LOCKED`, {
        originalPhrase: consentPhrase,
        lockedAt: consentTimestamp,
      });

      return {
        consent: true, // stays true — locked
        locked: true,
        phrase: consentPhrase,
        confidence: 'high',
        refusalDetected: true,
        timestamp: consentTimestamp,
      };
    }

    log('CONSENT', 'INFO', `Refusal detected: "${matchedRefusal}"`);
    return {
      consent: false,
      locked: false,
      phrase: matchedRefusal,
      confidence: 'high',
      refusalDetected: true,
      timestamp: null,
    };
  }

  // Check for consent
  const matchedConsent = CONSENT_PHRASES.find((phrase) => lower.includes(phrase));
  if (matchedConsent) {
    if (!consentLocked) {
      // Lock consent
      consentLocked = true;
      consentTimestamp = new Date().toISOString();
      consentPhrase = matchedConsent;

      log('CONSENT', 'INFO', `✅ Consent LOCKED: "${matchedConsent}"`, {
        timestamp: consentTimestamp,
      });
    }

    return {
      consent: true,
      locked: true,
      phrase: consentPhrase,
      confidence: 'high',
      refusalDetected: false,
      timestamp: consentTimestamp,
    };
  }

  // No consent or refusal detected
  return {
    consent: consentLocked, // return existing lock state
    locked: consentLocked,
    phrase: consentPhrase,
    confidence: consentLocked ? 'high' : 'low',
    refusalDetected: false,
    timestamp: consentTimestamp,
  };
}

/**
 * Check if consent is currently locked.
 * @returns {boolean}
 */
export function isConsentLocked() {
  return consentLocked;
}

/**
 * Get consent details.
 * @returns {{ locked: boolean, phrase: string|null, timestamp: string|null }}
 */
export function getConsentState() {
  return {
    locked: consentLocked,
    phrase: consentPhrase,
    timestamp: consentTimestamp,
  };
}

/**
 * Reset consent state (e.g., for a new session).
 */
export function resetConsent() {
  consentLocked = false;
  consentTimestamp = null;
  consentPhrase = null;
  log('CONSENT', 'INFO', 'Consent state reset');
}

export default { detectConsent, isConsentLocked, getConsentState, resetConsent };
