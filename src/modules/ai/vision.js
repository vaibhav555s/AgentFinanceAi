/**
 * ─── Groq Vision AI Module ────────────────────────────────
 * Performs visual analysis using Groq's Llama 4 Vision models.
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Predict user age and liveness from a base64 image frame using Groq Llama 4.
 * 
 * @param {string} base64Image - Data URL or raw base64 string
 * @returns {Promise<{ age: number|null, isLivePerson: boolean|null, confidence: number }>}
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
                            text: 'Analyze this image: 1) Estimate the numeric age of the person. 2) Determine if this is a live person physically standing in front of the camera. The DEFAULT state is true. You must ONLY set `isLivePerson: false` if you explicitly see a hand holding a glowing phone screen, or a hand holding a printed picture. If the image is just a person staring at a camera (even with webcam glare or a busy background), assume it is live and set to true. If NO human face is found in the image at all, return {"age": 0, "isLivePerson": false}. Respond EXACTLY in this JSON format: {"age": 25, "isLivePerson": true}. Output ONLY valid JSON.'
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
        const isLivePerson = Boolean(result.isLivePerson);

        return { age: finalAge, isLivePerson, confidence: finalAge ? 0.85 : 0.5 };
    } catch (error) {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        log('VISION', 'ERROR', `Groq Vision API error: ${detail}`);
        return { age: null, isLivePerson: false, confidence: 0 };
    }
}

export default { predictAgeFromFrame };
