/**
 * QRExtractor — Extracts QR code data from images and PDFs
 * ─────────────────────────────────────────────────────────
 * Detection pipeline (tries in order):
 *   1. ZXing (BrowserMultiFormatReader) — best for complex images with small QR
 *   2. Chrome BarcodeDetector API — native, fast
 *   3. jsQR with grid scanning — last resort fallback
 *
 * pdfjs-dist for PDF rendering (bundled worker).
 */
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, BrowserQRCodeReader } from '@zxing/browser';
import * as pdfjsLib from 'pdfjs-dist';

// PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ZXing reader (singleton)
let zxingReader = null;
function getZxingReader() {
  if (!zxingReader) {
    zxingReader = new BrowserMultiFormatReader();
  }
  return zxingReader;
}

// ── 1. ZXing Detection ──────────────────────────────────
async function detectWithZxing(canvas) {
  try {
    const reader = getZxingReader();
    // Convert canvas to an image element for ZXing
    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    const result = await reader.decodeFromImageElement(img);
    if (result && result.getText()) {
      console.log('[QRExtractor] ✅ ZXing found QR');
      return result.getText();
    }
  } catch (err) {
    // ZXing throws NotFoundException when no QR is found — that's expected
    if (err.name !== 'NotFoundException' && err.message !== 'No MultiFormat Readers were able to detect the code.') {
      console.log('[QRExtractor] ZXing error:', err.message);
    }
  }
  return null;
}

// ── 2. Chrome BarcodeDetector ───────────────────────────
const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
let barcodeDetector = null;

async function detectWithNativeAPI(source) {
  if (!hasBarcodeDetector) return null;
  try {
    if (!barcodeDetector) {
      barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    }
    const barcodes = await barcodeDetector.detect(source);
    if (barcodes.length > 0) {
      console.log('[QRExtractor] ✅ BarcodeDetector found QR');
      return barcodes[0].rawValue;
    }
  } catch (err) {
    console.log('[QRExtractor] BarcodeDetector error:', err.message);
  }
  return null;
}

// ── 3. jsQR decode ──────────────────────────────────────
function decodeQR(imageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return code ? code.data : null;
}

// ── Canvas helpers ──────────────────────────────────────
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx };
}

function enhanceContrast(imageData) {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const enhanced = Math.min(255, Math.max(0, (grey - 128) * 2.0 + 128));
    data[i] = data[i + 1] = data[i + 2] = enhanced;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

function binarize(imageData, threshold = 128) {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = grey > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

// ── jsQR grid scanner (fallback) ────────────────────────
function jsqrGridScan(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const { ctx: mainCtx } = createCanvas(w, h);
  mainCtx.drawImage(sourceCanvas, 0, 0);

  // Full image
  let result = decodeQR(mainCtx.getImageData(0, 0, w, h));
  if (result) return result;
  result = decodeQR(enhanceContrast(mainCtx.getImageData(0, 0, w, h)));
  if (result) return result;

  // Grid scan 4x4 with overlap
  const gridSize = 4;
  const stepX = w / gridSize;
  const stepY = h / gridSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = Math.max(0, Math.round(col * stepX - stepX * 0.25));
      const y = Math.max(0, Math.round(row * stepY - stepY * 0.25));
      const tw = Math.min(Math.round(stepX * 1.5), w - x);
      const th = Math.min(Math.round(stepY * 1.5), h - y);
      if (tw < 50 || th < 50) continue;

      const tileCanvas = document.createElement('canvas');
      const targetSize = 600;
      tileCanvas.width = targetSize;
      tileCanvas.height = targetSize;
      const tctx = tileCanvas.getContext('2d', { willReadFrequently: true });
      tctx.drawImage(sourceCanvas, x, y, tw, th, 0, 0, targetSize, targetSize);

      const imgData = tctx.getImageData(0, 0, targetSize, targetSize);
      result = decodeQR(imgData);
      if (result) return result;
      result = decodeQR(enhanceContrast(imgData));
      if (result) return result;
      result = decodeQR(binarize(imgData));
      if (result) return result;
    }
  }

  return null;
}

// ── ZXing region scanner ────────────────────────────────
// If ZXing fails on full image, try cropped regions at higher scale
async function zxingRegionScan(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // Common QR locations on Aadhaar cards
  const regions = [
    // Right side (most common for Aadhaar front)
    { x: w * 0.45, y: h * 0.2, w: w * 0.55, h: h * 0.45, name: 'right-upper' },
    { x: w * 0.45, y: h * 0.35, w: w * 0.55, h: h * 0.45, name: 'right-center' },
    { x: w * 0.4, y: h * 0.5, w: w * 0.6, h: h * 0.5, name: 'right-lower' },
    // Left side
    { x: 0, y: h * 0.2, w: w * 0.55, h: h * 0.45, name: 'left-upper' },
    { x: 0, y: h * 0.5, w: w * 0.6, h: h * 0.5, name: 'left-lower' },
    // Halves
    { x: 0, y: 0, w, h: h * 0.55, name: 'top-half' },
    { x: 0, y: h * 0.45, w, h: h * 0.55, name: 'bottom-half' },
    // Center
    { x: w * 0.15, y: h * 0.15, w: w * 0.7, h: h * 0.7, name: 'center' },
  ];

  for (const r of regions) {
    const rx = Math.round(r.x);
    const ry = Math.round(r.y);
    const rw = Math.round(Math.min(r.w, w - rx));
    const rh = Math.round(Math.min(r.h, h - ry));
    if (rw < 80 || rh < 80) continue;

    // Scale up the crop for better detection
    const scale = Math.max(2, 800 / Math.min(rw, rh));
    const sw = Math.round(rw * scale);
    const sh = Math.round(rh * scale);
    if (sw > 6000 || sh > 6000) continue;

    const { canvas: rc, ctx: rctx } = createCanvas(sw, sh);
    rctx.drawImage(sourceCanvas, rx, ry, rw, rh, 0, 0, sw, sh);

    console.log(`[QRExtractor] ZXing region: ${r.name} (${sw}x${sh})`);
    const result = await detectWithZxing(rc);
    if (result) {
      console.log(`[QRExtractor] ✅ ZXing found in region: ${r.name}`);
      return result;
    }
  }

  return null;
}

// ── Main scanner ────────────────────────────────────────
async function scanImageData(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  console.log(`[QRExtractor] Scanning image ${w}x${h}`);

  // 1. ZXing on full image
  console.log('[QRExtractor] [1/4] ZXing full image...');
  let result = await detectWithZxing(sourceCanvas);
  if (result) return result;

  // 2. ZXing on regions (handles small QR in large images)
  console.log('[QRExtractor] [2/4] ZXing region scan...');
  result = await zxingRegionScan(sourceCanvas);
  if (result) return result;

  // 3. BarcodeDetector
  if (hasBarcodeDetector) {
    console.log('[QRExtractor] [3/4] BarcodeDetector...');
    result = await detectWithNativeAPI(sourceCanvas);
    if (result) return result;
  }

  // 4. jsQR grid scan (last resort)
  console.log('[QRExtractor] [4/4] jsQR grid scan...');
  result = jsqrGridScan(sourceCanvas);
  if (result) return result;

  console.log('[QRExtractor] ❌ No QR code found');
  return null;
}

// ── Image file → canvas ─────────────────────────────────
function loadImageAsCanvas(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── PDF → QR ────────────────────────────────────────────
async function extractQRFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    console.error('[QRExtractor] PDF load error:', err);
    return null;
  }

  const pagesToScan = Math.min(pdf.numPages, 3);
  for (let i = 1; i <= pagesToScan; i++) {
    const page = await pdf.getPage(i);
    for (const scale of [3.0, 2.0]) {
      const viewport = page.getViewport({ scale });
      const { canvas, ctx } = createCanvas(viewport.width, viewport.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      console.log(`[QRExtractor] PDF page ${i}, scale ${scale}x (${canvas.width}x${canvas.height})`);
      const qrData = await scanImageData(canvas);
      if (qrData) return qrData;
    }
  }
  return null;
}

// ── Public API ──────────────────────────────────────────
export async function extractQR(file) {
  if (!file) return null;
  const isPdf = file.type === 'application/pdf';

  try {
    if (isPdf) {
      return await extractQRFromPDF(file);
    } else {
      const canvas = await loadImageAsCanvas(file);
      return await scanImageData(canvas);
    }
  } catch (err) {
    console.error('[QRExtractor] Error:', err);
    return null;
  }
}
