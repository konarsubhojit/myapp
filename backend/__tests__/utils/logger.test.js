import { jest } from '@jest/globals';
import { createLogger } from '../../utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let originalLogLevel;
  let originalNodeEnv;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    originalLogLevel = process.env.LOG_LEVEL;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    process.env.LOG_LEVEL = originalLogLevel;
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  describe('createLogger', () => {
    it('should create a logger with the given context', () => {
      const logger = createLogger('TestContext');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('debug');
    });

    it('should log error messages', () => {
      const logger = createLogger('TestContext');
      logger.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('[TestContext]');
      expect(logOutput).toContain('Test error message');
    });

    it('should log error with Error object', () => {
      const logger = createLogger('TestContext');
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('Test error');
    });

    it('should log warn messages', () => {
      const logger = createLogger('TestContext');
      logger.warn('Test warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Test warning message');
    });

    it('should log info messages', () => {
      const logger = createLogger('TestContext');
      logger.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Test info message');
    });

    it('should log debug messages', () => {
      const logger = createLogger('TestContext');
      logger.debug('Test debug message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[DEBUG]');
      expect(logOutput).toContain('Test debug message');
    });

    it('should include metadata in logs', () => {
      const logger = createLogger('TestContext');
      logger.info('Test message', { key: 'value', count: 42 });
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('{"key":"value","count":42}');
    });

    it('should format timestamp in ISO format', () => {
      const logger = createLogger('TestContext');
      logger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      // Check for ISO timestamp format (e.g., 2024-01-01T12:00:00.000Z)
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });
});
