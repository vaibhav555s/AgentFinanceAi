/**
 * Rule: Blacklist Check
 * Checks if the user's PAN, phone, or Aadhaar reference is in the blacklist.
 */
import blacklist from "../../config/blacklist.json";

export function blacklistRule(user) {
  const checks = [];

  if (user.pan && blacklist.pan.includes(user.pan)) {
    checks.push(`PAN ${user.pan} is blacklisted`);
  }
  if (user.phone && blacklist.phone.includes(user.phone)) {
    checks.push(`Phone ${user.phone} is blacklisted`);
  }
  if (user.aadhaarRef && blacklist.aadhaarRef.includes(user.aadhaarRef)) {
    checks.push(`Aadhaar ref ${user.aadhaarRef} is blacklisted`);
  }

  const blocked = checks.length > 0;

  return {
    rule: "blacklist_check",
    result: blocked ? "fail" : "pass",
    matchedEntries: checks,
    explanation: blocked
      ? `User blocked: ${checks.join("; ")}`
      : "User not found in any blacklist (PAN, Phone, Aadhaar)",
  };
}
