/**
 * ─── State Manager ──────────────────────────────────────
 * Central state store for the AI Intelligence Layer.
 *
 * Prevents recalculating everything on every chunk.
 * Holds aggregated state across the session:
 *   - extractedData (incrementally merged)
 *   - risk assessment
 *   - intent classification
 *   - consent status
 *   - processing stats
 *
 * Emits change events for UI reactivity.
 */

import { log } from '../utils/logger.js';
import { emptyExtraction } from '../ai/extraction.js';

/* ─── State Shape ────────────────────────────────────── */

/** @type {ReturnType<typeof createInitialState>} */
let state = createInitialState();

/** @type {Set<(state: any) => void>} */
const listeners = new Set();

function createInitialState() {
  return {
    // Extracted financial data (merged incrementally)
    extractedData: emptyExtraction(),

    // Risk assessment
    risk: {
      level: 'low',
      category: 'safe',
      score: 0,
      flags: [],
      breakdown: {},
    },

    // Intent classification
    intent: {
      intent: 'unknown',
      confidence: 'low',
      score: 0,
      matchedKeywords: [],
    },

    // Consent status
    consent: {
      consent: false,
      locked: false,
      phrase: null,
      confidence: 'low',
      refusalDetected: false,
      timestamp: null,
    },

    // Liveness Detection / Anti-Spoofing
    liveness: {
      isLivePerson: null,
      confidence: 0,
    },

    // Processing stats
    stats: {
      chunksProcessed: 0,
      totalUtterances: 0,
      lastProcessedAt: null,
      sessionStartedAt: new Date().toISOString(),
      errorCount: 0,
    },

    // Change history (last 20 changes)
    changeLog: [],
  };
}

/* ─── State Access ───────────────────────────────────── */

/**
 * Get a snapshot of the current state.
 * @returns {Object}
 */
export function getState() {
  return { ...state };
}

/**
 * Get a specific slice of state.
 * @param {'extractedData'|'risk'|'intent'|'consent'|'stats'} key
 * @returns {*}
 */
export function getStateSlice(key) {
  return state[key] ? { ...state[key] } : null;
}

/* ─── State Updates ──────────────────────────────────── */

/**
 * Update extracted data (merged with existing).
 * @param {Object} newData - Merged extraction result
 * @param {string[]} changes - List of what changed
 */
export function updateExtractedData(newData, changes = []) {
  state.extractedData = { ...newData };
  if (changes.length > 0) {
    addToChangeLog('extraction', changes);
  }
  notifyListeners();
}

/**
 * Update risk assessment.
 * @param {Object} riskResult
 */
export function updateRisk(riskResult) {
  const prevLevel = state.risk.level;
  state.risk = { ...riskResult };
  if (riskResult.level !== prevLevel) {
    addToChangeLog('risk', [`${prevLevel} → ${riskResult.level} (score: ${riskResult.score})`]);
  }
  notifyListeners();
}

/**
 * Update intent classification.
 * @param {Object} intentResult
 */
export function updateIntent(intentResult) {
  const prevIntent = state.intent.intent;
  state.intent = { ...intentResult };
  if (intentResult.intent !== prevIntent) {
    addToChangeLog('intent', [`${prevIntent} → ${intentResult.intent}`]);
  }
  notifyListeners();
}

/**
 * Update liveness detection variables.
 * @param {boolean} isLivePerson
 * @param {number} confidence
 */
export function updateLiveness(isLivePerson, confidence) {
  state.liveness = { isLivePerson, confidence };
  notifyListeners();
}

/**
 * Update consent status.
 * @param {Object} consentResult
 */
export function updateConsent(consentResult) {
  const wasLocked = state.consent.locked;
  state.consent = { ...consentResult };
  if (!wasLocked && consentResult.locked) {
    addToChangeLog('consent', [`Consent LOCKED: "${consentResult.phrase}"`]);
  }
  notifyListeners();
}

/**
 * Increment processing stats.
 */
export function incrementStats() {
  state.stats.chunksProcessed += 1;
  state.stats.lastProcessedAt = new Date().toISOString();
  notifyListeners();
}

/**
 * Increment utterance count.
 */
export function incrementUtterances() {
  state.stats.totalUtterances += 1;
}

/**
 * Increment error count.
 */
export function incrementErrors() {
  state.stats.errorCount += 1;
}

/* ─── Change Log ─────────────────────────────────────── */

const MAX_CHANGELOG = 20;

function addToChangeLog(module, changes) {
  const entry = {
    module,
    changes,
    timestamp: new Date().toISOString(),
  };
  state.changeLog.push(entry);
  if (state.changeLog.length > MAX_CHANGELOG) {
    state.changeLog = state.changeLog.slice(-MAX_CHANGELOG);
  }

  log('STATE', 'INFO', `State updated [${module}]`, changes);
}

/* ─── Listeners ──────────────────────────────────────── */

/**
 * Subscribe to state changes.
 * @param {(state: Object) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const snapshot = getState();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      log('STATE', 'ERROR', 'Listener error', err);
    }
  });
}

/* ─── Reset ──────────────────────────────────────────── */

/**
 * Full state reset (new session).
 */
export function resetState() {
  state = createInitialState();
  log('STATE', 'INFO', 'State fully reset for new session');
  notifyListeners();
}

/**
 * Get a serializable snapshot for sending to backend.
 * @returns {Object}
 */
export function getStructuredOutput() {
  return {
    extractedData: {
      name: state.extractedData.name.value,
      income: state.extractedData.income.value,
      loanAmount: state.extractedData.loanAmount.value,
      purpose: state.extractedData.purpose.value,
      employment: state.extractedData.employment.value,
      age: state.extractedData.age.value,
    },
    confidences: {
      name: state.extractedData.name.confidence,
      income: state.extractedData.income.confidence,
      loanAmount: state.extractedData.loanAmount.confidence,
      purpose: state.extractedData.purpose.confidence,
      employment: state.extractedData.employment.confidence,
      age: state.extractedData.age.confidence,
    },
    risk: {
      level: state.risk.level,
      category: state.risk.category,
      score: state.risk.score,
      flagCount: state.risk.flags.length,
    },
    intent: {
      intent: state.intent.intent,
      confidence: state.intent.confidence,
    },
    consent: {
      consent: state.consent.consent,
      locked: state.consent.locked,
      phrase: state.consent.phrase,
    },
    stats: { ...state.stats },
    timestamp: new Date().toISOString(),
  };
}

export default {
  getState,
  getStateSlice,
  updateExtractedData,
  updateRisk,
  updateIntent,
  updateConsent,
  incrementStats,
  incrementUtterances,
  incrementErrors,
  subscribe,
  resetState,
  getStructuredOutput,
};
