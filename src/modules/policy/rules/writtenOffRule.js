/**
 * Rule: Written-Off Accounts
 * Fails if the user has any previously written-off loans.
 */
export function writtenOffRule(bureau, config) {
  const actual = bureau.writtenOffAccounts;
  const threshold = config.maxWrittenOff;
  const pass = actual <= threshold;

  return {
    rule: "written_off_accounts",
    result: pass ? "pass" : "fail",
    threshold,
    actual,
    explanation: pass
      ? "No written-off accounts found in credit history"
      : `User has ${actual} written-off account(s) — indicates prior default`,
  };
}
