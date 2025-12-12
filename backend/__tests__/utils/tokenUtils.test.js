import { describe, it, expect } from '@jest/globals';
import { generateSecureToken, generateFeedbackToken } from '../../utils/tokenUtils.js';

describe('Token Utils', () => {
  describe('generateSecureToken', () => {
    it('should generate a secure token with default length', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // Default length is 32 bytes = 64 hex characters
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate a secure token with custom length', () => {
      const token = generateSecureToken(16);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // 16 bytes = 32 hex characters
      expect(token.length).toBe(32);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateFeedbackToken', () => {
    it('should generate a feedback token with default expiry', () => {
      const result = generateFeedbackToken();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt instanceof Date).toBe(true);
      
      // Check token format
      expect(result.token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(result.token)).toBe(true);
      
      // Check expiry is in the future
      const now = new Date();
      expect(result.expiresAt.getTime()).toBeGreaterThan(now.getTime());
      
      // Check expiry is approximately 30 days from now (allow 1 second variance)
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 30);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });

    it('should generate a feedback token with custom expiry days', () => {
      const expiryDays = 7;
      const result = generateFeedbackToken(expiryDays);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      
      // Check expiry is approximately 7 days from now
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + expiryDays);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });

    it('should generate different tokens on each call', () => {
      const result1 = generateFeedbackToken();
      const result2 = generateFeedbackToken();
      
      expect(result1.token).not.toBe(result2.token);
    });
  });
});
