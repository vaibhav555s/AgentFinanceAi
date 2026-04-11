/**
 * ─── AI Module Barrel Export ────────────────────────────
 */

export { extractFinancialData, mergeExtractedData, emptyExtraction } from './extraction.js';
export { detectIntent, getIntentLabel } from './intent.js';
export { assessRisk } from './risk.js';
export { detectConsent, isConsentLocked, getConsentState, resetConsent } from './consent.js';
