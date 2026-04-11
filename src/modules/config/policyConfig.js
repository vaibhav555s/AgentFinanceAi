/**
 * ─── Policy Configuration ───────────────────────────────
 * All configurable thresholds for the eligibility engine.
 * A compliance officer can modify these without touching code logic.
 */

export const policyConfig = {
  // Minimum CIBIL/credit score to pass
  minCreditScore: 650,

  // Maximum EMI-to-income ratio (50% = half of income goes to EMI)
  maxEmiRatio: 0.5,

  // Maximum allowed written-off accounts
  maxWrittenOff: 0,

  // Maximum DPD (Days Past Due) in any single month in the last 12 months
  maxDPDDays: 30,

  // Maximum number of credit enquiries in last 6 months
  maxEnquiries: 8,
};
