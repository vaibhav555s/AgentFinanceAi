/**
 * ─── Intent Detection Module ────────────────────────────
 * Classifies the user's loan intent based on conversation text.
 *
 * Outputs:
 *  - intent category (medical_loan, personal_loan, etc.)
 *  - confidence score
 *  - matched keywords
 */

import { log } from '../utils/logger.js';

/* ─── Intent Definitions ─────────────────────────────── */

const INTENT_MAP = {
  medical_loan: {
    keywords: ['medical', 'hospital', 'surgery', 'treatment', 'health', 'doctor', 'medicine', 'illness', 'disease', 'patient', 'operation', 'clinic'],
    weight: 1.0,
  },
  education_loan: {
    keywords: ['education', 'college', 'university', 'school', 'study', 'tuition', 'course', 'degree', 'exam', 'scholarship', 'mba', 'engineering', 'abroad'],
    weight: 1.0,
  },
  home_loan: {
    keywords: ['home', 'house', 'renovation', 'construction', 'flat', 'apartment', 'property', 'building', 'real estate', 'plot', 'repair', 'interior'],
    weight: 1.0,
  },
  personal_loan: {
    keywords: ['personal', 'wedding', 'marriage', 'travel', 'vacation', 'family', 'emergency', 'expense', 'celebration', 'festival'],
    weight: 0.9,
  },
  business_loan: {
    keywords: ['business', 'startup', 'shop', 'company', 'invest', 'investment', 'capital', 'trade', 'inventory', 'revenue', 'profit', 'entrepreneur'],
    weight: 1.0,
  },
  vehicle_loan: {
    keywords: ['car', 'bike', 'vehicle', 'scooter', 'auto', 'motorcycle', 'truck', 'driving'],
    weight: 1.0,
  },
  agriculture_loan: {
    keywords: ['agriculture', 'farming', 'crop', 'tractor', 'land', 'harvest', 'seeds', 'irrigation', 'cattle'],
    weight: 1.0,
  },
};

/* ─── Detect Intent ──────────────────────────────────── */

/**
 * Detect loan intent from text.
 *
 * @param {string} text - User's transcribed speech
 * @returns {{ intent: string, confidence: 'high'|'medium'|'low', score: number, matchedKeywords: string[] }}
 */
export function detectIntent(text) {
  const lower = text.toLowerCase();

  let bestIntent = 'unknown';
  let bestScore = 0;
  let bestMatched = [];

  for (const [intent, config] of Object.entries(INTENT_MAP)) {
    const matched = config.keywords.filter((kw) => lower.includes(kw));
    const score = matched.length * config.weight;

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
      bestMatched = matched;
    }
  }

  // Determine confidence level
  let confidence;
  if (bestScore >= 3) {
    confidence = 'high';
  } else if (bestScore >= 1.5) {
    confidence = 'medium';
  } else if (bestScore >= 0.9) {
    confidence = 'low';
  } else {
    confidence = 'low';
    bestIntent = 'unknown';
  }

  const result = {
    intent: bestIntent,
    confidence,
    score: Math.round(bestScore * 100) / 100,
    matchedKeywords: bestMatched,
  };

  log('INTENT', 'INFO', `Detected intent: ${bestIntent} (${confidence})`, {
    score: result.score,
    keywords: bestMatched,
  });

  return result;
}

/**
 * Get a human-readable label for an intent.
 * @param {string} intent
 * @returns {string}
 */
export function getIntentLabel(intent) {
  const labels = {
    medical_loan: 'Medical Loan',
    education_loan: 'Education Loan',
    home_loan: 'Home Loan',
    personal_loan: 'Personal Loan',
    business_loan: 'Business Loan',
    vehicle_loan: 'Vehicle Loan',
    agriculture_loan: 'Agriculture Loan',
    unknown: 'Not Determined',
  };
  return labels[intent] || intent;
}

export default { detectIntent, getIntentLabel };
