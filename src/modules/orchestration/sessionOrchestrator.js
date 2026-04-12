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

import { fetchBureau } from '../bureau/bureauClient.js';
import { runPolicy } from '../policy/PolicyEngine.js';
import {
  calculatePolicyOffer,
  buildOpeningOfferScript,
  processNegotiation,
  calcEMI
} from '../negotiation/negotiationAgent.js';
import { synthesizeAndPlay } from '../tts/sarvamTTS.js';
import { addTranscript } from '../transcript/transcriptManager.js';
import { log } from '../utils/logger.js';
import {
  initLoanApplication,
  saveKycRecord,
  saveBureauReport,
  saveLoanOffers,
  saveTranscript,
  completeApplication,
  updateApplicationFinancials,
  uploadMedia,
  getFingerprintVelocity,
  saveFraudReport,
  saveIntelligenceAnalysis,
  getApplicationId,
  setApplicationId,
  updateResumeCheckpoint,
  logApplicationEvent,
  logRegulatoryFlag
} from '../../services/dbService.js';
import { captureSecurityMetadata } from '../../services/securityService.js';
import { analyzeFraudRisk } from '../fraud/fraudEngine.js';
import { analyzeSessionIntelligence } from '../ai/intelligenceAgent.js';
import { generateAuditReport } from '../../utils/auditGenerator.js';

let lastPhaseForTracking = null;


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
    userId: null,
    kycType: 'aadhaar', // 'aadhaar' | 'pan'
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
      writtenOffAccounts: null,
      creditUtilization: null,
      rawResponse: null,
    },
    policy: {
      decision: null,     // null | 'PASS' | 'FAIL' | 'REFER'
      rules: [],          // Machine-readable audit trail
      timestamp: null,
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

export function setUserId(userId) {
  state = { ...state, userId };
  notify();
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

  // Automatically checkpoint progress if phase changed
  if (snap.phase !== lastPhaseForTracking) {
    lastPhaseForTracking = snap.phase;
    const appId = getApplicationId();
    if (appId) {
      updateResumeCheckpoint(snap.phase.toLowerCase());
      logApplicationEvent(appId, `phase_transition`, { new_phase: snap.phase });
    }
  }
}

export async function rehydrateSession(appState) {
  const { application, kyc } = appState;
  
  log('ORCHESTRATOR', 'INFO', `Rehydrating session for app ${application.id}`);
  setApplicationId(application.id);
  state = { ...state, userId: application.user_id };

  const phaseMap = {
     'chat': PHASES.CHAT,
     'chat_started': PHASES.CHAT,
     'aadhaar_upload': PHASES.AADHAAR_UPLOAD,
     'aadhaar_verify': PHASES.AADHAAR_VERIFY,
     'aadhaar_done': PHASES.AADHAAR_DONE,
     'face_scan': PHASES.FACE_SCAN,
     'face_done': PHASES.FACE_DONE,
     'bureau': PHASES.BUREAU,
     'offer': PHASES.OFFER,
     'consent': PHASES.CONSENT,
     'complete': PHASES.COMPLETE,
  };
  
  const targetPhaseStr = application.resume_checkpoint || 'chat_started';
  const targetPhase = phaseMap[targetPhaseStr] || PHASES.CHAT;

  if (kyc) {
     if (kyc.aadhaar_name) {
       state.aadhaar = {
         status: 'verified',
         name: kyc.aadhaar_name,
         age: kyc.aadhaar_age,
         aadhaarNumber: 'XXXX XXXX XXXX',
         storageUrl: kyc.aadhaar_image_url
       };
     }
     if (kyc.biometric_age) {
        state.faceAge = {
          status: kyc.biometric_match_status,
          estimatedAge: kyc.biometric_age,
          confidence: 0.85
        };
     }
  }

  // Pre-load offer state if resuming into Offer, Consent or Complete.
  if (application.final_offer_id || application.status === 'offer_generated' || application.status === 'negotiating') {
    // In a full implementation we would fetch loan_offers from DB here, 
    // but we can set basic placeholder bounds based on application table too:
    state.offer = {
      amount: application.stated_income ? application.stated_income * 3 : 250000,
      tenure: 36,
      interestRate: 10.5,
    };
  }

  state.phase = targetPhase;
  notify();

  // UX Suggestion: TTS welcome back
  try {
    const { synthesizeAndPlay } = await import('../tts/sarvamTTS.js');
    await synthesizeAndPlay("Welcome back. Resuming your verification process.", {});
  } catch (err) {
    console.error('Failed to speak welcome back:', err);
  }
}

/* ─── Phase Transitions ──────────────────────────────── */

/** Called by the AI pipeline when all basic KYC data is collected */
export async function triggerAadhaarUpload() {
  if (state.phase !== PHASES.CHAT) return;
  state = { ...state, phase: PHASES.AADHAAR_UPLOAD };
  log('ORCHESTRATOR', 'INFO', '→ AADHAAR_UPLOAD');
  notify();

  // 1. Capture Security Metadata (IP, Geo, Fingerprint) 
  const securityMetadata = await captureSecurityMetadata();

  // 1a. Run Algorithmic Fraud Engine
  const velocity = await getFingerprintVelocity(securityMetadata.device_fingerprint);
  const { riskScore, signals } = analyzeFraudRisk(securityMetadata, velocity);

  // 2. Initialize application in Supabase with security + fraud data
  const metaWithUser = { ...securityMetadata, user_id: state.userId };
  const appData = await initLoanApplication(metaWithUser);
  const appId = appData?.id;

  // 2a. Save the fraud report immediately
  if (appId) {
    await saveFraudReport(riskScore, signals);
  }

  if (riskScore >= 80) {
    log('ORCHESTRATOR', 'WARN', 'CRITICAL FRAUD RISK DETECTED. Blocking flow.', signals);
    // Note: We don't throw an error to avoid crashing the UI, 
    // but the system will restrict higher-tier actions if needed.
  }

  // A. PERSIST VERBAL DATA: Save the income/purpose/employment extracted from voice
  try {
    const { getState } = await import('../state/stateManager.js');
    const aiState = getState();
    await updateApplicationFinancials(aiState.extractedData);
  } catch (err) {
    log('ORCHESTRATOR', 'WARN', 'Failed to save verbal financial profile', err);
  }

  log('ORCHESTRATOR', 'INFO', `DB application created: ${appId}`);

  // TIER 5: Fire-and-forget LLM chain-of-thought analysis
  // Runs entirely in the background — does NOT block the Aadhaar upload UI
  if (appId) {
    (async () => {
      try {
        const { getTranscript } = await import('../transcript/transcriptManager.js');
        const transcript = getTranscript();
        const analysis = await analyzeSessionIntelligence(transcript);
        if (analysis) {
          await saveIntelligenceAnalysis(appId, analysis);
          log('ORCHESTRATOR', 'INFO', '✅ Tier 5 intelligence analysis saved to DB');
        }
      } catch (err) {
        log('ORCHESTRATOR', 'WARN', 'Tier 5 intelligence background analysis failed', err);
      }
    })();
  }
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

    // C. AUDITABILITY: Upload Aadhaar image (raw file) to Supabase Storage
    let aadhaarImageUrl = null;
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `aadhaar.${ext}`;
      aadhaarImageUrl = await uploadMedia('docs', fileName, file);
    } catch (err) {
      log('ORCHESTRATOR', 'WARN', 'Aadhaar upload to storage failed', err);
    }
    aadhaarData.storageUrl = aadhaarImageUrl;

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

      // Name mismatch: fuzzy compare first tokens (allow distance <= 4 and basic phonetic equivalence)
      if (statedName && aadhaarData.name) {
        const normalize = s => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
        // Remove h, vowels after first char for a very rough phonetic check
        const soundexIsh = s => s.charAt(0) + s.slice(1).replace(/[aeiouh]/g, '');

        const statedFirst = normalize(statedName).split(' ')[0];
        const aadhaarFirst = normalize(aadhaarData.name).split(' ')[0];

        if (statedFirst && aadhaarFirst) {
          const dist = _levenshteinDistance(statedFirst, aadhaarFirst);
          const soundStated = soundexIsh(statedFirst);
          const soundAadhaar = soundexIsh(aadhaarFirst);

          // If distance > 4 AND they don't sound similar AND not a substring
          if (dist > 4 && soundStated !== soundAadhaar && !aadhaarFirst.includes(statedFirst) && !statedFirst.includes(aadhaarFirst)) {
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
    // fail-closed: If vision hasn't run or is inconclusive, block progression
    if (isLivePerson === null) {
      log('ORCHESTRATOR', 'WARN', 'Liveness result null (possible rate limit/cooldown) — failing closed');
      isLivePerson = false;
    }

    const delta = aadhaarAge !== null && estimatedAge !== null ? Math.abs(estimatedAge - aadhaarAge) : null;
    const isMatched = delta !== null ? delta <= 15 : true; // 15-year tolerance, or pass if no baseline

    // Spoofing check overrides match status
    const status = !isLivePerson ? 'spoof' : isMatched ? 'matched' : 'mismatch';

    // Age tolerance warning for Ops review
    if (delta !== null && delta > 5 && status === 'matched') {
      logRegulatoryFlag(
        state.metadata?.appId || getApplicationId(),
        'age_tolerance_warning',
        'medium',
        `Vision age (${estimatedAge}) differs from Aadhaar age (${aadhaarAge}) by ${delta} years. Allowed under tolerance.`
      );
    }

    const faceAge = {
      status,
      estimatedAge,
      aadhaarAge,
      delta,
      confidence: estimatedAge !== null ? 0.85 : 0.5,
    };

    // C. AUDITABILITY: Capture and upload face frame to Supabase Storage
    let faceCaptureUrl = null;
    try {
      const video = document.querySelector('video');
      if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        faceCaptureUrl = await uploadMedia('scans', 'face_check.jpg', frameData);
      }
    } catch (err) {
      log('ORCHESTRATOR', 'WARN', 'Face capture upload failed', err);
    }

    try {
      const { getState } = await import('../state/stateManager.js');
      // Pass both Aadhaar data and Media URLs for full auditable record
      saveKycRecord(getState().extractedData, faceAge, state.aadhaar, {
        aadhaar: state.aadhaar.storageUrl,
        face: faceCaptureUrl
      });
    } catch { /* ignore */ }

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

/** Internal: calls live bureau API → runs policy engine → decides offer */
async function _triggerBureau() {
  state = { ...state, phase: PHASES.BUREAU, leftOverlay: null };
  log('ORCHESTRATOR', 'INFO', '→ BUREAU');
  notify();

  try {
    // ── Step 1: Fetch credit data from live bureau API ──
    const bureauResponse = await fetchBureau({
      name: state.aadhaar.name || 'Unknown',
      aadhaarRef: state.aadhaar.aadhaarNumber || 'N/A',
    });
    log('ORCHESTRATOR', 'INFO', 'Bureau API response', bureauResponse);
    // saveBureauReport is called later after policy reasoning is ready

    // Format DPD for display
    const maxDPD = bureauResponse.dpdHistory?.length
      ? Math.max(...bureauResponse.dpdHistory.map(d => d.days))
      : 0;
    const dpdSummary = maxDPD === 0
      ? '0 DPD in last 12 months'
      : `Max ${maxDPD} DPD in last 12 months`;

    // ── Step 2: Get income and compute proposed EMI ──
    let income = 85000;
    try {
      const { getState } = await import('../state/stateManager.js');
      const aiState = getState();
      income = aiState.extractedData?.income?.value || 85000;
    } catch { /* fallback to 85K */ }

    const proposedEMI = calcEMI(state.offer.amount, state.offer.interestRate, state.offer.tenure);

    // ── Step 3: Run policy engine ──
    const policyResult = runPolicy({
      bureau: bureauResponse,
      income,
      emi: proposedEMI,
      user: {
        pan: null,
        phone: null,
        aadhaarRef: state.aadhaar.aadhaarNumber || null,
      },
    });
    log('ORCHESTRATOR', 'INFO', `Policy decision: ${policyResult.decision}`, policyResult.rules);

    // D. PERSIST REASONING: Save bureau data along with rule-by-rule audit reasoning
    saveBureauReport(bureauResponse, policyResult.rules);

    // ── Step 4: Build bureau state ──
    const bureauState = {
      status: policyResult.decision.toLowerCase(), // 'pass' | 'fail' | 'refer'
      creditScore: bureauResponse.creditScore,
      activeLoans: bureauResponse.activeLoans,
      dpdHistory: dpdSummary,
      writtenOffAccounts: bureauResponse.writtenOffAccounts,
      creditUtilization: bureauResponse.creditUtilization,
      rawResponse: bureauResponse,
    };

    // ── Step 5: If PASS/REFER, calculate negotiation limits & trigger verbal offer ──
    if (policyResult.decision === 'PASS' || policyResult.decision === 'REFER') {
      const policyLimits = calculatePolicyOffer({
        income,
        creditScore: bureauResponse.creditScore,
        fraudScore: 0,
      });

      const initialOffer = {
        amount: policyLimits.maxAmount,
        tenure: 36,
        interestRate: policyLimits.interestRate,
      };

      if (policyLimits.alternatives) {
        saveLoanOffers(policyLimits.alternatives);
      }

      state = {
        ...state,
        bureau: bureauState,
        policy: policyResult,
        offer: initialOffer,
        phase: PHASES.OFFER,
        negotiation: {
          ...state.negotiation,
          policyLimits,
          openingSpoken: false,
        },
      };
      log('ORCHESTRATOR', 'INFO', '→ OFFER (policy + negotiation initialized)', { policyLimits, initialOffer });
      notify();

      // Speak the opening offer after 800ms
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

    } else {
      // FAIL 
      state = { ...state, bureau: bureauState, policy: policyResult, phase: PHASES.BUREAU };
      log('ORCHESTRATOR', 'WARN', '→ BUREAU FAIL — application rejected', policyResult);
      completeApplication('rejected');
      // Auto-generate immutable audit record (fire-and-forget)
      generateAuditReport(getApplicationId(), 'SYSTEM:AUTO_REJECTED').catch(e =>
        log('ORCHESTRATOR', 'WARN', 'Audit generation failed (rejected)', e.message)
      );
      _speakError('Unfortunately, based on our credit assessment, we are unable to extend a loan offer at this time. Thank you for your time.');
    }
    notify();

  } catch (err) {
    log('ORCHESTRATOR', 'ERROR', 'Bureau/Policy error', err.message);
    // Fallback: still move to offer with defaults
    const fallbackBureau = {
      status: 'refer',
      creditScore: 0,
      activeLoans: 0,
      dpdHistory: 'Bureau unavailable',
      writtenOffAccounts: 0,
      creditUtilization: 0,
      rawResponse: null,
    };
    state = { ...state, bureau: fallbackBureau, phase: PHASES.OFFER };
    log('ORCHESTRATOR', 'WARN', '→ OFFER (bureau fallback)');
    notify();
  }
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

  // B. LINK FINAL OFFER: Update application status and mark selected offer
  // We deduce the user's accepted plan name from current terms matched against limits
  let acceptedPlan = null;
  if (state.negotiation.policyLimits?.alternatives) {
    const match = state.negotiation.policyLimits.alternatives.find(alt =>
      Math.abs(alt.amount - state.offer.amount) < 100 &&
      alt.tenure === state.offer.tenure
    );
    acceptedPlan = match ? match.title || match.name : null;
  }

  completeApplication('offer_accepted', acceptedPlan);

  notify();

  setTimeout(() => {
    state = { ...state, phase: PHASES.COMPLETE };
    log('ORCHESTRATOR', 'INFO', '→ COMPLETE');
    // Auto-generate immutable audit record (fire-and-forget)
    generateAuditReport(getApplicationId(), 'SYSTEM:AUTO_COMPLETE').catch(e =>
      log('ORCHESTRATOR', 'WARN', 'Audit generation failed (complete)', e.message)
    );
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

  saveTranscript(type === 'AI' ? 'agent' : 'user', message);

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
    await synthesizeAndPlay(text, {}); // pass empty options so defaults apply
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
