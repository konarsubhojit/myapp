import { describe, it, expect } from 'vitest';
import { getPriorityStatus, getPriorityColor, getPriorityDescription } from '../utils/priorityUtils';

describe('Priority Utils', () => {
  describe('getPriorityStatus', () => {
    it('should return null for undefined date', () => {
      const result = getPriorityStatus(undefined);
      expect(result).toBeNull();
    });

    it('should return null for null date', () => {
      const result = getPriorityStatus(null);
      expect(result).toBeNull();
    });

    it('should return overdue status for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = getPriorityStatus(yesterday.toISOString());

      expect(result.status).toBe('overdue');
      expect(result.urgency).toBe('critical');
      expect(result.daysRemaining).toBe(-1);
      expect(result.label).toBe('Overdue by 1 day');
    });

    it('should return due-today status for today', () => {
      const today = new Date();
      const result = getPriorityStatus(today.toISOString());

      expect(result.status).toBe('due-today');
      expect(result.urgency).toBe('critical');
      expect(result.daysRemaining).toBe(0);
      expect(result.label).toBe('Due Today');
    });

    it('should return critical status for delivery in 1 day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = getPriorityStatus(tomorrow.toISOString());

      expect(result.status).toBe('critical');
      expect(result.urgency).toBe('critical');
      expect(result.daysRemaining).toBe(1);
      expect(result.label).toBe('Due in 1 day');
    });

    it('should return critical status for delivery in 2 days', () => {
      const twoDays = new Date();
      twoDays.setDate(twoDays.getDate() + 2);
      const result = getPriorityStatus(twoDays.toISOString());

      expect(result.status).toBe('critical');
      expect(result.urgency).toBe('critical');
      expect(result.daysRemaining).toBe(2);
      expect(result.label).toBe('Due in 2 days');
    });

    it('should return critical status for delivery in 3 days', () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      const result = getPriorityStatus(threeDays.toISOString());

      expect(result.status).toBe('critical');
      expect(result.urgency).toBe('critical');
      expect(result.daysRemaining).toBe(3);
      expect(result.label).toBe('Due in 3 days');
    });

    it('should return urgent status for delivery in 5 days', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);
      const result = getPriorityStatus(fiveDays.toISOString());

      expect(result.status).toBe('urgent');
      expect(result.urgency).toBe('high');
      expect(result.daysRemaining).toBe(5);
      expect(result.label).toBe('Due in 5 days');
    });

    it('should return medium status for delivery in 10 days', () => {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);
      const result = getPriorityStatus(tenDays.toISOString());

      expect(result.status).toBe('medium');
      expect(result.urgency).toBe('medium');
      expect(result.daysRemaining).toBe(10);
      expect(result.label).toBe('Due in 10 days');
    });

    it('should return normal status for delivery beyond 14 days', () => {
      const twentyDays = new Date();
      twentyDays.setDate(twentyDays.getDate() + 20);
      const result = getPriorityStatus(twentyDays.toISOString());

      expect(result.status).toBe('normal');
      expect(result.urgency).toBe('low');
      expect(result.daysRemaining).toBe(20);
      expect(result.label).toBe('Due in 20 days');
    });

    it('should return short label when shortLabels option is true', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = getPriorityStatus(tomorrow.toISOString(), { shortLabels: true });

      expect(result.label).toBe('1d');
      expect(result.status).toBe('critical');
    });

    it('should return null for normal status when shortLabels is true', () => {
      const twentyDays = new Date();
      twentyDays.setDate(twentyDays.getDate() + 20);
      const result = getPriorityStatus(twentyDays.toISOString(), { shortLabels: true });

      expect(result).toBeNull();
    });

    it('should handle date strings', () => {
      const today = new Date();
      const result = getPriorityStatus(today.toISOString());

      expect(result.status).toBe('due-today');
      expect(result.urgency).toBe('critical');
    });
  });

  describe('getPriorityColor', () => {
    it('should return error for critical urgency', () => {
      const priority = { urgency: 'critical' };
      expect(getPriorityColor(priority)).toBe('error');
    });

    it('should return warning for high urgency', () => {
      const priority = { urgency: 'high' };
      expect(getPriorityColor(priority)).toBe('warning');
    });

    it('should return info for medium urgency', () => {
      const priority = { urgency: 'medium' };
      expect(getPriorityColor(priority)).toBe('info');
    });

    it('should return success for low urgency', () => {
      const priority = { urgency: 'low' };
      expect(getPriorityColor(priority)).toBe('success');
    });

    it('should return default for null priority', () => {
      expect(getPriorityColor(null)).toBe('default');
    });
  });

  describe('getPriorityDescription', () => {
    it('should return description for overdue order', () => {
      const priority = { daysRemaining: -2, urgency: 'critical' };
      expect(getPriorityDescription(priority)).toContain('2 days overdue');
    });

    it('should return description for due today', () => {
      const priority = { daysRemaining: 0, urgency: 'critical' };
      expect(getPriorityDescription(priority)).toBe('Critical: Order is due today');
    });

    it('should return description for critical priority', () => {
      const priority = { daysRemaining: 2, urgency: 'critical' };
      expect(getPriorityDescription(priority)).toContain('Critical');
      expect(getPriorityDescription(priority)).toContain('2 days');
    });

    it('should return description for no date', () => {
      expect(getPriorityDescription(null)).toBe('No delivery date set');
    });
  });
});
