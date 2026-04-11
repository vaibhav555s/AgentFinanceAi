/**
 * ─── useAudioCapture Hook ───────────────────────────────
 * Manages MediaRecorder lifecycle for live audio chunking.
 *
 * Strategy: Stop-Restart Cycle
 *   Instead of recorder.start(timeslice) — which produces headerless
 *   continuation fragments after the first chunk — we stop the recorder
 *   every N seconds and create a new one on the same stream.
 *   This ensures every chunk is a complete, self-contained webm file
 *   that can be decoded by the Web Audio API for WAV conversion.
 *
 * Features:
 *  - Starts/stops recorder when isMicOn toggles
 *  - 2-second chunk interval via stop-restart cycle
 *  - Processing lock to prevent backlog
 *  - Microphone permission handling
 *  - Proper cleanup (no memory leaks, no duplicate recorders)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { processAudio } from '../modules/interaction/liveInteraction.js';
import { log } from '../modules/utils/logger.js';

/**
 * @param {boolean} isMicOn - Whether the mic toggle is active
 * @param {Object} [options]
 * @param {number} [options.chunkIntervalMs=2000] - Audio chunk duration in ms
 * @returns {{
 *   isListening: boolean,
 *   micError: string|null,
 *   isProcessing: boolean,
 *   chunksProcessed: number,
 * }}
 */
export default function useAudioCapture(isMicOn, options = {}) {
  const { chunkIntervalMs = 2000 } = options;

  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunksProcessed, setChunksProcessed] = useState(0);

  // Refs to survive re-renders
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isActiveRef = useRef(false); // controls the stop-restart loop
  const mimeTypeRef = useRef('audio/webm');

  /**
   * Create a new MediaRecorder on the existing stream, record for one chunk,
   * then resolve with the complete audio blob.
   */
  const recordOneChunk = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !stream.active || !isActiveRef.current) return;

    const mimeType = mimeTypeRef.current;

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        recorderRef.current = null;

        // Build complete blob from all chunks
        const blob = new Blob(chunks, { type: mimeType });

        if (blob.size < 1000) {
          // Too small, likely silence — skip
          scheduleNext();
          return;
        }

        // Processing lock — skip if previous chunk is still processing
        if (isProcessingRef.current) {
          log('AUDIO', 'WARN', '⏳ Skipping chunk — previous still processing');
          scheduleNext();
          return;
        }

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
          log('AUDIO', 'INFO', `📦 Chunk ready — ${(blob.size / 1024).toFixed(1)} KB`);
          await processAudio(blob);
          setChunksProcessed((prev) => prev + 1);
        } catch (err) {
          log('AUDIO', 'ERROR', 'Failed to process audio chunk', err.message);
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }

        // Schedule next recording cycle
        scheduleNext();
      };

      recorder.onerror = (event) => {
        log('AUDIO', 'ERROR', 'MediaRecorder error', event.error?.message);
        recorderRef.current = null;
        scheduleNext();
      };

      // Start recording (no timeslice — complete file on stop)
      recorder.start();

      // Stop after chunkIntervalMs to produce a complete webm
      timerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, chunkIntervalMs);

    } catch (err) {
      log('AUDIO', 'ERROR', 'Failed to create recorder', err.message);
      scheduleNext();
    }
  }, [chunkIntervalMs]);

  /**
   * Schedule the next recording cycle (small gap between chunks is fine for STT).
   */
  const scheduleNext = useCallback(() => {
    if (!isActiveRef.current) return;
    // Tiny delay to let the browser breathe
    timerRef.current = setTimeout(() => {
      recordOneChunk();
    }, 50);
  }, [recordOneChunk]);

  /**
   * Full cleanup: stop recorder, stop stream, clear timers.
   */
  const cleanup = useCallback(() => {
    isActiveRef.current = false;

    // Clear pending timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Stop current recorder
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    recorderRef.current = null;

    // Release mic hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    log('AUDIO', 'INFO', '🎙️ Recorder stopped and cleaned up');
  }, []);

  /**
   * Request mic permission and start the record-cycle loop.
   */
  const startCapture = useCallback(async () => {
    setMicError(null);

    // Guard: kill any existing session first
    if (streamRef.current) {
      cleanup();
    }

    try {
      // 1. Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // 2. Pick best MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';
      mimeTypeRef.current = mimeType;

      // 3. Start the record cycle
      isActiveRef.current = true;
      setIsListening(true);
      log('AUDIO', 'INFO', `🎙️ Recording started — ${chunkIntervalMs}ms chunks, MIME: ${mimeType}`);

      recordOneChunk();

    } catch (err) {
      log('AUDIO', 'ERROR', 'Microphone access failed', err.message);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission denied. Please allow mic access and try again.');
      } else if (err.name === 'NotFoundError') {
        setMicError('No microphone found. Please connect a mic and try again.');
      } else if (err.name === 'NotReadableError') {
        setMicError('Microphone is being used by another app. Close it and try again.');
      } else {
        setMicError(`Microphone error: ${err.message}`);
      }

      setIsListening(false);
    }
  }, [chunkIntervalMs, cleanup, recordOneChunk]);

  /**
   * Main lifecycle: start/stop based on isMicOn.
   */
  useEffect(() => {
    if (!isMicOn) {
      cleanup();
      return;
    }

    startCapture();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn]);

  return {
    isListening,
    micError,
    isProcessing,
    chunksProcessed,
  };
}
