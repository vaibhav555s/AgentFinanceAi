/**
 * ─── Audio Converter ────────────────────────────────────
 * Converts audio blobs (webm/ogg from MediaRecorder) to
 * WAV format using the Web Audio API.
 *
 * Sarvam STT requires proper audio files — browser-recorded
 * webm/opus chunks are often rejected. This converts them
 * to 16kHz mono WAV which is universally supported.
 */

import { log } from '../utils/logger.js';

/**
 * Convert an audio Blob (webm/ogg) to WAV format using Web Audio API.
 *
 * @param {Blob} blob - The raw audio blob from MediaRecorder
 * @param {number} [targetSampleRate=16000] - Target sample rate for STT
 * @returns {Promise<Blob>} A WAV-format Blob
 */
export async function convertToWav(blob, targetSampleRate = 16000) {
  const startTime = performance.now();

  try {
    // 1. Decode the audio blob into raw PCM samples
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: targetSampleRate,
    });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 2. Get mono channel data (mix down if stereo)
    const numberOfChannels = 1; // mono for STT
    let channelData;
    if (audioBuffer.numberOfChannels === 1) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Mix stereo to mono
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        channelData[i] = (left[i] + right[i]) / 2;
      }
    }

    // 3. Resample if the decoded rate differs from target
    let finalData = channelData;
    if (audioBuffer.sampleRate !== targetSampleRate) {
      finalData = resample(channelData, audioBuffer.sampleRate, targetSampleRate);
    }

    // 4. Encode as WAV
    const wavBuffer = encodeWav(finalData, targetSampleRate, numberOfChannels);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    const elapsed = (performance.now() - startTime).toFixed(1);
    log('AUDIO', 'INFO', `🔄 Converted to WAV — ${(wavBlob.size / 1024).toFixed(1)} KB in ${elapsed}ms`);

    // Cleanup
    await audioContext.close();

    return wavBlob;
  } catch (err) {
    log('AUDIO', 'ERROR', `WAV conversion failed: ${err.message}`);
    // Return original blob as fallback
    return blob;
  }
}

/**
 * Simple linear interpolation resampler.
 */
function resample(data, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const newLength = Math.round(data.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const lower = Math.floor(srcIdx);
    const upper = Math.min(lower + 1, data.length - 1);
    const frac = srcIdx - lower;
    result[i] = data[lower] * (1 - frac) + data[upper] * frac;
  }

  return result;
}

/**
 * Encode Float32 PCM data into a WAV file buffer.
 * Standard RIFF/WAV with 16-bit PCM.
 */
function encodeWav(samples, sampleRate, numChannels) {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize; // 44 bytes header

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (float32 → int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export default { convertToWav };
