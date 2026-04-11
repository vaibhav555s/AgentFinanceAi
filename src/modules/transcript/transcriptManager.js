/**
 * ─── Transcript Manager ─────────────────────────────────
 * Maintains the full conversation history between user and AI.
 * Provides utilities for retrieval and full-text concatenation.
 */

import { log } from '../utils/logger.js';

/**
 * @typedef {{ role: 'user'|'ai', text: string, timestamp: string, confidence: number }} TranscriptEntry
 */

/** @type {TranscriptEntry[]} */
let transcript = [];

/**
 * Add a new entry to the transcript.
 *
 * @param {'user'|'ai'} role - Who is speaking
 * @param {string} text - What was said
 * @param {number} [confidence=1.0] - STT confidence for this utterance
 */
export function addTranscript(role, text, confidence = 1.0) {
  if (!text || text.trim().length === 0) {
    log('TRANSCRIPT', 'WARN', 'Skipped empty transcript entry');
    return;
  }

  const entry = {
    role,
    text: text.trim(),
    timestamp: new Date().toISOString(),
    confidence,
  };

  transcript.push(entry);

  log('TRANSCRIPT', 'INFO', `[${role.toUpperCase()}] "${text.trim().slice(0, 60)}..."`, {
    entryCount: transcript.length,
    confidence,
  });
}

/**
 * Get the full transcript array.
 * @returns {TranscriptEntry[]}
 */
export function getTranscript() {
  return [...transcript];
}

/**
 * Get only user utterances concatenated as a single string.
 * This is the primary input for AI analysis modules.
 * @returns {string}
 */
export function getFullUserText() {
  return transcript
    .filter((e) => e.role === 'user')
    .map((e) => e.text)
    .join('. ');
}

/**
 * Get the last N entries.
 * @param {number} n
 * @returns {TranscriptEntry[]}
 */
export function getLastEntries(n = 5) {
  return transcript.slice(-n);
}

/**
 * Get total number of entries.
 * @returns {number}
 */
export function getEntryCount() {
  return transcript.length;
}

/**
 * Clear the entire transcript.
 */
export function clearTranscript() {
  const count = transcript.length;
  transcript = [];
  log('TRANSCRIPT', 'INFO', `Cleared transcript (${count} entries removed)`);
}

export default {
  addTranscript,
  getTranscript,
  getFullUserText,
  getLastEntries,
  getEntryCount,
  clearTranscript,
};
