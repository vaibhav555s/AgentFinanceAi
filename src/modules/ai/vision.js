/**
 * ─── Groq Vision AI Module ────────────────────────────────
 * Performs visual analysis using Groq's Llama 4 Vision models.
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Predict user age from a base64 image frame using Groq Llama 4.
 * 
 * @param {string} base64Image - Data URL or raw base64 string
 * @returns {Promise<{ age: number|null, confidence: number }>}
 */
export async function predictAgeFromFrame(base64Image) {
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
                            text: 'Estimate the age of the person in this image. Respond with ONLY the numeric age (e.g., "25"). If no person is found, respond with 0.'
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
            max_tokens: 50,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const aiText = response.data.choices[0]?.message?.content || '';
        log('VISION', 'INFO', `Vision raw response: "${aiText}"`);

        const ageMatch = aiText.match(/\d+/);
        const age = ageMatch ? parseInt(ageMatch[0]) : 0;

        if (age > 0 && age < 120) {
            return { age, confidence: 0.85 };
        }

        return { age: null, confidence: 0 };
    } catch (error) {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        log('VISION', 'ERROR', `Groq Vision API error: ${detail}`);
        return { age: null, confidence: 0 };
    }
}

export default { predictAgeFromFrame };
