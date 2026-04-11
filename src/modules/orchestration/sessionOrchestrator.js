/**
 * ─── Session Orchestrator ────────────────────────────────
 * The single source of truth for what phase the session is in.
 * All UI panels read from here. The AI pipeline writes to here.
 *
 * PHASES:
 *   CHAT           → AI is talking, collecting basic info
 *   AADHAAR_UPLOAD → AI has asked for doc, user needs to upload
 *   AADHAAR_VERIFY → File uploaded, showing "fetching data" animation
 *   AADHAAR_DONE   → Aadhaar verified, extracted age/DOB shown
 *   FACE_SCAN      → Camera age detection running (left panel animation)
 *   FACE_DONE      → Age matched / flagged
 *   BUREAU         → Credit bureau API being called
 *   OFFER          → Loan offer presented, user can negotiate
 *   CONSENT        → Verbal consent capture
 *   COMPLETE       → Session done
 */

import { log } from '../utils/logger.js';

/* ─── Phase Definitions ──────────────────────────────── */
export const PHASES = {
  CHAT: 'CHAT',
  AADHAAR_UPLOAD: 'AADHAAR_UPLOAD',
  AADHAAR_VERIFY: 'AADHAAR_VERIFY',
  AADHAAR_DONE: 'AADHAAR_DONE',
  FACE_SCAN: 'FACE_SCAN',
  FACE_DONE: 'FACE_DONE',
  BUREAU: 'BUREAU',
  OFFER: 'OFFER',
  CONSENT: 'CONSENT',
  COMPLETE: 'COMPLETE',
};

/* ─── Initial State ──────────────────────────────────── */
function createInitialState() {
  return {
    phase: PHASES.CHAT,
    aadhaar: {
      status: null,       // null | 'verified' | 'failed'
      name: null,
      dob: null,
      age: null,
      aadhaarNumber: null,
    },
    faceAge: {
      status: null,       // null | 'matched' | 'mismatch'
      estimatedAge: null,
      aadhaarAge: null,
      delta: null,
      confidence: null,
    },
    bureau: {
      status: null,       // null | 'pass' | 'fail' | 'refer'
      creditScore: null,
      activeLoans: null,
      dpdHistory: null,
    },
    offer: {
      amount: 250000,
      tenure: 36,
      interestRate: 10.5,
      negotiationRounds: 0,
    },
    consent: {
      detected: false,
      phrase: null,
      timestamp: null,
      hash: null,
    },
    leftOverlay: null,   // null | 'scanning' | 'scan_success' | 'scan_fail'
  };
}

/* ─── State Store ────────────────────────────────────── */
let state = createInitialState();
const listeners = new Set();

/* ─── Getters ────────────────────────────────────────── */
export function getOrchestratorState() {
  return { ...state };
}

export function getPhase() {
  return state.phase;
}

/* ─── Subscriber ─────────────────────────────────────── */
export function subscribeOrchestrator(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const snap = { ...state };
  listeners.forEach(fn => {
    try { fn(snap); } catch (e) { /* ignore */ }
  });
}

/* ─── Phase Transitions ──────────────────────────────── */

/** Called by the AI pipeline when all basic KYC data is collected */
export function triggerAadhaarUpload() {
  if (state.phase !== PHASES.CHAT) return;
  state = { ...state, phase: PHASES.AADHAAR_UPLOAD };
  log('ORCHESTRATOR', 'INFO', '→ AADHAAR_UPLOAD');
  notify();
}

/** Called when user has uploaded the Aadhaar file */
export function triggerAadhaarVerify(_file) {
  if (state.phase !== PHASES.AADHAAR_UPLOAD) return;
  state = { ...state, phase: PHASES.AADHAAR_VERIFY };
  log('ORCHESTRATOR', 'INFO', '→ AADHAAR_VERIFY');
  notify();

  // ── HARDCODED MOCK: Simulate friend's Aadhaar API (2.5s delay) ──
  // TODO: Replace with real API call from friend's implementation
  setTimeout(() => {
    const mockAadhaarData = {
      status: 'verified',
      name: 'Rahul Sharma',
      dob: '14 Aug 1991',
      age: 32,
      aadhaarNumber: 'XXXX XXXX 9284',
    };
    state = {
      ...state,
      phase: PHASES.AADHAAR_DONE,
      aadhaar: mockAadhaarData,
    };
    log('ORCHESTRATOR', 'INFO', '→ AADHAAR_DONE (mock)', mockAadhaarData);
    notify();

    // Auto-trigger face scan after 1.5s
    setTimeout(() => _triggerFaceScan(), 1500);
  }, 2500);
}

/** Internal: starts face age detection scan */
function _triggerFaceScan() {
  state = { ...state, phase: PHASES.FACE_SCAN, leftOverlay: 'scanning' };
  log('ORCHESTRATOR', 'INFO', '→ FACE_SCAN');
  notify();

  // ── HARDCODED MOCK: Simulate friend's camera age API (3s delay) ──
  // TODO: Replace with real camera API from friend's implementation
  setTimeout(() => {
    const aadhaarAge = state.aadhaar.age || 32;
    const estimatedAge = 30; // Mock — replace with real camera API result
    const delta = Math.abs(estimatedAge - aadhaarAge);
    const matched = delta <= 5; // 5 year tolerance threshold

    const faceAge = {
      status: matched ? 'matched' : 'mismatch',
      estimatedAge,
      aadhaarAge,
      delta,
      confidence: 0.94,
    };

    state = {
      ...state,
      phase: PHASES.FACE_DONE,
      leftOverlay: matched ? 'scan_success' : 'scan_fail',
      faceAge,
    };
    log('ORCHESTRATOR', 'INFO', '→ FACE_DONE (mock)', faceAge);
    notify();

    // Auto-trigger bureau check after 2s
    setTimeout(() => _triggerBureau(), 2000);
  }, 3000);
}

/** Internal: runs mock credit bureau check */
function _triggerBureau() {
  state = { ...state, phase: PHASES.BUREAU, leftOverlay: null };
  log('ORCHESTRATOR', 'INFO', '→ BUREAU');
  notify();

  // ── HARDCODED MOCK: Simulate credit bureau API (2s delay) ──
  setTimeout(() => {
    const mockBureau = {
      status: 'pass',
      creditScore: 742,
      activeLoans: 1,
      dpdHistory: '0 DPD in last 12 months',
    };
    state = { ...state, bureau: mockBureau, phase: PHASES.OFFER };
    log('ORCHESTRATOR', 'INFO', '→ OFFER (bureau passed)', mockBureau);
    notify();
  }, 2000);
}

/** Called when user verbally consents */
export function triggerConsent(phrase) {
  if (state.phase !== PHASES.OFFER) return;
  const hash = _generateHash(phrase + state.offer.amount + Date.now());
  state = {
    ...state,
    phase: PHASES.CONSENT,
    consent: {
      detected: true,
      phrase,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      hash,
    },
  };
  log('ORCHESTRATOR', 'INFO', '→ CONSENT', { phrase, hash });
  notify();

  setTimeout(() => {
    state = { ...state, phase: PHASES.COMPLETE };
    log('ORCHESTRATOR', 'INFO', '→ COMPLETE');
    notify();
  }, 2000);
}

/** Update loan offer (during negotiation) */
export function updateOffer(amount, tenure) {
  state = {
    ...state,
    offer: {
      ...state.offer,
      amount,
      tenure,
      negotiationRounds: state.offer.negotiationRounds + 1,
    },
  };
  notify();
}

/** Reset for new session */
export function resetOrchestrator() {
  state = createInitialState();
  notify();
}

/* ─── Helpers ────────────────────────────────────────── */
function _generateHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}
