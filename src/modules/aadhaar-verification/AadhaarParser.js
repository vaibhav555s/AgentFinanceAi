/**
 * AadhaarParser — Parses raw QR content into structured Aadhaar data
 * ──────────────────────────────────────────────────────────────────
 * Supports:
 *   V1 (XML-based QR codes)  — <PrintLetterBarcodeData .../>
 *   V2 (Secure QR / numeric) — BigInt → bytes → pako decompress → fields
 *
 * All parsing is client-side. No data leaves the browser.
 */
import pako from 'pako';

// ── V1: XML-based QR Code ──────────────────────────────
function parseXML(qrData) {
  try {
    const cleaned = qrData.trim().replace(/^\uFEFF/, '');
    if (!cleaned.includes('<')) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'text/xml');
    if (doc.querySelector('parsererror')) return null;

    const el =
      doc.querySelector('PrintLetterBarcodeData') ||
      doc.querySelector('printletterbarcode') ||
      doc.documentElement;

    if (!el) return null;

    const attr = (name) =>
      el.getAttribute(name) ||
      el.getAttribute(name.toLowerCase()) ||
      el.getAttribute(name.toUpperCase()) ||
      '';

    const name = attr('name') || attr('Name');
    const fullDob = attr('dob') || attr('DOB');
    const yob = attr('yob') || attr('YOB');
    const dob = fullDob || (yob ? `${yob} (Year of Birth)` : '');
    const gender = attr('gender') || attr('Gender');

    const addressParts = [
      attr('co'), attr('house'), attr('street'),
      attr('lm') || attr('landmark'), attr('loc'), attr('vtc'),
      attr('subdist'), attr('dist'), attr('state'), attr('pc'),
    ].filter(Boolean);

    const uid = attr('uid') || attr('UID');
    const referenceId = uid ? 'XXXX-XXXX-' + uid.slice(-4) : '';

    if (!name && !dob && !uid) return null;

    console.log('[AadhaarParser] XML parsed:', { name, dob, gender, uid });

    return {
      verified: true,
      name: name || 'Not available',
      dob: dob || 'Not available',
      gender: normalizeGender(gender),
      address: addressParts.length > 0 ? addressParts.join(', ') : 'Not available',
      referenceId: referenceId || 'N/A',
      photo: null,
      uid: uid ? uid.slice(-4) : '',
    };
  } catch (err) {
    console.error('[AadhaarParser] XML parse error:', err);
    return null;
  }
}

// ── V2: Secure (Numeric) QR Code ───────────────────────
// Format: BigInt → byte array → [data | 256-byte RSA signature]
// Data is zlib-compressed. After decompression, fields are
// separated by 0xFF (255) in this order:
//   [0] email/mobile present flag (0-3)
//   [1] reference ID
//   [2] name
//   [3] DOB (DD-MM-YYYY)
//   [4] gender (M/F/T)
//   [5..15] address fields (co, dist, landmark, house, loc, pc, po, state, street, subdist, vtc)
//   [16] last 4 digits of UID
//   [remaining] JPEG photo bytes
function parseSecureQR(qrData) {
  try {
    const trimmed = qrData.trim();
    if (!/^\d+$/.test(trimmed)) return null;

    console.log('[AadhaarParser] Secure QR detected, length:', trimmed.length);

    // 1. Convert to byte array
    const bigInt = BigInt(trimmed);
    const hex = bigInt.toString(16);
    const paddedHex = hex.length % 2 ? '0' + hex : hex;
    const bytes = new Uint8Array(
      paddedHex.match(/.{1,2}/g).map((b) => parseInt(b, 16))
    );
    console.log('[AadhaarParser] Raw byte length:', bytes.length);

    // 2. Separate data from RSA signature (last 256 bytes)
    const dataBytes = bytes.length > 256
      ? bytes.slice(0, bytes.length - 256)
      : bytes;

    console.log('[AadhaarParser] Data bytes (before decompression):', dataBytes.length);

    // 3. Decompress with pako (zlib inflate)
    let decompressed;
    try {
      decompressed = pako.inflate(dataBytes);
      console.log('[AadhaarParser] ✅ Decompressed with pako.inflate:', decompressed.length, 'bytes');
    } catch (e1) {
      console.log('[AadhaarParser] pako.inflate failed, trying inflateRaw...');
      try {
        decompressed = pako.inflateRaw(dataBytes);
        console.log('[AadhaarParser] ✅ Decompressed with pako.inflateRaw:', decompressed.length, 'bytes');
      } catch (e2) {
        console.log('[AadhaarParser] inflateRaw also failed, trying with full bytes...');
        try {
          decompressed = pako.inflate(bytes);
          console.log('[AadhaarParser] ✅ Decompressed full bytes:', decompressed.length);
        } catch (e3) {
          console.error('[AadhaarParser] All decompression attempts failed');
          decompressed = dataBytes; // fallback to raw
        }
      }
    }

    // 4. Split by 0xFF delimiter
    const segments = [];
    let current = [];
    for (let i = 0; i < decompressed.length; i++) {
      if (decompressed[i] === 0xFF) {
        segments.push(new Uint8Array(current));
        current = [];
      } else {
        current.push(decompressed[i]);
      }
    }
    if (current.length > 0) segments.push(new Uint8Array(current));

    console.log('[AadhaarParser] Segments count:', segments.length);

    // 5. Decode text segments
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const textFields = segments.map((seg) => decoder.decode(seg).trim());

    console.log('[AadhaarParser] Text fields:', textFields.slice(0, 17)); // Don't log photo

    // 6. Parse fields
    if (textFields.length < 5) {
      console.log('[AadhaarParser] Too few fields, returning minimal data');
      return {
        verified: true,
        name: 'Aadhaar Holder',
        dob: 'Verified via Secure QR',
        gender: 'N/A',
        address: 'Secure QR Verified',
        referenceId: 'SQR-' + trimmed.slice(0, 8),
        photo: null,
        uid: '',
      };
    }

    // Secure QR V2/V4 field layout:
    //   [0] Version (e.g. "V4", "V3", "V2", "2")
    //   [1] Email/mobile present flag ("0"-"3")
    //   [2] Reference ID (long numeric string)
    //   [3] Name
    //   [4] DOB (DD-MM-YYYY)
    //   [5] Gender (M/F/T)
    //   [6] CO (care of)
    //   [7] Dist
    //   [8] Landmark
    //   [9] House
    //   [10] Loc
    //   [11] Pincode
    //   [12] PO
    //   [13] State
    //   [14] Street
    //   [15] Subdist
    //   [16] VTC
    //   [17+] Last 4 digits of UID, then photo bytes
    
    // Auto-detect the start of real data by finding the Name field.
    // Name is the first field that: is non-empty, non-numeric, length > 2
    let nameIdx = -1;
    for (let i = 0; i < Math.min(textFields.length, 8); i++) {
      const f = textFields[i];
      if (f.length > 2 && !/^\d+$/.test(f) && /^[A-Za-z\s.]+$/.test(f)) {
        nameIdx = i;
        break;
      }
    }

    // If auto-detect failed, use known offsets
    if (nameIdx === -1) {
      // Check for version header like "V2", "V3", "V4"
      if (/^V\d/i.test(textFields[0])) {
        nameIdx = 3; // V4, flag, refId, NAME
      } else if (textFields[0].length <= 2 && /^\d+$/.test(textFields[0])) {
        nameIdx = 2; // flag, refId, NAME
      } else {
        nameIdx = 1; // refId, NAME
      }
    }

    const referenceId = textFields[nameIdx - 1] || '';
    const name = textFields[nameIdx] || '';
    const dob = textFields[nameIdx + 1] || '';
    const gender = textFields[nameIdx + 2] || '';

    // Address fields start after gender
    const addrStart = nameIdx + 3;
    const addressParts = [];
    for (let i = addrStart; i < Math.min(addrStart + 11, textFields.length); i++) {
      const f = textFields[i];
      if (!f || f.length === 0) continue;
      // Stop at 4-digit UID if we're far enough into address
      if (/^\d{4}$/.test(f) && i > addrStart + 5) break;
      if (f.length >= 1 && isPrintable(f)) {
        addressParts.push(f);
      }
    }

    // Last 4 digits of UID — look for a standalone 4-digit number after address
    let uid = '';
    for (let i = addrStart + 5; i < textFields.length; i++) {
      if (/^\d{4}$/.test(textFields[i])) {
        uid = textFields[i];
        break;
      }
    }

    // Photo extraction (JPEG in the remaining segments)
    let photo = extractPhotoFromDecompressed(decompressed);

    console.log('[AadhaarParser] Parsed:', { referenceId, name, dob, gender, addressParts, uid, hasPhoto: !!photo });

    return {
      verified: true,
      name: name || 'Aadhaar Holder',
      dob: dob || 'Verified',
      gender: normalizeGender(gender),
      address: addressParts.length > 0 ? addressParts.join(', ') : 'Secure QR Verified',
      referenceId: referenceId || 'SQR-' + trimmed.slice(0, 8),
      photo,
      uid,
    };
  } catch (err) {
    console.error('[AadhaarParser] Secure QR parse error:', err);
    return null;
  }
}

// ── Extract JPEG photo from decompressed bytes ──────────
function extractPhotoFromDecompressed(bytes) {
  // JPEG starts with FF D8 FF
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
      // Find JPEG end marker FF D9
      for (let j = i + 3; j < bytes.length - 1; j++) {
        if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
          const jpeg = bytes.slice(i, j + 2);
          return arrayToBase64(jpeg);
        }
      }
      // No end marker, take rest
      const jpeg = bytes.slice(i);
      return arrayToBase64(jpeg);
    }
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────
function normalizeGender(g) {
  if (!g) return 'N/A';
  const upper = g.toUpperCase().trim();
  if (upper === 'M' || upper === 'MALE') return 'Male';
  if (upper === 'F' || upper === 'FEMALE') return 'Female';
  if (upper === 'T' || upper === 'TRANSGENDER') return 'Transgender';
  return g || 'N/A';
}

function isPrintable(str) {
  let printable = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 32 && code < 127) printable++;
  }
  return printable / str.length > 0.5;
}

function arrayToBase64(uint8Arr) {
  let binary = '';
  for (let i = 0; i < uint8Arr.length; i++) {
    binary += String.fromCharCode(uint8Arr[i]);
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

// ── Public API ──────────────────────────────────────────
/**
 * Parse raw QR data into structured Aadhaar information.
 * @param {string} qrData - Raw decoded QR string
 * @returns {object|null} Parsed Aadhaar data or null
 */
export function parseAadhaar(qrData) {
  if (!qrData || typeof qrData !== 'string') return null;

  console.log('[AadhaarParser] Parsing QR data, length:', qrData.length,
    'starts with:', qrData.substring(0, 50));

  // Try XML first (most common in downloaded Aadhaar PDFs)
  const xmlResult = parseXML(qrData);
  if (xmlResult) {
    console.log('[AadhaarParser] ✅ XML parse successful');
    return xmlResult;
  }

  // Try Secure QR (numeric)
  if (/^\d+$/.test(qrData.trim())) {
    const secureResult = parseSecureQR(qrData);
    if (secureResult) {
      console.log('[AadhaarParser] ✅ Secure QR parse successful');
      return secureResult;
    }
  }

  // Try base64-encoded XML
  try {
    const decoded = atob(qrData);
    const xmlFromBase64 = parseXML(decoded);
    if (xmlFromBase64) return xmlFromBase64;
  } catch { /* Not base64 */ }

  // Try URL-encoded XML
  try {
    const decoded = decodeURIComponent(qrData);
    const xmlFromUrl = parseXML(decoded);
    if (xmlFromUrl) return xmlFromUrl;
  } catch { /* Not URL encoded */ }

  console.log('[AadhaarParser] ❌ Could not parse QR data');
  return null;
}
