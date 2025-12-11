import type { Logger, LogMeta } from '../types/index.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const VALID_LEVELS = Object.keys(LOG_LEVELS) as LogLevel[];

function getCurrentLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && VALID_LEVELS.includes(envLevel)) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const currentLevel = getCurrentLevel();

function formatMessage(level: LogLevel, context: string, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    return `${baseMessage} ${JSON.stringify(meta)}`;
  }
  return baseMessage;
}

function shouldLog(level: LogLevel): boolean {
  const levelValue = LOG_LEVELS[level];
  const currentLevelValue = LOG_LEVELS[currentLevel];
  return levelValue !== undefined && currentLevelValue !== undefined && levelValue <= currentLevelValue;
}

export function createLogger(context: string): Logger {
  return {
    error(message: string, errorOrMeta?: Error | LogMeta): void {
      if (shouldLog('error')) {
        const meta: LogMeta | undefined = errorOrMeta instanceof Error 
          ? { error: errorOrMeta.message, stack: errorOrMeta.stack }
          : errorOrMeta;
        console.error(formatMessage('error', context, message, meta));
      }
    },

    warn(message: string, meta?: LogMeta): void {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message, meta));
      }
    },

    info(message: string, meta?: LogMeta): void {
      if (shouldLog('info')) {
        console.log(formatMessage('info', context, message, meta));
      }
    },

    debug(message: string, meta?: LogMeta): void {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', context, message, meta));
      }
    }
  };
}
