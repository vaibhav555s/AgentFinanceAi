/**
 * ─── useAIState Hook ────────────────────────────────────
 * Subscribes to stateManager and provides debounced React state
 * for rendering AI-extracted data without flickering.
 *
 * Features:
 *  - Subscribes/unsubscribes on mount/unmount
 *  - 500ms debounce to prevent UI flicker
 *  - Returns structured data ready for UI rendering
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribe, getState } from '../modules/state/stateManager.js';

/**
 * @param {Object} [options]
 * @param {number} [options.debounceMs=500] - Debounce delay for UI updates
 * @returns {{
 *   extractedData: Object,
 *   risk: Object,
 *   intent: Object,
 *   consent: Object,
 *   stats: Object,
 *   kycFields: Array<{ label: string, value: string, confidence: string }>,
 * }}
 */
export default function useAIState(options = {}) {
  const { debounceMs = 500 } = options;

  const [aiState, setAiState] = useState(() => getState());
  const debounceTimerRef = useRef(null);

  // Debounced state setter
  const debouncedUpdate = useCallback(
    (newState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setAiState(newState);
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = subscribe((newState) => {
      debouncedUpdate(newState);
    });

    // Cleanup
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedUpdate]);

  // Transform extracted data into KYC_FIELDS format for Stage1KYC
  const kycFields = buildKYCFields(aiState.extractedData);

  return {
    extractedData: aiState.extractedData,
    risk: aiState.risk,
    intent: aiState.intent,
    consent: aiState.consent,
    stats: aiState.stats,
    kycFields,
  };
}

/* ─── Helpers ────────────────────────────────────────── */

function fmtINR(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

function confidenceLabel(score) {
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  if (score > 0) return 'Low';
  return 'Waiting';
}

function purposeLabel(p) {
  if (!p) return '—';
  return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ');
}

function employmentLabel(e) {
  if (!e) return '—';
  const map = {
    salaried: 'Salaried — Private Sector',
    self_employed: 'Self Employed',
    government: 'Government / PSU',
    retired: 'Retired',
    student: 'Student',
    unemployed: 'Unemployed',
  };
  return map[e] || e;
}

/**
 * Build the KYC fields array from extraction state.
 * @param {Object} extractedData
 * @returns {Array<{ label: string, value: string, confidence: string }>}
 */
function buildKYCFields(extractedData) {
  if (!extractedData) return [];

  return [
    {
      label: 'Full Name',
      value: extractedData.name?.value || '—',
      confidence: confidenceLabel(extractedData.name?.confidence || 0),
    },
    {
      label: 'Employment Type',
      value: employmentLabel(extractedData.employment?.value),
      confidence: confidenceLabel(extractedData.employment?.confidence || 0),
    },
    {
      label: 'Monthly Income',
      value: extractedData.income?.value ? fmtINR(extractedData.income.value) : '—',
      confidence: confidenceLabel(extractedData.income?.confidence || 0),
    },
    {
      label: 'Loan Purpose',
      value: purposeLabel(extractedData.purpose?.value),
      confidence: confidenceLabel(extractedData.purpose?.confidence || 0),
    },
    {
      label: 'Requested Amount',
      value: extractedData.loanAmount?.value ? fmtINR(extractedData.loanAmount.value) : '—',
      confidence: confidenceLabel(extractedData.loanAmount?.confidence || 0),
    },
  ];
}
