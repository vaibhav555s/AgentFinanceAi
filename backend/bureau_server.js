import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* ─── Random data generators ─────────────────────────── */

function randomScore() {
  // Weighted: 70% chance of 600-850 (good), 30% chance of 300-600 (bad)
  if (Math.random() < 0.7) {
    return Math.floor(600 + Math.random() * 250);
  }
  return Math.floor(300 + Math.random() * 300);
}

function randomLoans() {
  return Math.floor(Math.random() * 5);
}

function generateDPD() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Last 12 months DPD history
  return months.map(month => ({
    month,
    days: Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 90),
  }));
}

function randomWrittenOff() {
  // 85% chance of 0 written-off
  return Math.random() < 0.85 ? 0 : Math.floor(1 + Math.random() * 2);
}

/* ─── Bureau API ─────────────────────────────────────── */

app.post("/api/bureau", (req, res) => {
  const { name, aadhaarRef } = req.body || {};

  console.log(`[BUREAU] Credit check requested for: ${name || "Unknown"} (ref: ${aadhaarRef || "N/A"})`);

  // Simulate API latency (200-800ms)
  const latency = 200 + Math.floor(Math.random() * 600);

  setTimeout(() => {
    // HARDCODED SUCCESS FOR TESTING
    const data = {
      creditScore: 820 + Math.floor(Math.random() * 30), // Always high (820-850)
      activeLoans: 0,
      dpdHistory: [
        { month: "Jan", days: 0 }, { month: "Feb", days: 0 }, { month: "Mar", days: 0 },
        { month: "Apr", days: 0 }, { month: "May", days: 0 }, { month: "Jun", days: 0 },
        { month: "Jul", days: 0 }, { month: "Aug", days: 0 }, { month: "Sep", days: 0 },
        { month: "Oct", days: 0 }, { month: "Nov", days: 0 }, { month: "Dec", days: 0 }
      ],
      writtenOffAccounts: 0,
      creditUtilization: 5,
      enquiriesLast6Months: 0,
      oldestAccountAge: 10,
      timestamp: new Date().toISOString(),
      requestRef: aadhaarRef || "N/A",
    };

    /* Original Random Logic (Commented for testing)
    const data = {
      creditScore: randomScore(),
      activeLoans: randomLoans(),
      dpdHistory: generateDPD(),
      writtenOffAccounts: randomWrittenOff(),
      creditUtilization: Math.floor(Math.random() * 80),
      enquiriesLast6Months: Math.floor(Math.random() * 5),
      oldestAccountAge: Math.floor(1 + Math.random() * 15), // years
      timestamp: new Date().toISOString(),
      requestRef: aadhaarRef || "N/A",
    };
    */

    console.log(`[BUREAU] → SUCCESS (Score: ${data.creditScore}, Active: ${data.activeLoans}, Written-off: ${data.writtenOffAccounts})`);
    res.json(data);
  }, latency);
});

/* ─── Health ─────────────────────────────────────────── */

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "mock-credit-bureau", version: "1.0.0" });
});

/* ─── Start ──────────────────────────────────────────── */

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`\n🏦 Mock Credit Bureau API running on http://localhost:${PORT}`);
  console.log(`   POST /api/bureau  → Returns credit data`);
  console.log(`   GET  /health      → Health check\n`);
});
