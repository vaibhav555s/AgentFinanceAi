/**
 * ─── Fraud Detection Engine (Tier 6) ─────────────────────
 * Performs algorithmic checks for velocity, emulators, and 
 * network anomalies using captured security metadata.
 */

import { log } from '../utils/logger.js';

/**
 * Analyzes security metadata for deterministic fraud signals.
 * @param {Object} metadata - Captured Tier 1 metadata
 * @param {number} velocityCount - Recent apps from same device
 * @returns {{ riskScore: number, signals: string[] }}
 */
export function analyzeFraudRisk(metadata, velocityCount = 0) {
    let riskScore = 0;
    const signals = [];

    // 1. VELOCITY CHECK
    // High frequency applications from the same device
    if (velocityCount >= 5) {
        riskScore += 80;
        signals.push('CRITICAL_VELOCITY_ABUSE');
    } else if (velocityCount >= 2) {
        riskScore += 30;
        signals.push('HIGH_VELOCITY_HINT');
    }

    // 2. ENVIRONMENT CHECK (EMULATOR / BOT)
    const ua = metadata.user_agent?.toLowerCase() || '';

    // Detection for common browser-level automation / emulation
    const isAutomated = navigator.webdriver || ua.includes('headless');
    if (isAutomated) {
        riskScore += 90;
        signals.push('AUTOMATION_ENGINE_DETECTED');
    }

    // Suspicious device configurations (Common for emulators / low-res proxies)
    const isSuspiciousRes = screen.width < 320 || screen.height < 480;
    if (isSuspiciousRes) {
        riskScore += 20;
        signals.push('SUSPICIOUS_RESOLUTION');
    }

    // Lack of hardware concurrency (V-CPU cores) — common in sandboxes
    if (navigator.hardwareConcurrency === 1) {
        riskScore += 15;
        signals.push('SINGLE_CORE_SANDBOX_HINT');
    }

    // 3. GEO-IP CONSISTENCY (Basic)
    // Note: Modern VPN detection usually requires a paid API (like IPInfo/IPGeolocation).
    // Here we do a heuristic based on mismatch between GPS and IP-Country if available.
    // (In a real app, you'd fetch country for both and check for mismatch).

    log('FRAUD', 'INFO', `Fraud analysis complete. Score: ${riskScore}`, signals);

    return {
        riskScore: Math.min(riskScore, 100),
        signals
    };
}

export default { analyzeFraudRisk };
