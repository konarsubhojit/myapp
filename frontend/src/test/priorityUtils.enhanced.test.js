import { describe, it, expect } from 'vitest';
import { getPriorityStatus } from '../features/orders/priorityUtils';

describe('priorityUtils', () => {
  describe('getPriorityStatus', () => {
    it('should return null when no delivery date is provided', () => {
      const result = getPriorityStatus(null);
      expect(result).toBeNull();
    });

    it('should return null when delivery date is undefined', () => {
      const result = getPriorityStatus(undefined);
      expect(result).toBeNull();
    });

    it('should return overdue status for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = getPriorityStatus(yesterday.toISOString());
      
      expect(result).toBeDefined();
      expect(result.status).toBe('overdue');
      expect(result.label).toBe('Overdue by 1 day');
      expect(result.className).toBe('priority-overdue');
    });

    it('should return critical status for today', () => {
      const today = new Date();
      
      const result = getPriorityStatus(today.toISOString());
      
      expect(result).toBeDefined();
      expect(result.status).toBe('critical');
      expect(result.label).toBe('Due Today');
      expect(result.className).toBe('priority-critical');
    });

    it('should return critical status for delivery within 1 day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = getPriorityStatus(tomorrow.toISOString());
      
      expect(result).toBeDefined();
      expect(result.status).toBe('critical');
      expect(result.label).toBe('Due in 1 day');
      expect(result.className).toBe('priority-critical');
    });

    it('should return critical status for delivery within 3 days', () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      
      const result = getPriorityStatus(threeDays.toISOString());
      
      expect(result).toBeDefined();
      expect(result.status).toBe('critical');
      expect(result.label).toBe('Due in 3 days');
      expect(result.className).toBe('priority-critical');
    });

    it('should return urgent status for delivery in 5 days', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);
      
      const result = getPriorityStatus(fiveDays.toISOString());
      
      expect(result).toBeDefined();
      expect(result.status).toBe('urgent');
      expect(result.label).toBe('Due in 5 days');
      expect(result.className).toBe('priority-urgent');
    });

    it('should return short label for urgent status with shortLabels option', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);
      
      const result = getPriorityStatus(fiveDays.toISOString(), { shortLabels: true });
      
      expect(result).toBeDefined();
      expect(result.status).toBe('urgent');
      expect(result.label).toBe('5d');
    });

    it('should return short label for critical status with shortLabels option', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = getPriorityStatus(tomorrow.toISOString(), { shortLabels: true });
      
      expect(result).toBeDefined();
      expect(result.label).toBe('1d');
    });

    it('should use plural "days" for multiple days', () => {
      const twoDays = new Date();
      twoDays.setDate(twoDays.getDate() + 2);
      
      const result = getPriorityStatus(twoDays.toISOString());
      
      expect(result).toBeDefined();
      expect(result.label).toBe('Due in 2 days');
    });

    it('should use singular "day" for one day', () => {
      const oneDay = new Date();
      oneDay.setDate(oneDay.getDate() + 1);
      
      const result = getPriorityStatus(oneDay.toISOString());
      
      expect(result).toBeDefined();
      expect(result.label).toBe('Due in 1 day');
    });
  });
});
