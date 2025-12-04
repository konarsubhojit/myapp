/**
 * Production-ready logger utility
 * Provides structured logging with different log levels
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const VALID_LEVELS = Object.keys(LOG_LEVELS);

/**
 * Get the current log level from environment or default based on NODE_ENV
 * @returns {string} Valid log level
 */
function getCurrentLevel() {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel && VALID_LEVELS.includes(envLevel)) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const currentLevel = getCurrentLevel();

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {Object} [meta] - Additional metadata
 * @returns {string} Formatted log message
 */
function formatMessage(level, context, message, meta) {
  const timestamp = new Date().toISOString();
  const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    return `${baseMessage} ${JSON.stringify(meta)}`;
  }
  return baseMessage;
}

/**
 * Check if a log level should be output
 * @param {string} level - Log level to check
 * @returns {boolean} Whether to log at this level
 */
function shouldLog(level) {
  const levelValue = LOG_LEVELS[level];
  const currentLevelValue = LOG_LEVELS[currentLevel];
  
  if (levelValue === undefined || currentLevelValue === undefined) {
    return false;
  }
  
  return levelValue <= currentLevelValue;
}

/**
 * Logger factory - creates a logger for a specific context
 * @param {string} context - The context/module name for this logger
 * @returns {Object} Logger instance with error, warn, info, debug methods
 */
function createLogger(context) {
  return {
    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {Error|Object} [errorOrMeta] - Error object or metadata
     */
    error(message, errorOrMeta) {
      if (shouldLog('error')) {
        const meta = errorOrMeta instanceof Error 
          ? { error: errorOrMeta.message, stack: errorOrMeta.stack }
          : errorOrMeta;
        console.error(formatMessage('error', context, message, meta));
      }
    },

    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {Object} [meta] - Additional metadata
     */
    warn(message, meta) {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message, meta));
      }
    },

    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {Object} [meta] - Additional metadata
     */
    info(message, meta) {
      if (shouldLog('info')) {
        console.log(formatMessage('info', context, message, meta));
      }
    },

    /**
     * Log a debug message (only in development)
     * @param {string} message - Debug message
     * @param {Object} [meta] - Additional metadata
     */
    debug(message, meta) {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', context, message, meta));
      }
    }
  };
}

module.exports = { createLogger };
