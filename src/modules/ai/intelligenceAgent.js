/**
 * ─── Intelligence Agent (Tier 5) ─────────────────────────
 * Processes the full session transcript through an LLM to produce:
 *   1. Intent Classification with chain-of-thought reasoning
 *   2. Risk Persona label with chain-of-thought reasoning
 *
 * This runs ASYNCHRONOUSLY after the CHAT phase concludes,
 * so it never blocks or slows down the user-facing flow.
 *
 * Every output includes a structured reasoning trace —
 * black-box outputs are not acceptable per Tier 5 rules.
 */

import axios from 'axios';
import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

/**
 * Build the system prompt that enforces structured JSON output
 * with chain-of-thought reasoning arrays.
 */
function buildAnalysisPrompt() {
  return `You are an expert financial risk analyst and loan classification engine.
You will receive the full transcript of a conversation between a user and an AI loan officer.

Your job is to produce TWO analyses, each with a mandatory chain-of-thought reasoning trace.

## 1. INTENT CLASSIFICATION
Assign exactly ONE loan intent category from this list:
- home_improvement
- medical
- education
- debt_consolidation
- personal
- business
- vehicle
- agriculture
- unknown

Provide a confidence score (0-100) and a step-by-step reasoning array.

## 2. RISK PERSONA
Assign exactly ONE risk persona label from this list:
- conservative_borrower (low risk, stable indicators)
- moderate_borrower (average risk, some concerns)
- first_time_borrower (no credit history indicators)
- aspirational_borrower (ambitious plans, moderate income)
- distressed_borrower (urgency, desperation, financial stress)

Provide a step-by-step reasoning array based on language, tone, stated context, and financial indicators.

## OUTPUT FORMAT
You MUST respond with ONLY valid JSON, no markdown, no explanation outside JSON:
{
  "intent": {
    "category": "<category>",
    "confidence": <0-100>,
    "chainOfThought": [
      "Step 1: <observation>",
      "Step 2: <observation>",
      "Step 3: <conclusion>"
    ]
  },
  "riskPersona": {
    "label": "<persona_label>",
    "chainOfThought": [
      "Step 1: <observation>",
      "Step 2: <observation>",
      "Step 3: <conclusion>"
    ]
  }
}`;
}

/**
 * Formats the raw transcript array into a readable dialogue string.
 * @param {Array<{speaker: string, text: string}>} transcript
 * @returns {string}
 */
function formatTranscript(transcript) {
  if (!transcript || transcript.length === 0) return '[Empty transcript]';
  return transcript
    .map(entry => `${entry.speaker?.toUpperCase() || 'UNKNOWN'}: ${entry.text}`)
    .join('\n');
}

/**
 * Calls the Groq LLM with the full transcript and returns
 * structured intent + risk persona with chain-of-thought traces.
 *
 * @param {Array} transcript - Full session transcript
 * @returns {Promise<{intent: Object, riskPersona: Object} | null>}
 */
export async function analyzeSessionIntelligence(transcript) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;

  if (!apiKey) {
    log('INTELLIGENCE', 'ERROR', 'GROQ_API_KEY missing — cannot run intelligence analysis');
    return null;
  }

  const formattedTranscript = formatTranscript(transcript);

  log('INTELLIGENCE', 'INFO', 'Starting chain-of-thought analysis...', {
    transcriptEntries: transcript?.length || 0,
  });

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: buildAnalysisPrompt() },
          { role: 'user', content: `Here is the full session transcript:\n\n${formattedTranscript}` },
        ],
        temperature: 0.3,   // Low temp for deterministic, reasoned output
        max_tokens: 800,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const rawContent = response.data.choices?.[0]?.message?.content;
    if (!rawContent) {
      log('INTELLIGENCE', 'WARN', 'LLM returned empty content');
      return null;
    }

    log('INTELLIGENCE', 'INFO', `LLM raw response: ${rawContent.substring(0, 200)}...`);

    // Parse the JSON
    const parsed = JSON.parse(rawContent);

    // Validate structure
    if (!parsed.intent || !parsed.riskPersona) {
      log('INTELLIGENCE', 'WARN', 'LLM output missing required keys', parsed);
      return null;
    }

    // Ensure chainOfThought arrays exist (guard against partial LLM output)
    if (!Array.isArray(parsed.intent.chainOfThought)) {
      parsed.intent.chainOfThought = ['No reasoning trace provided by the model.'];
    }
    if (!Array.isArray(parsed.riskPersona.chainOfThought)) {
      parsed.riskPersona.chainOfThought = ['No reasoning trace provided by the model.'];
    }

    log('INTELLIGENCE', 'INFO', `✅ Analysis complete — Intent: ${parsed.intent.category} (${parsed.intent.confidence}%), Persona: ${parsed.riskPersona.label}`, {
      intentSteps: parsed.intent.chainOfThought.length,
      personaSteps: parsed.riskPersona.chainOfThought.length,
    });

    return parsed;
  } catch (error) {
    // Don't crash the app — this is a background task
    const detail = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;
    log('INTELLIGENCE', 'ERROR', `Chain-of-thought analysis failed: ${detail}`);
    return null;
  }
}
