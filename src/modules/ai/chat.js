/**
 * ─── Groq Conversational AI Module ───────────────────────
 * Utilizes the Groq fast inference API to generate highly
 * contextual and conversational responses acting as a 
 * professional financial loan officer.
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

/**
 * Generate an LLM response.
 * 
 * @param {Array} transcript - the dialogue history
 * @param {Object} extractedData - Current extracted KYC fields
 * @returns {Promise<string>} Response text from the AI
 */
export async function generateResponse(transcript, extractedData) {
    log('CHAT', 'INFO', 'Calling Groq LLM with state', extractedData);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;

    if (!apiKey) {
        log('CHAT', 'ERROR', 'GROQ_API_KEY missing. Cannot generate response.');
        return "I am sorry, my connection is currently missing an API key. Please check your config.";
    }

    // Build the system prompt
    const systemPrompt = `You are a professional, polite, and extremely concise AI Loan Officer working for AgentFinance.
Your goal is to guide the user to complete their loan application.
Currently, the system has extracted the following information from the user:
${JSON.stringify(extractedData, null, 2)}

You must ask ONE quick follow up question to get the missing information (if any).
If all information (Full Name, Age, Employment Type, Monthly Income, Loan Purpose, Requested Amount) is complete, thank them and say you are processing the loan.
DO NOT use markdown, emojis, or lists. Respond with a single concise sentence.`;

    // Build the messages array from the transcript
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    for (const entry of transcript) {
        if (entry.speaker === 'user' || entry.speaker === 'agent') {
            messages.push({
                role: entry.speaker === 'user' ? 'user' : 'assistant',
                content: entry.text
            });
        }
    }

    try {
        const response = await axios.post(GROQ_API_URL, {
            model: MODEL,
            messages: messages,
            temperature: 0.5,
            max_tokens: 60,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const aiText = response.data.choices[0]?.message?.content || '';
        log('CHAT', 'INFO', `Generated Groq response: "${aiText}"`);
        return aiText.trim();
    } catch (error) {
        log('CHAT', 'ERROR', 'Groq API error:', error.response?.data || error.message);
        return null;
    }
}
