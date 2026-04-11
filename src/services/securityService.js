/**
 * ─── Security Service (Tier 1) ───────────────────────────
 * Captures session-start metadata: IP, Geo, Fingerprint.
 */

import { log } from '../modules/utils/logger.js';

/**
 * Capture all security metadata required for the KYC audit trail.
 */
export async function captureSecurityMetadata() {
    log('SECURITY', 'INFO', 'Capturing session metadata...');

    const metadata = {
        ip_address: null,
        latitude: null,
        longitude: null,
        device_fingerprint: null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
    };

    try {
        // 1. IP Address (via ipify)
        const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
        if (ipRes) {
            const ipData = await ipRes.json();
            metadata.ip_address = ipData.ip;
        }

        // 2. Geolocation (with permission)
        if ("geolocation" in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                        enableHighAccuracy: false
                    });
                });
                metadata.latitude = position.coords.latitude;
                metadata.longitude = position.coords.longitude;
            } catch (geoErr) {
                log('SECURITY', 'WARN', 'Geolocation permission denied or timeout');
            }
        }

        // 3. Device Fingerprint (Basic Hash)
        metadata.device_fingerprint = _generateFingerprint();

        log('SECURITY', 'INFO', 'Metadata captured successfully', {
            ip: metadata.ip_address,
            geo: metadata.latitude ? 'Available' : 'Unavailable'
        });

        return metadata;
    } catch (err) {
        log('SECURITY', 'ERROR', 'Metadata capture failed', err);
        return metadata; // Return partial
    }
}

/**
 * Creates a unique-ish hash of browser/hardware features.
 */
function _generateFingerprint() {
    const parts = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.language,
        (navigator.hardwareConcurrency || 'unknown'),
        (navigator.deviceMemory || 'unknown')
    ];

    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

export default { captureSecurityMetadata };
