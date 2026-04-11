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
                            text: 'Analyze this image for two things: 1) Estimate the numeric age of the person. 2) Determine if this is a live person physically matching the camera, OR if it is a spoof (a static photo, screen displaying a face, deepfake, holding up a printed picture). Look extremely closely for rectangular borders of a phone screen, fingers holding a photo, moiré patterns from a digital screen, or paper glare/reflections. If there is ANY visual evidence that this is a photo of a photo or a screen in a screen, set isLivePerson to false. Respond EXACTLY in this JSON format: {"age": 25, "isLivePerson": true}. If no person is found, return {"age": 0, "isLivePerson": false}. Output ONLY valid JSON.'
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

        const age = Number(result.age) || 0;
        const isLivePerson = Boolean(result.isLivePerson);

        if (age > 0 && age < 120) {
            return { age, isLivePerson, confidence: 0.85 };
        }

        return { age: null, isLivePerson: false, confidence: 0 };
    } catch (error) {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        log('VISION', 'ERROR', `Groq Vision API error: ${detail}`);
        return { age: null, isLivePerson: false, confidence: 0 };
    }
}

export default { predictAgeFromFrame };
