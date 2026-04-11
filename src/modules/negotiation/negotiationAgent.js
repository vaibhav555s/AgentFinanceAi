/**
 * ─── Negotiation Agent (Tier 8) ─────────────────────────
 *
 * Policy Engine  : Calculates max eligible loan amount using FOIR,
 *                  credit score, and fraud risk score.
 * Negotiation LLM: Groq-powered agent that handles objections,
 *                  counter-offers within policy limits, and detects
 *                  verbal acceptance — all over voice.
 *
 * Flow:
 *   Bureau data → calculatePolicyOffer() → initial offer
 *   User speaks → processNegotiation() → COUNTER / ACCEPT / DECLINE
 *   ACCEPT → triggerConsent() in orchestrator
 */

import { log } from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

/* ─── EMI Helper ─────────────────────────────────────── */
export function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}

/* ─── Interest Rate by Credit Score ─────────────────── */
function getInterestRate(creditScore) {
  if (creditScore >= 800) return 9.0;
  if (creditScore >= 750) return 9.5;
  if (creditScore >= 700) return 10.5;
  if (creditScore >= 650) return 12.5;
  return 15.0;
}

/* ─── Policy Engine ──────────────────────────────────── */
/**
 * Calculate the personalised loan offer based on bureau + risk data.
 * Uses FOIR (Fixed Obligation to Income Ratio) to cap the EMI at 45% of income.
 *
 * @param {{ income: number, creditScore: number, fraudScore?: number, requestedAmount?: number }} params
 * @returns {{ maxAmount, minAmount, initialAmount, interestRate, maxEMI, policyNote }}
 */
export function calculatePolicyOffer({ income, creditScore, fraudScore = 0, requestedAmount = null }) {
  const FOIR = 0.45; // 45% of monthly income can go to EMI (RBI guideline)
  const interestRate = getInterestRate(creditScore);
  const maxMonthlyEMI = income * FOIR;

  // Back-calculate max loan principal for 36 month standard tenure
  const r = interestRate / 12 / 100;
  const n = 36;
  const rawMaxLoan = maxMonthlyEMI * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));

  // Fraud risk penalty
  const fraudMultiplier = fraudScore > 70 ? 0.5 : fraudScore > 40 ? 0.75 : 1.0;

  // Round down to nearest ₹10,000 and cap at ₹5L
  const maxAmount = Math.min(
    Math.floor((rawMaxLoan * fraudMultiplier) / 10000) * 10000,
    500000
  );

  // Initial offer: start at 80% of max, or user-requested if within limits
  const requestedCapped = requestedAmount ? Math.min(requestedAmount, maxAmount) : null;
  const initialAmount = requestedCapped
    ? requestedCapped
    : Math.floor((maxAmount * 0.8) / 10000) * 10000;

  const policyNote = fraudMultiplier < 1
    ? `Adjusted for elevated risk profile (fraud score: ${fraudScore})`
    : `FOIR cap at 45% of stated income ₹${income.toLocaleString('en-IN')}/mo`;

  log('NEGOTIATION', 'INFO', '📋 Policy offer calculated', {
    income, creditScore, fraudScore,
    maxAmount, initialAmount, interestRate,
  });

  return {
    maxAmount,
    minAmount: 50000,
    initialAmount,
    interestRate,
    maxEMI: Math.round(maxMonthlyEMI),
    policyNote,
  };
}

/* ─── Parse AI Action Tag ────────────────────────────── */
/**
 * Extract the structured action from the LLM response.
 * The LLM appends a machine-readable tag like: [ACTION:COUNTER,AMOUNT:320000,TENURE:36]
 */
function parseAction(rawText) {
  const match = rawText.match(/\[ACTION:(\w+)(?:,AMOUNT:(\d+))?(?:,TENURE:(\d+))?\]/);
  if (match) {
    return {
      action: match[1],                            // COUNTER | ACCEPT | DECLINE
      amount: match[2] ? parseInt(match[2]) : null,
      tenure: match[3] ? parseInt(match[3]) : null,
    };
  }
  // Soft fallback: detect acceptance phrases
  const lower = rawText.toLowerCase();
  const acceptSignals = ['confirmed', 'accepted', 'locked in', 'proceeding', 'finalising', 'finalizing'];
  if (acceptSignals.some(s => lower.includes(s))) {
    return { action: 'ACCEPT', amount: null, tenure: null };
  }
  return { action: 'COUNTER', amount: null, tenure: null };
}

/* ─── Main Negotiation LLM Call ──────────────────────── */
/**
 * Process one turn of negotiation via Groq LLM.
 *
 * @param {{
 *   userText: string,
 *   currentOffer: { amount: number, tenure: number, interestRate: number },
 *   policyLimits: { maxAmount: number, minAmount: number, interestRate: number },
 *   negotiationLog: Array,
 * }} params
 * @returns {Promise<{ message: string, action: 'COUNTER'|'ACCEPT'|'DECLINE', newAmount: number|null, newTenure: number|null }>}
 */
export async function processNegotiation({ userText, currentOffer, policyLimits, negotiationLog }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    log('NEGOTIATION', 'ERROR', 'GROQ_API_KEY missing');
    return null;
  }

  const currentEMI = calcEMI(currentOffer.amount, currentOffer.interestRate, currentOffer.tenure);
  const maxEMI = calcEMI(policyLimits.maxAmount, currentOffer.interestRate, currentOffer.tenure);
  const roundNum = negotiationLog.filter(r => r.type === 'USER').length + 1;

  const historyText = negotiationLog.length > 0
    ? negotiationLog.map(r => `  [${r.type}] Round ${r.round}: ${r.message}`).join('\n')
    : '  (none — this is the first response)';

  const systemPrompt = `You are a voice-based AI Loan Negotiation Officer at AgentFinance India. You are in a LIVE VIDEO CALL.

━━━ POLICY LIMITS (HARD — NEVER VIOLATE) ━━━
• Maximum eligible amount: ₹${policyLimits.maxAmount.toLocaleString('en-IN')} (FOIR-based cap)
• Minimum amount: ₹${policyLimits.minAmount.toLocaleString('en-IN')}
• Interest rate: ${policyLimits.interestRate}% p.a. (fixed by credit profile, NOT negotiable)
• Valid tenures: 12, 24, 36, 48, 60, 72, 84 months

━━━ CURRENT OFFER ON TABLE ━━━
• Amount  : ₹${currentOffer.amount.toLocaleString('en-IN')}
• Tenure  : ${currentOffer.tenure} months
• Rate    : ${currentOffer.interestRate}% p.a.
• EMI     : ₹${currentEMI.toLocaleString('en-IN')} / month

━━━ NEGOTIATION HISTORY ━━━
${historyText}

━━━ CUSTOMER JUST SAID ━━━
"${userText}"

━━━ YOUR TASK ━━━
This is Round ${roundNum}. Respond naturally as if speaking on a call.
Rules:
1. If customer requests ABOVE ₹${policyLimits.maxAmount.toLocaleString('en-IN')}: firmly but politely explain the policy cap and counter at ₹${policyLimits.maxAmount.toLocaleString('en-IN')}.
2. If customer requests amount WITHIN limits: accept their number.
3. If customer wants different tenure (and it's 12/24/36/48/60/72/84): recalculate EMI and confirm.
4. If customer says "yes", "okay", "fine", "accepted", "deal", "haan", "theek hai", "I agree", "go ahead", "proceed": ACCEPT.
5. If customer declines or is unsure: empathetically ask what they'd prefer.
6. Interest rate is NEVER negotiable — if asked, explain it's locked to credit profile.
7. Keep response under 25 words. Speak naturally. No markdown.

REQUIRED: End your response with EXACTLY ONE action tag (no spaces inside):
[ACTION:COUNTER,AMOUNT:250000,TENURE:36]   ← to counter with new terms
[ACTION:ACCEPT]                             ← customer accepted current offer
[ACTION:DECLINE]                            ← customer declined / dropped`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }],
        temperature: 0.35,
        max_tokens: 120,
      }),
    });

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // Strip the action tag from the spoken response
    const spokenMessage = rawText.replace(/\[ACTION:[^\]]+\]/g, '').trim();
    const parsed = parseAction(rawText);

    log('NEGOTIATION', 'INFO', `Round ${roundNum} complete`, {
      userText: userText.slice(0, 60),
      action: parsed.action,
      newAmount: parsed.amount,
      newTenure: parsed.tenure,
      response: spokenMessage.slice(0, 80),
    });

    return {
      message: spokenMessage,
      action: parsed.action,   // 'COUNTER' | 'ACCEPT' | 'DECLINE'
      newAmount: parsed.amount,
      newTenure: parsed.tenure,
      round: roundNum,
    };

  } catch (err) {
    log('NEGOTIATION', 'ERROR', 'Groq negotiation call failed', err.message);
    return null;
  }
}

/* ─── Opening Offer Script ───────────────────────────── */
/**
 * Generate the AI's opening verbal presentation of the offer.
 * Called once when OFFER phase starts.
 */
export function buildOpeningOfferScript(offer, policyLimits) {
  const emi = calcEMI(offer.amount, offer.interestRate, offer.tenure);
  return `Based on your profile and credit score, I am pleased to offer you ₹${(offer.amount / 100000).toFixed(1)} lakh at ${offer.interestRate}% per annum for ${offer.tenure} months. Your monthly EMI would be ₹${emi.toLocaleString('en-IN')}. Would you like to accept these terms, or would you prefer to discuss the amount or tenure?`;
}
