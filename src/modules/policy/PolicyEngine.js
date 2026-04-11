/**
 * ─── Policy Engine ──────────────────────────────────────
 * Evaluates all eligibility rules against bureau data and user profile.
 * Returns a machine-readable decision with per-rule audit trail.
 *
 * Decision logic:
 *   - Any rule "fail" → overall FAIL
 *   - Any rule "refer" (and no fails) → overall REFER
 *   - All rules "pass" → overall PASS
 */

import { creditScoreRule } from "./rules/creditScoreRule.js";
import { emiRule } from "./rules/emiRule.js";
import { writtenOffRule } from "./rules/writtenOffRule.js";
import { blacklistRule } from "./rules/blacklistRule.js";
import { policyConfig } from "../config/policyConfig.js";
import { log } from "../utils/logger.js";

/**
 * Run all policy rules and produce a decision.
 *
 * @param {{
 *   bureau: Object,     - Credit bureau response
 *   income: number,     - Monthly income (from extraction)
 *   emi: number,        - Proposed monthly EMI
 *   user: Object        - User identifiers (pan, phone, aadhaarRef)
 * }} data
 *
 * @returns {{
 *   decision: 'PASS' | 'FAIL' | 'REFER',
 *   rules: Array<{
 *     rule: string,
 *     result: 'pass' | 'fail' | 'refer',
 *     threshold?: number,
 *     actual?: any,
 *     explanation: string
 *   }>,
 *   timestamp: string,
 *   config: Object
 * }}
 */
export function runPolicy(data) {
  const { bureau, income, emi, user } = data;

  // Execute all rules
  const rules = [
    creditScoreRule(bureau, policyConfig),
    emiRule(income, emi, policyConfig),
    writtenOffRule(bureau, policyConfig),
    blacklistRule(user || {}),
  ];

  // Derive overall decision
  const decision = deriveDecision(rules);

  const result = {
    decision,
    rules,
    timestamp: new Date().toISOString(),
    config: { ...policyConfig },
  };

  log("POLICY", "INFO", `Policy decision: ${decision}`, {
    ruleCount: rules.length,
    passed: rules.filter(r => r.result === "pass").length,
    failed: rules.filter(r => r.result === "fail").length,
    referred: rules.filter(r => r.result === "refer").length,
  });

  // Log each rule for audit
  rules.forEach(r => {
    const icon = r.result === "pass" ? "✅" : r.result === "fail" ? "❌" : "⚠️";
    log("POLICY", "INFO", `  ${icon} [${r.rule}] ${r.result.toUpperCase()}: ${r.explanation}`);
  });

  return result;
}

/**
 * Derive overall decision from individual rule results.
 * @param {Array<{ result: string }>} rules
 * @returns {'PASS' | 'FAIL' | 'REFER'}
 */
function deriveDecision(rules) {
  const hasFail = rules.some(r => r.result === "fail");
  const hasRefer = rules.some(r => r.result === "refer");

  if (hasFail) return "FAIL";
  if (hasRefer) return "REFER";
  return "PASS";
}
