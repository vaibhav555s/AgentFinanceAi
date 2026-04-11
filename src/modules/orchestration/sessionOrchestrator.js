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
import { calculatePolicyOffer, buildOpeningOfferScript } from '../negotiation/negotiationAgent.js';
import { synthesizeAndPlay } from '../tts/sarvamTTS.js';
import { addTranscript } from '../transcript/transcriptManager.js';

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
    },
    consent: {
      detected: false,
      phrase: null,
      timestamp: null,
      hash: null,
    },
    leftOverlay: null,
    // Tier 8: Negotiation state
    negotiation: {
      policyLimits: null,   // set when bureau completes
      log: [],              // array of negotiation round entries
      currentRound: 0,
      finalTerms: null,     // set when offer is accepted
      openingSpoken: false, // whether AI has presented offer verbally
    },
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

  setTimeout(() => {
    const mockBureau = {
      status: 'pass',
      creditScore: 742,
      activeLoans: 1,
      dpdHistory: '0 DPD in last 12 months',
    };

    // ── Policy Engine: compute personalised offer based on bureau data ──
    // We'll use the income from state if available, else default to 85000
    const income = 85000; // TODO: pull from stateManager.extractedData.income.value
    const policyLimits = calculatePolicyOffer({
      income,
      creditScore: mockBureau.creditScore,
      fraudScore: 0,
    });

    const initialOffer = {
      amount: policyLimits.initialAmount,
      tenure: 36,
      interestRate: policyLimits.interestRate,
    };

    state = {
      ...state,
      bureau: mockBureau,
      offer: initialOffer,
      phase: PHASES.OFFER,
      negotiation: {
        ...state.negotiation,
        policyLimits,
        openingSpoken: false,
      },
    };
    log('ORCHESTRATOR', 'INFO', '→ OFFER (policy engine)', { policyLimits, initialOffer });
    notify();

    // Speak the opening offer after 800ms (let UI paint first)
    setTimeout(async () => {
      const script = buildOpeningOfferScript(initialOffer, policyLimits);
      addTranscript('agent', script, 1.0);
      window.dispatchEvent(new Event('ai_speaking_start'));
      try {
        await synthesizeAndPlay(script);
      } catch (_) { /* ignore TTS errors */ }
      window.dispatchEvent(new Event('ai_speaking_end'));
      state = { ...state, negotiation: { ...state.negotiation, openingSpoken: true } };
      notify();
    }, 800);
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

/**
 * Add a negotiation round entry to the log.
 * @param {{ type: 'AI'|'USER', message: string, amount?: number, tenure?: number, rate?: number }} entry
 */
export function addNegotiationRound({ type, message, amount, tenure, rate }) {
  const roundNum = type === 'AI'
    ? state.negotiation.currentRound + 1
    : state.negotiation.currentRound;

  const entry = {
    round: roundNum,
    type,
    message,
    amount: amount || state.offer.amount,
    tenure: tenure || state.offer.tenure,
    rate: rate || state.offer.interestRate,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
  };

  const newCurrentRound = type === 'AI' ? roundNum : state.negotiation.currentRound;

  state = {
    ...state,
    negotiation: {
      ...state.negotiation,
      log: [...state.negotiation.log, entry],
      currentRound: newCurrentRound,
    },
  };
  notify();
}

/**
 * Apply a counter-offer from the negotiation agent.
 * Updates the offer amount/tenure/rate on the state.
 */
export function applyCounterOffer(amount, tenure, rate) {
  if (state.phase !== PHASES.OFFER) return;
  state = {
    ...state,
    offer: {
      ...state.offer,
      amount: amount || state.offer.amount,
      tenure: tenure || state.offer.tenure,
      interestRate: rate || state.offer.interestRate,
    },
  };
  log('NEGOTIATION', 'INFO', `Counter offer applied: ₹${amount} / ${tenure}mo @ ${rate}%`);
  notify();
}

/**
 * Finalise negotiation — locks accepted terms with full audit log.
 * Called when negotiation agent returns ACTION:ACCEPT.
 */
export function finalizeNegotiation(phrase) {
  if (state.phase !== PHASES.OFFER) return;

  const finalTerms = {
    amount: state.offer.amount,
    tenure: state.offer.tenure,
    interestRate: state.offer.interestRate,
    totalRounds: state.negotiation.currentRound,
    acceptedAt: new Date().toISOString(),
    sessionRef: `AGF-${Date.now().toString(36).toUpperCase()}`,
    log: state.negotiation.log,
  };

  state = {
    ...state,
    negotiation: { ...state.negotiation, finalTerms },
  };

  log('NEGOTIATION', 'INFO', '✅ Offer accepted — terms locked', finalTerms);

  // Trigger consent phase
  triggerConsent(phrase || 'Customer verbally accepted the loan offer');
}

/** Update loan offer (called from UI slider interaction) */
export function updateOffer(amount, tenure) {
  state = {
    ...state,
    offer: { ...state.offer, amount, tenure },
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
