/**
 * ─── Sarvam STT Module ──────────────────────────────────
 * Converts audio blobs → text via Sarvam AI Speech-to-Text API.
 *
 * Designed for chunk-based processing:
 *   MediaRecorder.start(2000)  →  2-second blobs
 *   Each blob is independently transcribed for low latency.
 *
 * API: https://api.sarvam.ai/speech-to-text
 */

import axios from 'axios';
import { log } from '../utils/logger.js';
import { convertToWav } from './audioConverter.js';

const SARVAM_API_URL = 'https://api.sarvam.ai/speech-to-text';

/**
 * Get the Sarvam API key from environment.
 * @returns {string}
 */
function getApiKey() {
  const key = import.meta.env.VITE_SARVAM_API_KEY;
  if (!key) {
    log('STT', 'ERROR', 'VITE_SARVAM_API_KEY is not set in .env');
    throw new Error('Sarvam API key not configured. Set VITE_SARVAM_API_KEY in your .env file.');
  }
  return key;
}

/**
 * Transcribe a single audio blob (chunk) via Sarvam API.
 *
 * @param {Blob} audioBlob - Audio data (webm/ogg from MediaRecorder, or wav)
 * @param {Object} [options]
 * @param {string} [options.languageCode='hi-IN'] - BCP-47 language code
 * @param {string} [options.model='saaras:v3'] - Sarvam model identifier
 * @returns {Promise<{ text: string, confidence: number, languageCode: string }>}
 */
export async function transcribe(audioBlob, options = {}) {
  const {
    languageCode = 'en-IN',
    model = 'saarika:v2.5',
  } = options;

  const startTime = performance.now();

  log('STT', 'INFO', `Transcribing chunk — ${(audioBlob.size / 1024).toFixed(1)} KB, type: ${audioBlob.type}`);

  try {
    const apiKey = getApiKey();

    // Convert to WAV — Sarvam rejects raw webm/opus chunks from MediaRecorder
    const wavBlob = audioBlob.type.includes('wav')
      ? audioBlob
      : await convertToWav(audioBlob);

    // Build multipart form
    const formData = new FormData();
    formData.append('file', wavBlob, 'chunk.wav');
    formData.append('language_code', languageCode);
    formData.append('model', model);

    const response = await axios.post(SARVAM_API_URL, formData, {
      headers: {
        'api-subscription-key': apiKey,
      },
      timeout: 10000, // 10s timeout per chunk
    });

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    const transcript = response.data?.transcript ?? '';
    const confidence = response.data?.confidence ?? 0.0;
    const detectedLang = response.data?.language_code ?? languageCode;

    log('STT', 'INFO', `Transcribed in ${elapsed}s → "${transcript.slice(0, 80)}..."`, {
      confidence,
      language: detectedLang,
      chunkSizeKB: (audioBlob.size / 1024).toFixed(1),
    });

    return {
      text: transcript.trim(),
      confidence: typeof confidence === 'number' ? confidence : parseFloat(confidence) || 0.85,
      languageCode: detectedLang,
    };
  } catch (error) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    if (error.response) {
      log('STT', 'ERROR', `API error (${error.response.status}) after ${elapsed}s`, {
        status: error.response.status,
        message: error.response.data?.message || error.response.data?.error || JSON.stringify(error.response.data),
      });
    } else if (error.code === 'ECONNABORTED') {
      log('STT', 'ERROR', `Timeout after ${elapsed}s — chunk too large or network slow`);
    } else {
      log('STT', 'ERROR', `Transcription failed after ${elapsed}s`, error.message);
    }

    // Return empty on failure so pipeline doesn't crash
    return {
      text: '',
      confidence: 0,
      languageCode,
    };
  }
}

/**
 * Transcribe from a direct text input (bypass STT — used for testing / fallback).
 *
 * @param {string} text
 * @returns {{ text: string, confidence: number, languageCode: string }}
 */
export function transcribeText(text) {
  log('STT', 'INFO', `Direct text input → "${text.slice(0, 80)}..."`);
  return {
    text: text.trim(),
    confidence: 1.0,
    languageCode: 'en-IN',
  };
}

export default { transcribe, transcribeText };
