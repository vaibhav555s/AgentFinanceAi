/**
 * Rule: EMI-to-Income Ratio
 * Ensures the proposed EMI does not exceed max allowed ratio of monthly income.
 */
export function emiRule(income, emi, config) {
  // Guard against zero/missing income
  if (!income || income <= 0) {
    return {
      rule: "emi_income_ratio",
      result: "refer",
      ratio: null,
      threshold: config.maxEmiRatio,
      explanation: "Income data unavailable — cannot evaluate EMI burden. Referred for manual review.",
    };
  }

  const ratio = Math.round((emi / income) * 100) / 100;
  const pass = ratio <= config.maxEmiRatio;

  return {
    rule: "emi_income_ratio",
    result: pass ? "pass" : "fail",
    ratio,
    threshold: config.maxEmiRatio,
    actual: { income, emi },
    explanation: pass
      ? `EMI-to-income ratio ${(ratio * 100).toFixed(0)}% is within the ${(config.maxEmiRatio * 100).toFixed(0)}% limit`
      : `EMI-to-income ratio ${(ratio * 100).toFixed(0)}% exceeds the ${(config.maxEmiRatio * 100).toFixed(0)}% maximum — high repayment burden`,
  };
}
