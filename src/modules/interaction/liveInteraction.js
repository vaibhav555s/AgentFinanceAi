/**
 * ─── Live Interaction Controller ────────────────────────
 * Main orchestrator — ties together STT, Transcript, AI modules, and State.
 *
 * Flow:
 *   Audio chunk → Sarvam STT → Transcript Manager → AI modules → State Manager → Output
 *
 * Features:
 *   - processAudio(blob) — full pipeline from audio
 *   - processText(text)  — bypass STT for testing
 *   - Debounced AI processing (configurable delay)
 *   - Incremental extraction merge
 *   - Session lifecycle (start, reset)
 */

import { transcribe, transcribeText } from '../stt/sarvamSTT.js';
import { addTranscript, getFullUserText, clearTranscript, getTranscript } from '../transcript/transcriptManager.js';
import { extractFinancialData, mergeExtractedData } from '../ai/extraction.js';
import { detectIntent } from '../ai/intent.js';
import { assessRisk } from '../ai/risk.js';
import { detectConsent, resetConsent } from '../ai/consent.js';
import { generateResponse } from '../ai/chat.js';
import { synthesizeAndPlay, isAudioPlaying } from '../tts/sarvamTTS.js';
import { predictAgeFromFrame } from '../ai/vision.js';
import {
  getState,
  updateExtractedData,
  updateRisk,
  updateIntent,
  updateConsent,
  incrementStats,
  incrementUtterances,
  incrementErrors,
  resetState,
  getStructuredOutput,
} from '../state/stateManager.js';
import { log } from '../utils/logger.js';

/* ─── Debounce Utility ───────────────────────────────── */

/**
 * Creates a debounced version of a function.
 * @param {Function} fn
 * @param {number} delayMs
 * @returns {{ call: Function, cancel: Function }}
 */
function createDebounce(fn, delayMs) {
  let timer = null;
  return {
    call(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

/* ─── Configuration ──────────────────────────────────── */

let config = {
  debounceMs: 1500,       // Debounce AI processing by 1.5s
  sttLanguage: 'en-IN',   // English-India (handles Hinglish, outputs Latin script for extraction)
  sttModel: 'saarika:v2.5', // Sarvam model
};

/**
 * Update interaction controller configuration.
 * @param {Partial<typeof config>} overrides
 */
export function configure(overrides) {
  config = { ...config, ...overrides };
  log('INTERACTION', 'INFO', 'Configuration updated', config);
}

/* ─── AI Processing Pipeline ─────────────────────────── */

let previousExtraction = null; // Track for inconsistency detection

/**
 * Run the full AI pipeline on the accumulated transcript.
 * Called after debounce settles.
 */
async function runAIPipeline() {
  const startTime = performance.now();
  const currentState = getState();

  try {
    const fullText = getFullUserText();
    if (!fullText || fullText.trim().length === 0) {
      log('INTERACTION', 'WARN', 'AI pipeline skipped — no user text yet');
      return;
    }

    // 1. Extract financial data from full text
    const newExtraction = extractFinancialData(fullText);

    // 2. Merge with existing extracted data (no overwrite, tracks changes)
    const { merged, changes } = mergeExtractedData(
      currentState.extractedData,
      newExtraction
    );
    updateExtractedData(merged, changes);

    // 3. Detect intent from full text
    const intentResult = detectIntent(fullText);
    updateIntent(intentResult);

    // 4. Assess risk (with consistency checking)
    const riskResult = assessRisk(fullText, merged, previousExtraction);
    updateRisk(riskResult);

    // 5. Detect consent from full text
    const consentResult = detectConsent(fullText);
    updateConsent(consentResult);

    // 6. Update tracking refs
    previousExtraction = { ...merged };
    incrementStats();

    const elapsed = ((performance.now() - startTime)).toFixed(1);
    log('INTERACTION', 'INFO', `✅ AI pipeline complete in ${elapsed}ms`, {
      extraction: changes.length > 0 ? changes : 'no changes',
      intent: intentResult.intent,
      risk: riskResult.level,
      consent: consentResult.consent,
    });

    // 7. Generate a conversational AI response based on updated state
    const transcript = getTranscript(); // get full transcript so we know sequence
    const aiResponseText = await generateResponse(transcript, merged);

    // Check if we should actually speak (avoid interrupting current speech and avoid repeating)
    const lastAgentText = transcript.slice().reverse().find(t => t.speaker === 'agent')?.text;

    if (aiResponseText && aiResponseText !== lastAgentText && !isAudioPlaying()) {
      addTranscript('agent', aiResponseText, 1.0);
      try {
        await synthesizeAndPlay(aiResponseText);
      } catch (err) {
        log('INTERACTION', 'ERROR', 'Could not play TTS', err);
      }
    }

  } catch (error) {
    incrementErrors();
    log('INTERACTION', 'ERROR', 'AI pipeline failed', error.message);
  }
}

// Create debounced pipeline
let debouncedPipeline = createDebounce(runAIPipeline, config.debounceMs);

/* ─── Public API ─────────────────────────────────────── */

/**
 * Process an audio blob through the FULL pipeline:
 *   Audio → STT → Transcript → (debounced) AI → State → Output
 *
 * @param {Blob} audioBlob - Audio chunk from MediaRecorder
 * @returns {Promise<{
 *   transcribedText: string,
 *   confidence: number,
 *   structuredOutput: Object
 * }>}
 */
export async function processAudio(audioBlob) {
  log('INTERACTION', 'INFO', `Processing audio chunk — ${(audioBlob.size / 1024).toFixed(1)} KB`);

  try {
    // Step 1: STT
    const sttResult = await transcribe(audioBlob, {
      languageCode: config.sttLanguage,
      model: config.sttModel,
    });

    if (!sttResult.text || sttResult.text.trim().length === 0) {
      log('INTERACTION', 'WARN', 'STT returned empty text — skipping');
      return {
        transcribedText: '',
        confidence: 0,
        structuredOutput: getStructuredOutput(),
      };
    }

    // Step 2: Add to transcript
    addTranscript('user', sttResult.text, sttResult.confidence);
    incrementUtterances();

    // Step 3: Run AI processing immediately (no debounce for PTT)
    debouncedPipeline.cancel();
    await runAIPipeline();

    // Return current state
    return {
      transcribedText: sttResult.text,
      confidence: sttResult.confidence,
      structuredOutput: getStructuredOutput(),
    };

  } catch (error) {
    incrementErrors();
    log('INTERACTION', 'ERROR', 'processAudio failed', error.message);
    return {
      transcribedText: '',
      confidence: 0,
      structuredOutput: getStructuredOutput(),
    };
  }
}

/**
 * Process direct text input (bypass STT).
 * Useful for testing, typing fallback, or chat-based input.
 *
 * @param {string} text
 * @returns {{
 *   transcribedText: string,
 *   confidence: number,
 *   structuredOutput: Object
 * }}
 */
export function processText(text) {
  log('INTERACTION', 'INFO', `Processing text: "${text.slice(0, 60)}..."`);

  if (!text || text.trim().length === 0) {
    log('INTERACTION', 'WARN', 'Empty text — skipping');
    return {
      transcribedText: '',
      confidence: 0,
      structuredOutput: getStructuredOutput(),
    };
  }

  // Add to transcript
  addTranscript('user', text, 1.0);
  incrementUtterances();

  // Run AI immediately
  debouncedPipeline.cancel();
  runAIPipeline();

  return {
    transcribedText: text,
    confidence: 1.0,
    structuredOutput: getStructuredOutput(),
  };
}

/**
 * Process a captured video frame for age prediction.
 * 
 * @param {string} base64Image - Captured frame from webcam
 */
export async function processVideoFrame(base64Image) {
  log('INTERACTION', 'INFO', 'Processing video frame for visual analysis');

  try {
    const { age, confidence } = await predictAgeFromFrame(base64Image);

    if (age !== null) {
      console.log(`[VIDEO_ANALYSIS] Age predicted: ${age} (confidence: ${confidence})`);
      const currentState = getState();
      const nextExtraction = {
        ...currentState.extractedData,
        age: {
          value: age,
          confidence: confidence,
          source: 'video_analysis',
          updatedAt: new Date().toISOString()
        }
      };

      updateExtractedData(nextExtraction, [`age: (predicted) ${age}`]);
    }
  } catch (error) {
    log('INTERACTION', 'ERROR', 'processVideoFrame failed', error.message);
  }
}

/**
 * Force-run the AI pipeline immediately (bypass debounce).
 * Useful when you need real-time results (e.g., before consent step).
 */
export function forceProcess() {
  debouncedPipeline.cancel();
  runAIPipeline();
  return getStructuredOutput();
}

/**
 * Get the current structured output without processing.
 * @returns {Object}
 */
export function getCurrentOutput() {
  return getStructuredOutput();
}

/**
 * Get the full transcript.
 * @returns {Array}
 */
export function getFullTranscript() {
  return getTranscript();
}

/**
 * Reset everything for a new session.
 */
export function reset() {
  debouncedPipeline.cancel();
  clearTranscript();
  resetConsent();
  resetState();
  previousExtraction = null;
  debouncedPipeline = createDebounce(runAIPipeline, config.debounceMs);
  log('INTERACTION', 'INFO', '🔄 Session fully reset');
}

export default {
  processAudio,
  processText,
  processVideoFrame,
  forceProcess,
  getCurrentOutput,
  getFullTranscript,
  configure,
  reset,
};
