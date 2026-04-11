/**
 * Rule: Minimum Credit Score
 * Checks if bureau credit score meets the minimum threshold.
 */
export function creditScoreRule(bureau, config) {
  const actual = bureau.creditScore;
  const threshold = config.minCreditScore;
  const pass = actual >= threshold;

  return {
    rule: "min_credit_score",
    result: pass ? "pass" : "fail",
    threshold,
    actual,
    explanation: pass
      ? `Credit score ${actual} meets minimum threshold of ${threshold}`
      : `Credit score ${actual} is below minimum threshold of ${threshold}`,
  };
}
