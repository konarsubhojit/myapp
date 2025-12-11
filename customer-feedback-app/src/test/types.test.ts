import { describe, it, expect } from 'vitest';
import { createOrderId, type OrderId, type OrderStatus, type FeedbackFormData } from '../types';

describe('Types', () => {
  describe('createOrderId', () => {
    it('should create an OrderId from a number', () => {
      const id = createOrderId(123);
      expect(id).toBe(123);
    });

    it('should work with 0', () => {
      const id = createOrderId(0);
      expect(id).toBe(0);
    });

    it('should work with negative numbers', () => {
      const id = createOrderId(-1);
      expect(id).toBe(-1);
    });

    it('should work with large numbers', () => {
      const id = createOrderId(999999999);
      expect(id).toBe(999999999);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid OrderStatus values', () => {
      const statuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];
      expect(statuses).toHaveLength(4);
    });

    it('should have correct FeedbackFormData structure', () => {
      const formData: FeedbackFormData = {
        rating: 5,
        comment: 'Great!',
        productQuality: 4,
        deliveryExperience: 3,
        customerService: 5
      };
      
      expect(formData.rating).toBe(5);
      expect(formData.comment).toBe('Great!');
      expect(formData.productQuality).toBe(4);
      expect(formData.deliveryExperience).toBe(3);
      expect(formData.customerService).toBe(5);
    });

    it('should allow OrderId to be used as a number', () => {
      const id: OrderId = createOrderId(42);
      const doubled = (id as number) * 2;
      expect(doubled).toBe(84);
    });
  });
});
