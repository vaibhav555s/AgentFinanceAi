/**
 * ─── Extraction Module ──────────────────────────────────
 * Extracts structured financial data from user speech text.
 *
 * Features:
 *  - Regex + keyword matching for amounts (₹, k, lakh, crore)
 *  - Purpose detection via keyword sets
 *  - Name extraction via conversational patterns
 *  - Confidence scores on every field
 *  - mergeExtractedData() — incremental updates without losing history
 */

import { log } from '../utils/logger.js';

/* ─── Amount Parsing ─────────────────────────────────── */

/**
 * Parse an Indian-style amount string into a number.
 * Handles: 30k, 30000, 3 lakh, 3.5 lakh, ₹50,000, 30 thousand, 1 crore, etc.
 *
 * @param {string} raw
 * @returns {number|null}
 */
function parseAmount(raw) {
  if (!raw) return null;

  let s = raw
    .toLowerCase()
    .replace(/[₹,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // "3.5 lakh" / "3 lakhs"
  let m = s.match(/([\d.]+)\s*(lakh|lac|lakhs|lacs)/);
  if (m) return Math.round(parseFloat(m[1]) * 100000);

  // "1 crore" / "1.5 crores"
  m = s.match(/([\d.]+)\s*(crore|crores|cr)/);
  if (m) return Math.round(parseFloat(m[1]) * 10000000);

  // "30k"
  m = s.match(/([\d.]+)\s*k\b/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);

  // "50 thousand"
  m = s.match(/([\d.]+)\s*thousand/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);

  // "30 hundred"
  m = s.match(/([\d.]+)\s*hundred/);
  if (m) return Math.round(parseFloat(m[1]) * 100);

  // Plain number: "50000"
  m = s.match(/^([\d.]+)$/);
  if (m) {
    const n = parseFloat(m[1]);
    if (!isNaN(n) && n > 0) return Math.round(n);
  }

  return null;
}

/* ─── Purpose Keywords ───────────────────────────────── */

const PURPOSE_KEYWORDS = {
  medical: ['medical', 'hospital', 'surgery', 'treatment', 'health', 'doctor', 'medicine', 'illness', 'disease'],
  education: ['education', 'college', 'university', 'school', 'study', 'tuition', 'course', 'degree', 'exam'],
  home: ['home', 'house', 'renovation', 'construction', 'flat', 'apartment', 'property', 'building', 'repair'],
  personal: ['personal', 'wedding', 'marriage', 'travel', 'vacation', 'family', 'emergency', 'expense'],
  business: ['business', 'startup', 'shop', 'company', 'invest', 'investment', 'capital', 'trade', 'inventory'],
  vehicle: ['car', 'bike', 'vehicle', 'scooter', 'auto', 'motorcycle', 'truck'],
  agriculture: ['agriculture', 'farming', 'crop', 'tractor', 'land', 'harvest', 'seeds'],
};

/**
 * Detect loan purpose from text.
 * @param {string} text
 * @returns {{ purpose: string|null, confidence: number }}
 */
function detectPurpose(text) {
  const lower = text.toLowerCase();
  let bestPurpose = null;
  let bestCount = 0;

  for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
    const count = keywords.filter((kw) => lower.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestPurpose = purpose;
    }
  }

  if (!bestPurpose) return { purpose: null, confidence: 0 };

  // Confidence based on keyword hit density
  const confidence = Math.min(0.5 + bestCount * 0.15, 0.95);
  return { purpose: bestPurpose, confidence: Math.round(confidence * 100) / 100 };
}

/* ─── Name Extraction ────────────────────────────────── */

const NAME_PATTERNS = [
  /(?:my name is|i am|i'm|this is|mera naam|naam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
  /(?:call me|you can call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
];

/**
 * Extract name from text.
 * @param {string} text
 * @returns {{ name: string|null, confidence: number }}
 */
function extractName(text) {
  let best = { name: null, confidence: 0 };
  for (const pattern of NAME_PATTERNS) {
    const regex = new RegExp(pattern, 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) {
        const name = m[1].trim();
        const firstWord = name.toLowerCase().split(/\s+/)[0];
        const falseNames = ['here', 'calling', 'interested', 'looking', 'earning', 'working'];
        if (!falseNames.includes(firstWord)) {
          best = { name, confidence: 0.85 };
        }
      }
    }
  }
  return best;
}

/* ─── Employment Detection ───────────────────────────── */

const EMPLOYMENT_KEYWORDS = {
  salaried: ['salaried', 'salary', 'job', 'employed', 'company', 'office', 'mra', 'working at', 'work at', 'work in'],
  self_employed: ['self employed', 'self-employed', 'freelance', 'own business', 'shop owner', 'businessman', 'entrepreneur'],
  government: ['government', 'govt', 'sarkari', 'public sector', 'psu'],
  retired: ['retired', 'pension', 'ex-service'],
  student: ['student', 'studying', 'college'],
  unemployed: ['unemployed', 'jobless', 'no job', 'not working'],
};

/**
 * Detect employment type.
 * @param {string} text
 * @returns {{ employment: string|null, confidence: number }}
 */
function detectEmployment(text) {
  const lower = text.toLowerCase();
  // Find the last mention by checking index of keywords
  let bestType = null;
  let lastIndex = -1;

  for (const [type, keywords] of Object.entries(EMPLOYMENT_KEYWORDS)) {
    for (const kw of keywords) {
      const idx = lower.lastIndexOf(kw);
      if (idx > lastIndex) {
        lastIndex = idx;
        bestType = type;
      }
    }
  }
  if (bestType) return { employment: bestType, confidence: 0.8 };
  return { employment: null, confidence: 0 };
}

/* ─── Income Extraction ──────────────────────────────── */

const INCOME_PATTERNS = [
  // Without leading/trailing /i since we pass 'gi' to RegExp
  /(?:i\s+(?:earn|make|get)|my\s+(?:salary|income|earning)\s+is|(?:salary|income|earning)\s+(?:is|of))\s*(?:(?:about|around|approximately|roughly|only|just)\s+)?(?:(?:rs\.?|₹|inr)\s*)?([0-9][0-9,.]*(?:\s*(?:k|thousand|lakh|lakhs|lac|lacs|crore|crores))?)/,
  /(?:(?:monthly|per month|per annum|annually|yearly)\s+(?:is\s+)?)?(?:(?:rs\.?|₹|inr)\s*)([0-9][0-9,.]*(?:\s*(?:k|thousand|lakh|lakhs|lac|lacs|crore|crores))?)\s*(?:per month|monthly|p\.?m\.?|per annum|annually|p\.?a\.?)?/,
];

/**
 * Extract income from text.
 * @param {string} text
 * @returns {{ income: number|null, confidence: number }}
 */
function extractIncome(text) {
  let best = { income: null, confidence: 0 };
  for (const pattern of INCOME_PATTERNS) {
    const regex = new RegExp(pattern, 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) {
        const amount = parseAmount(m[1]);
        if (amount && amount > 0) {
          best = { income: amount, confidence: 0.8 };
        }
      }
    }
  }
  return best;
}

/* ─── Loan Amount Extraction ─────────────────────────── */

const LOAN_PATTERNS = [
  /(?:need|want|require|looking for|give me|loan of|loan for|borrow|loan amount)\s*(?:a\s+)?(?:loan\s+(?:of|for)\s+)?(?:(?:(?:about|around|approximately|roughly|only|just)\s+)?(?:rs\.?|₹|inr)\s*)?([0-9][0-9,.]*(?:\s*(?:k|thousand|lakh|lakhs|lac|lacs|crore|crores))?)/,
  /(?:(?:rs\.?|₹|inr)\s*)([0-9][0-9,.]*(?:\s*(?:k|thousand|lakh|lakhs|lac|lacs|crore|crores))?)\s*(?:loan|ka loan)/,
];

/**
 * Extract requested loan amount from text.
 * @param {string} text
 * @returns {{ loanAmount: number|null, confidence: number }}
 */
function extractLoanAmount(text) {
  let best = { loanAmount: null, confidence: 0 };
  for (const pattern of LOAN_PATTERNS) {
    const regex = new RegExp(pattern, 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) {
        const amount = parseAmount(m[1]);
        if (amount && amount > 0) {
          best = { loanAmount: amount, confidence: 0.8 };
        }
      }
    }
  }
  return best;
}

/* ─── Main Extraction ────────────────────────────────── */

/**
 * @typedef {Object} ExtractedField
 * @property {*} value - The extracted value
 * @property {number} confidence - Confidence score 0–1
 * @property {string} source - Source utterance snippet
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {{ value: string|null, confidence: number, source: string, updatedAt: string }} name
 * @property {{ value: number|null, confidence: number, source: string, updatedAt: string }} income
 * @property {{ value: number|null, confidence: number, source: string, updatedAt: string }} loanAmount
 * @property {{ value: string|null, confidence: number, source: string, updatedAt: string }} purpose
 * @property {{ value: string|null, confidence: number, source: string, updatedAt: string }} employment
 */

/**
 * Detect what field the AI's last question was asking about.
 * This is used to correctly route ambiguous standalone amounts.
 * @param {string} question
 * @returns {'loanAmount' | 'income' | 'name' | 'employment' | 'purpose' | null}
 */
function detectQuestionContext(question) {
  if (!question) return null;
  const q = question.toLowerCase();
  if (/(loan amount|how much.*loan|loan.*apply|need.*loan|borrow|capital|funding|how much|what amount)/i.test(q)) return 'loanAmount';
  if (/(income|salary|earn|monthly|per month|how much.*mak|what.*earn)/i.test(q)) return 'income';
  if (/(your name|what.*name|call you|introduce)/i.test(q)) return 'name';
  if (/(employ|work|job|occupation|profession|salaried|business)/i.test(q)) return 'employment';
  if (/(purpose|reason|why.*loan|for what|what.*for)/i.test(q)) return 'purpose';
  return null;
}

/**
 * Extract all financial data from text.
 *
 * @param {string} text - User's speech transcription
 * @param {string} [lastAgentQuestion=''] - Last thing the AI said, used as context hint
 * @returns {ExtractionResult}
 */
export function extractFinancialData(text, lastAgentQuestion = '') {
  const now = new Date().toISOString();
  const snippet = text.slice(0, 80);

  const nameResult      = extractName(text);
  const incomeResult    = extractIncome(text);
  const loanResult      = extractLoanAmount(text);
  const purposeResult   = detectPurpose(text);
  const employmentResult = detectEmployment(text);

  // ── Context override ──────────────────────────────────
  // If the AI just asked about a specific field and the user replied with ONLY a standalone
  // amount (no trigger words), re-route that number to the correct field.
  const questionContext = detectQuestionContext(lastAgentQuestion);
  const onlyAmountSpoken = !nameResult.name && !purposeResult.purpose && !employmentResult.employment;

  let finalIncome = incomeResult;
  let finalLoanAmount = loanResult;

  if (onlyAmountSpoken && questionContext === 'loanAmount' && loanResult.loanAmount === null && incomeResult.income !== null) {
    // User gave a number, AI asked about loan amount → move income match to loanAmount
    log('EXTRACTION', 'INFO', `Context override: rerouting ${incomeResult.income} from income → loanAmount (AI asked about loan)`);
    finalLoanAmount = { loanAmount: incomeResult.income, confidence: 0.82 };
    finalIncome = { income: null, confidence: 0 };
  }

  if (onlyAmountSpoken && questionContext === 'income' && incomeResult.income === null && loanResult.loanAmount !== null) {
    // User gave a number, AI asked about income → move loan match to income
    log('EXTRACTION', 'INFO', `Context override: rerouting ${loanResult.loanAmount} from loanAmount → income (AI asked about income)`);
    finalIncome = { income: loanResult.loanAmount, confidence: 0.82 };
    finalLoanAmount = { loanAmount: null, confidence: 0 };
  }

  const result = {
    name:       { value: nameResult.name,             confidence: nameResult.confidence,       source: snippet, updatedAt: now },
    income:     { value: finalIncome.income,           confidence: finalIncome.confidence,      source: snippet, updatedAt: now },
    loanAmount: { value: finalLoanAmount.loanAmount,   confidence: finalLoanAmount.confidence,  source: snippet, updatedAt: now },
    purpose:    { value: purposeResult.purpose,        confidence: purposeResult.confidence,    source: snippet, updatedAt: now },
    employment: { value: employmentResult.employment,  confidence: employmentResult.confidence, source: snippet, updatedAt: now },
  };

  log('EXTRACTION', 'INFO', 'Extracted financial data', {
    name: result.name.value,
    income: result.income.value,
    loanAmount: result.loanAmount.value,
    purpose: result.purpose.value,
    employment: result.employment.value,
    context: questionContext || 'none',
  });

  return result;
}

/**
 * Confidence threshold above which a field is considered "locked".
 * A locked field will NOT be overwritten unless explicitly corrected by the user
 * (detected by strictly higher confidence, e.g. 0.95+).
 */
const LOCK_THRESHOLD = 0.75;

/**
 * Merge new extraction results with previous state.
 * Rules:
 *  - If field is empty: always accept.
 *  - If field confidence < LOCK_THRESHOLD: accept if new confidence >= old confidence.
 *  - If field confidence >= LOCK_THRESHOLD (LOCKED): only accept if new confidence > LOCK_THRESHOLD + 0.15.
 *    This prevents re-running the extraction on the full transcript from endlessly
 *    re-matching noise and overwriting already-confirmed data.
 *
 * @param {ExtractionResult} previous - Existing extracted data
 * @param {ExtractionResult} incoming - Newly extracted data
 * @returns {{ merged: ExtractionResult, changes: string[] }}
 */
export function mergeExtractedData(previous, incoming) {
  const merged = { ...previous };
  const changes = [];

  for (const field of ['name', 'income', 'loanAmount', 'purpose', 'employment', 'age']) {
    const prev = previous[field];
    const next = incoming[field];

    // Skip if extraction found nothing
    if (next.value === null || next.value === undefined) continue;

    // Field is empty — always accept
    if (prev.value === null) {
      merged[field] = { ...next };
      changes.push(`${field}: (new) ${next.value}`);
      continue;
    }

    // Field is LOCKED (high confidence) — only accept if new extraction is significantly more confident
    if (prev.confidence >= LOCK_THRESHOLD) {
      if (next.confidence > LOCK_THRESHOLD + 0.15 && next.value !== prev.value) {
        merged[field] = { ...next };
        changes.push(`${field}: OVERRIDE ${prev.value} → ${next.value} (conf ${next.confidence})`);
      }
      // Otherwise silently ignore — field stays locked
      continue;
    }

    // Field exists but not yet locked — accept if confidence improves
    if (next.confidence >= prev.confidence && next.value !== prev.value) {
      merged[field] = { ...next };
      changes.push(`${field}: ${prev.value} → ${next.value}`);
    }
  }

  if (changes.length > 0) {
    log('EXTRACTION', 'INFO', `Merged data — ${changes.length} change(s)`, changes);
  } else {
    log('EXTRACTION', 'DEBUG', 'Merge complete — no changes (fields locked or unchanged)');
  }

  return { merged, changes };
}

/**
 * Create an empty extraction result.
 * @returns {ExtractionResult}
 */
export function emptyExtraction() {
  const empty = { value: null, confidence: 0, source: '', updatedAt: '' };
  return {
    name: { ...empty },
    income: { ...empty },
    loanAmount: { ...empty },
    purpose: { ...empty },
    employment: { ...empty },
    age: { ...empty },
  };
}

export default { extractFinancialData, mergeExtractedData, emptyExtraction };
