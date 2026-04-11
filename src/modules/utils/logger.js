/**
 * ─── Logger Utility ─────────────────────────────────────
 * Structured logging for the AI Intelligence Layer.
 * Logs STT results, extraction, risk, intent, consent.
 * Color-coded by module for easy debugging.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const MODULE_COLORS = {
  STT: '#3B82F6',        // Blue
  TRANSCRIPT: '#8B5CF6', // Purple
  EXTRACTION: '#10B981', // Green
  INTENT: '#F59E0B',     // Amber
  RISK: '#EF4444',       // Red
  CONSENT: '#06B6D4',    // Cyan
  STATE: '#EC4899',      // Pink
  INTERACTION: '#F97316', // Orange
};

let currentLevel = LOG_LEVELS.DEBUG;
const logHistory = [];
const MAX_HISTORY = 500;

function timestamp() {
  return new Date().toISOString();
}

function addToHistory(entry) {
  logHistory.push(entry);
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }
}

/**
 * Log a message from a specific module.
 * @param {'STT'|'TRANSCRIPT'|'EXTRACTION'|'INTENT'|'RISK'|'CONSENT'|'STATE'|'INTERACTION'} module
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 * @param {*} [data]
 */
export function log(module, level = 'INFO', message, data = null) {
  const color = MODULE_COLORS[module] || '#94A3B8';
  const timestamp = new Date().toISOString();
  
  // Format the log entry (browser console supports %c for CSS)
  const logEntry = `[${module}] ${message}`;
  
  if (data) {
    console.log(`%c[${level}]%c ${logEntry}`, `color: ${color}; font-weight: bold;`, 'color: inherit;', data);
  } else {
    console.log(`%c[${level}]%c ${logEntry}`, `color: ${color}; font-weight: bold;`, 'color: inherit;');
  }

  // Push to history
  logHistory.push({
    timestamp,
    module,
    level,
    message,
    data
  });

  // Keep history bounded
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }
}

/**
 * Set the minimum log level.
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 */
export function setLogLevel(level) {
  currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.DEBUG;
}

/**
 * Get the full log history array.
 * @returns {Array}
 */
export function getLogHistory() {
  return [...logHistory];
}

/**
 * Clear log history.
 */
export function clearLogHistory() {
  logHistory.length = 0;
}

export default { log, setLogLevel, getLogHistory, clearLogHistory };
