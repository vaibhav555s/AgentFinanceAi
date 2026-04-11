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
    kycMismatch: {
      checked: false,     // Has cross-verify been run?
      flagged: false,     // Is there any mismatch?
      nameMismatch: false,
      ageMismatch: false,
      statedName: null,   // What user said verbally
      statedAge: null,
      aadhaarName: null,  // What Aadhaar says
      aadhaarAge: null,
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
export async function triggerAadhaarVerify(file) {
  if (state.phase !== PHASES.AADHAAR_UPLOAD) return;
  state = { ...state, phase: PHASES.AADHAAR_VERIFY };
  log('ORCHESTRATOR', 'INFO', '→ AADHAAR_VERIFY');
  notify();

  try {
    // ── Step 1: Extract QR from the uploaded file ─────────────────────
    const { extractQR } = await import('../aadhaar-verification/QRExtractor.js');
    const { parseAadhaar } = await import('../aadhaar-verification/AadhaarParser.js');

    log('ORCHESTRATOR', 'INFO', 'Extracting QR from uploaded Aadhaar...');
    const qrData = await extractQR(file);

    if (!qrData) {
      log('ORCHESTRATOR', 'ERROR', 'No QR code found in Aadhaar document');
      state = {
        ...state,
        phase: PHASES.AADHAAR_UPLOAD,
        aadhaar: { status: 'failed', error: 'No QR code found. Please upload a clear Aadhaar copy.' }
      };
      notify();
      _speakError('I could not find a QR code in the document you uploaded. Please make sure you are uploading a clear image of your Aadhaar card with a visible QR code, and try again.');
      return;
    }

    // ── Step 2: Parse QR data into structured Aadhaar fields ──────────
    const parsed = parseAadhaar(qrData);

    if (!parsed || !parsed.verified) {
      log('ORCHESTRATOR', 'ERROR', 'Aadhaar QR parsing failed');
      state = {
        ...state,
        phase: PHASES.AADHAAR_UPLOAD,
        aadhaar: { status: 'failed', error: 'Could not parse Aadhaar data. Please try a clearer image.' }
      };
      notify();
      _speakError('I was unable to read the Aadhaar data from your document. The QR code may be damaged or blurry. Please upload a clearer image of your Aadhaar card to proceed.');
      return;
    }

    // ── Step 3: Compute age from DOB ──────────────────────────────────
    let age = null;
    if (parsed.dob) {
      // Supports DD-MM-YYYY, YYYY, and "YYYY (Year of Birth)"
      const yearMatch = parsed.dob.match(/(\d{4})/);
      if (yearMatch) {
        age = new Date().getFullYear() - parseInt(yearMatch[1]);
      }
    }

    const aadhaarData = {
      status: 'verified',
      name: parsed.name || 'Aadhaar Holder',
      dob: parsed.dob || 'N/A',
      age,
      aadhaarNumber: parsed.uid ? `XXXX XXXX ${parsed.uid}` : 'XXXX XXXX XXXX',
      gender: parsed.gender || null,
      address: parsed.address || null,
      photo: parsed.photo || null,
    };

    // ── Step 4: Cross-verify stated name/age vs Aadhaar ──────────────
    let kycMismatch = {
      checked: true, flagged: false, nameMismatch: false, ageMismatch: false,
      statedName: null, statedAge: null, aadhaarName: aadhaarData.name, aadhaarAge: aadhaarData.age
    };

    try {
      const { getState } = await import('../state/stateManager.js');
      const aiState = getState();
      const statedName = aiState.extractedData?.name?.value || null;
      const statedAge = aiState.extractedData?.age?.value || null;

      kycMismatch.statedName = statedName;
      kycMismatch.statedAge = statedAge;

      // Name mismatch: fuzzy compare first tokens (allow distance <= 2)
      if (statedName && aadhaarData.name) {
        const normalize = s => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
        const statedFirst = normalize(statedName).split(' ')[0];
        const aadhaarFirst = normalize(aadhaarData.name).split(' ')[0];

        if (statedFirst && aadhaarFirst) {
          const dist = _levenshteinDistance(statedFirst, aadhaarFirst);
          // If distance > 2 and it is not a direct substring in either direction, flag it
          if (dist > 2 && !aadhaarFirst.includes(statedFirst) && !statedFirst.includes(aadhaarFirst)) {
            kycMismatch.nameMismatch = true;
          }
        }
      }

      // Age mismatch: >5 year difference from Aadhaar DOB-derived age
      if (statedAge !== null && aadhaarData.age !== null) {
        if (Math.abs(statedAge - aadhaarData.age) > 5) {
          kycMismatch.ageMismatch = true;
        }
      }

      kycMismatch.flagged = kycMismatch.nameMismatch || kycMismatch.ageMismatch;

      if (kycMismatch.flagged) {
        log('ORCHESTRATOR', 'WARN', '⚠️ KYC MISMATCH DETECTED', {
          statedName, statedAge,
          aadhaarName: aadhaarData.name, aadhaarAge: aadhaarData.age
        });
      }
    } catch { /* If state read fails, skip cross-check silently */ }

    state = { ...state, phase: PHASES.AADHAAR_DONE, aadhaar: aadhaarData, kycMismatch };
    log('ORCHESTRATOR', 'INFO', '→ AADHAAR_DONE (real)', aadhaarData);
    notify();

    if (kycMismatch.flagged) {
      log('ORCHESTRATOR', 'WARN', 'Halting progression due to KYC Mismatch');
      _speakError('The details on your Aadhaar card do not match the information you provided earlier. Please upload a correct Aadhaar document that belongs to you.');
      // Do NOT trigger face scan
    } else {
      // Auto-trigger face scan after 1.5s
      setTimeout(() => _triggerFaceScan(), 1500);
    }

  } catch (err) {
    log('ORCHESTRATOR', 'ERROR', 'Aadhaar verification error', err.message);
    state = {
      ...state,
      phase: PHASES.AADHAAR_UPLOAD,
      aadhaar: { status: 'failed', error: err.message }
    };
    notify();
  }
}

/** Internal: starts face age detection scan */
function _triggerFaceScan() {
  state = { ...state, phase: PHASES.FACE_SCAN, leftOverlay: 'scanning' };
  log('ORCHESTRATOR', 'INFO', '→ FACE_SCAN');
  notify();

  // Use the real camera-predicted age from the AI vision module
  setTimeout(async () => {
    const aadhaarAge = state.aadhaar.age || null;

    // Pull the vision-predicted age and liveness from the AI state
    let estimatedAge = null;
    let isLivePerson = null;
    try {
      const { getState } = await import('../state/stateManager.js');
      const aiState = getState();
      estimatedAge = aiState.extractedData?.biometricAge?.value ?? null;
      isLivePerson = aiState.liveness?.isLivePerson ?? null;
    } catch { /* silently fallback */ }

    // If vision hasn't run yet, fall back to aadhaarAge for now (matched)
    if (estimatedAge === null) {
      estimatedAge = aadhaarAge;
    }
    // Default to true if the model couldn't determine liveness
    if (isLivePerson === null) {
      isLivePerson = true;
    }

    const delta = aadhaarAge !== null && estimatedAge !== null ? Math.abs(estimatedAge - aadhaarAge) : null;
    const isMatched = delta !== null ? delta <= 12 : true; // 12-year tolerance, or pass if no baseline

    // Spoofing check overrides match status
    const status = !isLivePerson ? 'spoof' : isMatched ? 'matched' : 'mismatch';

    const faceAge = {
      status,
      estimatedAge,
      aadhaarAge,
      delta,
      confidence: estimatedAge !== null ? 0.85 : 0.5,
    };

    state = {
      ...state,
      phase: PHASES.FACE_DONE,
      leftOverlay: status === 'matched' ? 'scan_success' : 'scan_fail',
      faceAge,
    };
    log('ORCHESTRATOR', 'INFO', '→ FACE_DONE (real vision)', faceAge);
    notify();

    // Auto-trigger bureau check after 2s ONLY if it passes
    if (status === 'matched') {
      setTimeout(() => _triggerBureau(), 2000);
    } else if (status === 'spoof') {
      log('ORCHESTRATOR', 'WARN', 'Halting progression due to anti-spoofing failure');
      _speakError('You have failed the biometric liveness check. Please ensure you are a real person looking directly at the camera and not holding up a photograph.');
    } else {
      log('ORCHESTRATOR', 'WARN', 'Halting progression due to age mismatch');
      _speakError('Your biometric age does not match your Aadhaar age. We cannot proceed with the application.');
    }
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

/** Retry Aadhaar Upload (e.g. after KYC Mismatch) */
export function retryAadhaarUpload() {
  if (state.phase !== PHASES.AADHAAR_DONE) return;
  state = {
    ...state,
    phase: PHASES.AADHAAR_UPLOAD,
    aadhaar: { status: null, name: null, dob: null, age: null, aadhaarNumber: null },
    kycMismatch: null
  };
  log('ORCHESTRATOR', 'INFO', '→ AADHAAR_UPLOAD (Retrying)');
  notify();
}

/* ─── Helpers ────────────────────────────────────────── */
async function _speakError(text) {
  try {
    const { synthesizeAndPlay } = await import('../tts/sarvamTTS.js');
    await synthesizeAndPlay(text, null); // null agentVoice means use default TTS voice
  } catch (err) {
    console.error('Failed to speak error:', err);
  }
}

function _generateHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

function _levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
  for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}
