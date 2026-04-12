/**
 * ─── Sarvam TTS Module ──────────────────────────────────
 * Converts text → audio via Sarvam AI Text-to-Speech API.
 * API: https://api.sarvam.ai/text-to-speech
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

// Playback state to prevent overlapping speech
let isPlaying = false;
let currentAudio = null;

/**
 * Get the Sarvam API key from environment.
 * @returns {string}
 */
function getApiKey() {
    const key = import.meta.env.VITE_SARVAM_API_KEY;
    if (!key) {
        log('TTS', 'ERROR', 'VITE_SARVAM_API_KEY is not set in .env');
        throw new Error('Sarvam API key not configured.');
    }
    return key;
}

/**
 * Synthesize text and play audio in the browser.
 * 
 * @param {string} text - text to speak
 * @param {Object} options
 * @returns {Promise<void>} Resolves when audio finishes playing
 */
export async function synthesizeAndPlay(text, options = {}) {
    const opts = options || {};
    if (!text) return;

    const {
        languageCode = 'en-IN',
        speaker = 'suhani', // 'suhani', 'mohit', etc.
        model = 'bulbul:v3'
    } = opts;

    log('TTS', 'INFO', `Generating audio for: "${text.slice(0, 60)}..."`);

    try {
        const apiKey = getApiKey();

        const payload = {
            text: text,
            target_language_code: languageCode,
            speaker: speaker,
            model: model,
        };

        const response = await axios.post(SARVAM_TTS_URL, payload, {
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000,
        });

        const audios = response.data?.audios;
        if (audios && audios.length > 0) {
            const base64Audio = audios[0];

            // Convert base64 to Blob URL to prevent dataURI length issues
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            // Using audio/wav, as Sarvam TTS typically defaults to wav
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);

            // Stop currently playing audio if any
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.src = '';
            }

            currentAudio = new Audio(audioUrl);

            return new Promise((resolve, reject) => {
                currentAudio.onplay = () => {
                    isPlaying = true;
                    window.dispatchEvent(new CustomEvent('ai_speaking_start', { detail: { text } }));
                };
                currentAudio.onended = () => {
                    isPlaying = false;
                    window.dispatchEvent(new CustomEvent('ai_speaking_end'));
                    URL.revokeObjectURL(audioUrl); // Free memory
                    resolve();
                };
                currentAudio.onerror = (e) => {
                    isPlaying = false;
                    const errCode = currentAudio.error ? currentAudio.error.code : 'unknown';
                    const errMsg = `Media playback error (code ${errCode})`;
                    reject(new Error(errMsg));
                };
                currentAudio.play().catch((err) => {
                    isPlaying = false;
                    reject(err);
                });
            });
        } else {
            throw new Error("No audio returned from Sarvam API");
        }
    } catch (error) {
        if (error.response) {
            log('TTS', 'ERROR', `API error (${error.response.status})`, error.response.data);
        } else {
            log('TTS', 'ERROR', `TTS failed`, error.message);
        }
    }
}

export function isAudioPlaying() {
    return isPlaying;
}
