import { jest } from '@jest/globals';

// Mock logger
jest.unstable_mockModule('../../utils/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { executeWithRetry, validateQueryResult } = await import('../../utils/dbRetry.js');

describe('Database Retry Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'success' });
      
      const result = await executeWithRetry(operation, { operationName: 'TestOp' });
      
      expect(result).toEqual({ data: 'success' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue({ data: 'success' });
      
      const result = await executeWithRetry(operation, { 
        operationName: 'TestOp',
        initialDelayMs: 10,
        maxDelayMs: 50
      });
      
      expect(result).toEqual({ data: 'success' });
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after exhausting retries', async () => {
      const error = new Error('ETIMEDOUT');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithRetry(operation, { 
        operationName: 'TestOp',
        maxRetries: 2,
        initialDelayMs: 10
      })).rejects.toThrow('ETIMEDOUT');
      
      expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Invalid input');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithRetry(operation, { 
        operationName: 'TestOp',
        maxRetries: 3,
        initialDelayMs: 10
      })).rejects.toThrow('Invalid input');
      
      expect(operation).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should use exponential backoff for retries', async () => {
      const delays = [];
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue({ data: 'success' });
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately for testing
      });
      
      await executeWithRetry(operation, { 
        operationName: 'TestOp',
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 1000
      });
      
      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
      
      // Check that delays are exponentially increasing
      expect(delays.length).toBe(2);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
    });

    it('should cap delay at maxDelayMs', async () => {
      const delays = [];
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue({ data: 'success' });
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      });
      
      await executeWithRetry(operation, { 
        operationName: 'TestOp',
        initialDelayMs: 100,
        backoffMultiplier: 4,
        maxDelayMs: 250
      });
      
      global.setTimeout = originalSetTimeout;
      
      // Check that delays are capped at maxDelayMs
      expect(delays.length).toBe(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(250); // 400 capped to 250
      expect(delays[2]).toBe(250); // 1000 capped to 250
    });

    it('should retry on connection errors', async () => {
      const errors = [
        new Error('Connection refused'),
        new Error('Connection reset'),
        new Error('Network unreachable'),
      ];
      
      for (const error of errors) {
        const operation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue({ data: 'success' });
        
        const result = await executeWithRetry(operation, { 
          operationName: 'TestOp',
          initialDelayMs: 10
        });
        
        expect(result).toEqual({ data: 'success' });
        expect(operation).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('validateQueryResult', () => {
    it('should return valid result for array', () => {
      const result = [{ id: 1 }, { id: 2 }];
      expect(validateQueryResult(result)).toEqual(result);
    });

    it('should return valid result for empty array when allowed', () => {
      const result = [];
      expect(validateQueryResult(result, { allowEmpty: true })).toEqual(result);
    });

    it('should throw error for empty array when not allowed', () => {
      const result = [];
      expect(() => validateQueryResult(result, { allowEmpty: false, operationName: 'TestQuery' }))
        .toThrow('TestQuery returned unexpected empty result');
    });

    it('should throw error for null result', () => {
      expect(() => validateQueryResult(null, { operationName: 'TestQuery' }))
        .toThrow('TestQuery returned invalid result: null');
    });

    it('should throw error for undefined result', () => {
      expect(() => validateQueryResult(undefined, { operationName: 'TestQuery' }))
        .toThrow('TestQuery returned invalid result: undefined');
    });

    it('should return valid object result', () => {
      const result = { id: 1, name: 'Test' };
      expect(validateQueryResult(result)).toEqual(result);
    });
  });
});
