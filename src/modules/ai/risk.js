/**
 * ─── Risk Assessment Module ─────────────────────────────
 * Detects borrower risk level from conversation text + extracted data.
 *
 * Enhanced signals:
 *  - Urgency language
 *  - Desperation / emotional distress keywords
 *  - Income-to-loan ratio
 *  - Inconsistent statements (values changing)
 *  - Vague evasive answers
 *  - Refusal to share information
 *  - Multiple risk signals compound
 */

import { log } from '../utils/logger.js';

/* ─── Signal Definitions ─────────────────────────────── */

const URGENCY_KEYWORDS = [
  'urgent', 'urgently', 'immediately', 'asap', 'now', 'today', 'right now',
  'quickly', 'fast', 'hurry', 'desperate', 'jaldi', 'abhi', 'turant',
];

const DESPERATION_KEYWORDS = [
  'please', 'begging', 'beg', 'only option', 'last option', 'no other way',
  'helpless', 'nowhere to go', 'struggling', 'suffering', 'dying', 'critical',
  'life or death', 'very serious', 'extremely important', 'cannot survive',
];

const EVASION_KEYWORDS = [
  "don't want to tell", "can't say", "won't tell", "not going to share",
  "why do you need", "that's private", "none of your business",
  "skip this", "not relevant", "i'd rather not", "prefer not to",
  "don't ask", "why should i", "is that necessary",
];

const VAGUE_KEYWORDS = [
  "some amount", "not sure", "don't know", "maybe", "something like",
  "approximately", "around that", "can't remember", "don't remember",
  "i think", "i guess", "roughly",
];

const INCONSISTENCY_INDICATORS = [
  "actually", "i mean", "i meant", "sorry i said", "correction",
  "wait no", "not that", "let me correct", "i was wrong",
];

/* ─── Risk Scoring ───────────────────────────────────── */

/**
 * Count keyword hits in text, returning matched keywords.
 * @param {string} text
 * @param {string[]} keywords
 * @returns {{ count: number, matched: string[] }}
 */
function countKeywordHits(text, keywords) {
  const lower = text.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw));
  return { count: matched.length, matched };
}

/**
 * Assess borrower risk from text and extracted financial data.
 *
 * @param {string} text - Full user transcript text
 * @param {Object} extractedData - Output from extraction.extractFinancialData
 * @param {Object} [previousExtraction] - Previous extraction for inconsistency detection
 * @returns {{
 *   level: 'low'|'medium'|'high'|'critical',
 *   category: 'safe'|'moderate'|'risky'|'distressed',
 *   score: number,
 *   flags: Array<{ signal: string, severity: 'low'|'medium'|'high', details: string }>,
 *   breakdown: Object
 * }}
 */
export function assessRisk(text, extractedData = {}, previousExtraction = null) {
  const flags = [];
  let score = 0;

  // ── 1. Urgency ──
  const urgency = countKeywordHits(text, URGENCY_KEYWORDS);
  if (urgency.count > 0) {
    const severity = urgency.count >= 3 ? 'high' : urgency.count >= 2 ? 'medium' : 'low';
    const points = urgency.count * 8;
    score += points;
    flags.push({
      signal: 'urgency_language',
      severity,
      details: `Detected ${urgency.count} urgency keyword(s): ${urgency.matched.join(', ')}`,
    });
  }

  // ── 2. Desperation ──
  const desperation = countKeywordHits(text, DESPERATION_KEYWORDS);
  if (desperation.count > 0) {
    const severity = desperation.count >= 3 ? 'high' : desperation.count >= 2 ? 'medium' : 'low';
    const points = desperation.count * 12;
    score += points;
    flags.push({
      signal: 'emotional_distress',
      severity,
      details: `Detected ${desperation.count} distress keyword(s): ${desperation.matched.join(', ')}`,
    });
  }

  // ── 3. Evasion / Refusal ──
  const evasion = countKeywordHits(text, EVASION_KEYWORDS);
  if (evasion.count > 0) {
    const severity = evasion.count >= 2 ? 'high' : 'medium';
    const points = evasion.count * 15;
    score += points;
    flags.push({
      signal: 'refusal_to_share',
      severity,
      details: `User refused/avoided sharing info ${evasion.count} time(s): ${evasion.matched.join(', ')}`,
    });
  }

  // ── 4. Vagueness ──
  const vague = countKeywordHits(text, VAGUE_KEYWORDS);
  if (vague.count > 0) {
    const severity = vague.count >= 3 ? 'medium' : 'low';
    const points = vague.count * 5;
    score += points;
    flags.push({
      signal: 'vague_answers',
      severity,
      details: `${vague.count} vague expression(s) detected: ${vague.matched.join(', ')}`,
    });
  }

  // ── 5. Inconsistency (self-correction language) ──
  const inconsistency = countKeywordHits(text, INCONSISTENCY_INDICATORS);
  if (inconsistency.count > 0) {
    const severity = inconsistency.count >= 2 ? 'high' : 'medium';
    const points = inconsistency.count * 10;
    score += points;
    flags.push({
      signal: 'inconsistent_statements',
      severity,
      details: `${inconsistency.count} self-correction(s) detected: ${inconsistency.matched.join(', ')}`,
    });
  }

  // ── 6. Data-level inconsistency (values changed between extractions) ──
  if (previousExtraction) {
    const changes = [];
    for (const field of ['income', 'loanAmount']) {
      const prev = previousExtraction[field]?.value;
      const curr = extractedData[field]?.value;
      if (prev && curr && prev !== curr) {
        changes.push(`${field}: ${prev} → ${curr}`);
      }
    }
    if (changes.length > 0) {
      score += changes.length * 12;
      flags.push({
        signal: 'data_inconsistency',
        severity: 'high',
        details: `Values changed: ${changes.join('; ')}`,
      });
    }
  }

  // ── 7. Income-to-Loan Ratio ──
  const income = extractedData?.income?.value;
  const loanAmount = extractedData?.loanAmount?.value;

  if (income && loanAmount && income > 0) {
    const ratio = loanAmount / income;
    if (ratio > 50) {
      score += 25;
      flags.push({
        signal: 'extreme_loan_to_income',
        severity: 'high',
        details: `Loan-to-income ratio: ${ratio.toFixed(1)}x (loan ${loanAmount} vs monthly income ${income})`,
      });
    } else if (ratio > 20) {
      score += 15;
      flags.push({
        signal: 'high_loan_to_income',
        severity: 'medium',
        details: `Loan-to-income ratio: ${ratio.toFixed(1)}x`,
      });
    } else if (ratio > 10) {
      score += 8;
      flags.push({
        signal: 'elevated_loan_to_income',
        severity: 'low',
        details: `Loan-to-income ratio: ${ratio.toFixed(1)}x`,
      });
    }
  }

  // ── 8. Missing critical info ──
  const missingFields = [];
  if (!extractedData?.income?.value) missingFields.push('income');
  if (!extractedData?.loanAmount?.value) missingFields.push('loan amount');
  if (!extractedData?.purpose?.value) missingFields.push('purpose');
  if (missingFields.length >= 2) {
    score += missingFields.length * 5;
    flags.push({
      signal: 'missing_information',
      severity: 'low',
      details: `Key fields not yet provided: ${missingFields.join(', ')}`,
    });
  }

  // ── Compute Final Level ──
  score = Math.min(score, 100); // cap at 100

  let level, category;
  if (score >= 60) {
    level = 'critical';
    category = 'distressed';
  } else if (score >= 40) {
    level = 'high';
    category = 'risky';
  } else if (score >= 20) {
    level = 'medium';
    category = 'moderate';
  } else {
    level = 'low';
    category = 'safe';
  }

  const result = {
    level,
    category,
    score,
    flags,
    breakdown: {
      urgency: urgency.count,
      desperation: desperation.count,
      evasion: evasion.count,
      vagueness: vague.count,
      inconsistency: inconsistency.count,
    },
  };

  log('RISK', 'INFO', `Risk assessment: ${level} (${category}) — score ${score}/100`, {
    flagCount: flags.length,
    breakdown: result.breakdown,
  });

  return result;
}

export default { assessRisk };
