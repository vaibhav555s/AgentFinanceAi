/**
 * ─── Bureau Client ──────────────────────────────────────
 * Fetches credit data from the mock bureau HTTP API.
 */

const BUREAU_URL = "http://localhost:5001/api/bureau";

/**
 * Fetch credit bureau data for a user.
 * @param {{ name?: string, aadhaarRef?: string }} userData
 * @returns {Promise<{
 *   creditScore: number,
 *   activeLoans: number,
 *   dpdHistory: Array<{ month: string, days: number }>,
 *   writtenOffAccounts: number,
 *   creditUtilization: number,
 *   enquiriesLast6Months: number,
 *   oldestAccountAge: number,
 *   timestamp: string,
 *   requestRef: string
 * }>}
 */
export async function fetchBureau(userData = {}) {
  try {
    const res = await fetch(BUREAU_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!res.ok) {
      throw new Error(`Bureau API returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("[BureauClient] Failed to fetch bureau data:", err.message);
    // Return a fallback that will trigger a "refer" decision
    return {
      creditScore: 0,
      activeLoans: 0,
      dpdHistory: [],
      writtenOffAccounts: 0,
      creditUtilization: 0,
      enquiriesLast6Months: 0,
      oldestAccountAge: 0,
      timestamp: new Date().toISOString(),
      requestRef: "FETCH_FAILED",
      error: err.message,
    };
  }
}
