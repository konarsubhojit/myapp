import { describe, it, expect } from 'vitest';
import {
  createItemId,
  createOrderId,
  createOrderItemId,
  createFeedbackId,
  createFeedbackTokenId,
  isValidId,
  parseItemId,
  parseOrderId,
  parseFeedbackId,
  type ItemId,
  type OrderId,
  type FeedbackId,
} from '../../types/brandedIds';

describe('Branded IDs', () => {
  describe('create functions', () => {
    it('should create ItemId from number', () => {
      const id = createItemId(123);
      expect(id).toBe(123);
    });

    it('should create OrderId from number', () => {
      const id = createOrderId(456);
      expect(id).toBe(456);
    });

    it('should create OrderItemId from number', () => {
      const id = createOrderItemId(789);
      expect(id).toBe(789);
    });

    it('should create FeedbackId from number', () => {
      const id = createFeedbackId(101);
      expect(id).toBe(101);
    });

    it('should create FeedbackTokenId from number', () => {
      const id = createFeedbackTokenId(202);
      expect(id).toBe(202);
    });
  });

  describe('isValidId', () => {
    it('should return true for positive integers', () => {
      expect(isValidId(1)).toBe(true);
      expect(isValidId(100)).toBe(true);
      expect(isValidId(999999)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isValidId(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isValidId(-1)).toBe(false);
      expect(isValidId(-100)).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(isValidId(1.5)).toBe(false);
      expect(isValidId(3.14)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidId('123')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId({})).toBe(false);
      expect(isValidId([])).toBe(false);
    });
  });

  describe('parseItemId', () => {
    it('should parse valid string to ItemId', () => {
      const result = parseItemId('123');
      expect(result).toBe(123);
    });

    it('should parse valid number to ItemId', () => {
      const result = parseItemId(456);
      expect(result).toBe(456);
    });

    it('should return null for invalid string', () => {
      expect(parseItemId('abc')).toBeNull();
      expect(parseItemId('')).toBeNull();
      expect(parseItemId('  ')).toBeNull();
    });

    it('should return null for zero', () => {
      expect(parseItemId('0')).toBeNull();
      expect(parseItemId(0)).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(parseItemId('-5')).toBeNull();
      expect(parseItemId(-10)).toBeNull();
    });
  });

  describe('parseOrderId', () => {
    it('should parse valid string to OrderId', () => {
      const result = parseOrderId('789');
      expect(result).toBe(789);
    });

    it('should parse valid number to OrderId', () => {
      const result = parseOrderId(101);
      expect(result).toBe(101);
    });

    it('should return null for invalid string', () => {
      expect(parseOrderId('xyz')).toBeNull();
      expect(parseOrderId('')).toBeNull();
      expect(parseOrderId('  ')).toBeNull();
    });

    it('should return null for zero', () => {
      expect(parseOrderId('0')).toBeNull();
      expect(parseOrderId(0)).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(parseOrderId('-1')).toBeNull();
      expect(parseOrderId(-99)).toBeNull();
    });
  });

  describe('parseFeedbackId', () => {
    it('should parse valid string to FeedbackId', () => {
      const result = parseFeedbackId('555');
      expect(result).toBe(555);
    });

    it('should parse valid number to FeedbackId', () => {
      const result = parseFeedbackId(777);
      expect(result).toBe(777);
    });

    it('should return null for invalid string', () => {
      expect(parseFeedbackId('invalid')).toBeNull();
      expect(parseFeedbackId('')).toBeNull();
      expect(parseFeedbackId('  ')).toBeNull();
    });

    it('should return null for zero', () => {
      expect(parseFeedbackId('0')).toBeNull();
      expect(parseFeedbackId(0)).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(parseFeedbackId('-7')).toBeNull();
      expect(parseFeedbackId(-42)).toBeNull();
    });
  });

  describe('type safety', () => {
    it('should prevent mixing different ID types at compile time', () => {
      // This test documents that TypeScript will catch type mismatches
      const itemId: ItemId = createItemId(1);
      const orderId: OrderId = createOrderId(2);
      const feedbackId: FeedbackId = createFeedbackId(3);

      // These assignments should work
      expect(itemId).toBe(1);
      expect(orderId).toBe(2);
      expect(feedbackId).toBe(3);

      // At runtime, branded types are just numbers
      // But TypeScript prevents cross-assignment at compile time
      expect(typeof itemId).toBe('number');
      expect(typeof orderId).toBe('number');
      expect(typeof feedbackId).toBe('number');
    });
  });
});
