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
export default function useAudioCapture() {
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunksProcessed, setChunksProcessed] = useState(0);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeTypeRef = useRef('audio/webm');

  // We no longer initialize on mount.
  // Instead, we request mic lazily when the user first clicks 'Tap to Speak'.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isProcessing) {
      log('AUDIO', 'WARN', '🎙️ Cannot start: AI is currently processing');
      return;
    }

    // Lazy load the microphone stream securely on the first click
    if (!streamRef.current) {
      try {
        log('AUDIO', 'INFO', '🎙️ Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });
        streamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';
        mimeTypeRef.current = mimeType;
        log('AUDIO', 'INFO', `🎙️ Microphone access granted. Using MIME: ${mimeType}`);
      } catch (err) {
        setMicError(err.message || "Microphone access denied.");
        log('AUDIO', 'ERROR', '🎙️ Microphone access denied or failed', err);
        return;
      }
    }

    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        recorderRef.current = null;
        if (blob.size < 1000) {
          return;
        }

        setIsProcessing(true);
        try {
          await processAudio(blob);
          setChunksProcessed((prev) => prev + 1);
        } catch (err) {
            log('AUDIO', 'ERROR', 'Processing failed', err);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setIsListening(true);
      log('AUDIO', 'INFO', '🎙️ PTT Recording started');
    } catch (err) {
      log('AUDIO', 'ERROR', 'Could not start recorder', err);
    }
  }, [isProcessing]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsListening(false);
      log('AUDIO', 'INFO', '🎙️ PTT Recording stopped');
    }
  }, []);

  return {
    isListening,
    micError,
    isProcessing,
    chunksProcessed,
    startRecording,
    stopRecording
  };
}
