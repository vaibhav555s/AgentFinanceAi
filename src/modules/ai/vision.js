/**
 * ─── Groq Vision AI Module ────────────────────────────────
 * Performs visual analysis using Groq's Llama 4 Vision models.
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Rate-limit cooldown: skip vision calls for 60s after a 429
let rateLimitCooldownUntil = 0;

/**
 * Predict user age and liveness from a base64 image frame using Groq Llama 4.
 * 
 * @param {string} base64Image - Data URL or raw base64 string
 * @returns {Promise<{ age: number|null, isLivePerson: boolean|null, confidence: number }>}
 */
export async function predictAgeFromFrame(base64Image) {
    // If we're in a cooldown period after a 429, skip this call entirely
    if (Date.now() < rateLimitCooldownUntil) {
        log('VISION', 'INFO', `Skipping vision call — rate-limit cooldown (${Math.ceil((rateLimitCooldownUntil - Date.now()) / 1000)}s remaining)`);
        return { age: null, isLivePerson: null, confidence: 0 };
    }

    log('VISION', 'INFO', 'Analyzing frame with Groq Llama 4 Scout...');

    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
    if (!apiKey) {
        log('VISION', 'ERROR', 'GROQ_API_KEY missing.');
        return { age: null, confidence: 0 };
    }

    // Ensure it's a data URL
    const imageData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    try {
        const response = await axios.post(GROQ_API_URL, {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analyze this image for biometric liveness. IMPORTANT: You are a security scanner. Look for indicators of a "presentation attack" or spoofing. \n\nCheck for:\n1) Phone or Monitor borders (black bezels around the person).\n2) Moiré patterns or screen pixels (grid-like interference).\n3) Glowing glare or reflections on a phone screen glass.\n4) Static photographs or paper printouts (flat textures, white borders).\n\nIf the image looks like a screen being held up to a camera, or a printed photo, set `isLivePerson: false`. \nIf NO human face is clearly visible, or the room is pitch black, set `isLivePerson: false`. \nONLY set `isLivePerson: true` if you are confident it is a real human in a natural 3D environment.\n\nAlso estimate the numeric age.\nRespond ONLY in this JSON format: {"age": 25, "isLivePerson": true}.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData,
                                detail: 'low'
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 100,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const aiText = response.data.choices[0]?.message?.content || '{}';
        log('VISION', 'INFO', `Vision raw response: "${aiText}"`);

        let result = { age: 0, isLivePerson: false };
        try {
            // Find JSON boundaries just in case
            const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
            result = JSON.parse(jsonStr);
        } catch (e) {
            log('VISION', 'WARN', 'Failed to parse JSON from Vision model');
        }

        const ageNum = Number(result.age) || null;
        let finalAge = null;

        if (ageNum !== null && ageNum > 0 && ageNum < 120) {
            finalAge = ageNum;
        }

        // isLivePerson is handled independently of whether the model successfully guessed an age string
        // Cast to boolean explicitly (handles both actual booleans and string "true"/"false")
        const isLivePerson = String(result.isLivePerson).toLowerCase() === 'true';

        // Post-processing security guard: if we have NO confidence in age (0 or null), it likely means NO FACE found
        const finalLiveness = (finalAge === null) ? false : isLivePerson;

        // Developer Bypass Toggle (env-based)
        if (import.meta.env.VITE_BYPASS_LIVENESS === 'true') {
            log('VISION', 'WARN', 'Bypassing liveness result (VITE_BYPASS_LIVENESS=true)');
            return { age: finalAge || 25, isLivePerson: true, confidence: 0.99 };
        }

        return { age: finalAge, isLivePerson: finalLiveness, confidence: finalAge ? 0.85 : 0.5 };
    } catch (error) {
        const status = error.response?.status;
        const errData = error.response?.data;
        const detail = errData ? JSON.stringify(errData) : error.message;
        log('VISION', 'ERROR', `Groq Vision API error: ${detail}`);

        if (status === 429) {
            const errMsg = errData?.error?.message || '';

            // Daily quota exhausted — enter a brief cooldown to avoid spamming
            if (errMsg.includes('tokens per day') || errMsg.includes('TPD')) {
                rateLimitCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minute lockout instead of 6 hours
                log('VISION', 'WARN', 'Daily token limit hit — entering 5-minute cooldown');
            } else {
                // Parse "Please try again in Xm Ys" or "Xs" from the error message
                let cooldownMs = 60000; // default 60s
                const minSecMatch = errMsg.match(/(\d+)m(\d+(?:\.\d+)?)s/);
                const secMatch = errMsg.match(/(\d+(?:\.\d+)?)s/);
                if (minSecMatch) {
                    cooldownMs = (parseInt(minSecMatch[1]) * 60 + parseFloat(minSecMatch[2])) * 1000;
                } else if (secMatch) {
                    cooldownMs = parseFloat(secMatch[1]) * 1000;
                }
                // Cap at 10 minutes to avoid indefinite silence
                cooldownMs = Math.min(cooldownMs + 5000, 10 * 60 * 1000);
                rateLimitCooldownUntil = Date.now() + cooldownMs;
                log('VISION', 'WARN', `Rate limited — cooldown ${Math.ceil(cooldownMs / 1000)}s`);
            }
        }

        return { age: null, isLivePerson: null, confidence: 0 };
    }
}

export default { predictAgeFromFrame };
