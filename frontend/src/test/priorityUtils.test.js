import { describe, it, expect } from 'vitest';
import { getPriorityStatus } from '../utils/priorityUtils';

describe('Priority Utils', () => {
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
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = getPriorityStatus(pastDate);

      expect(result).toEqual({
        status: 'overdue',
        label: 'Overdue',
        className: 'priority-overdue',
      });
    });

    it('should return due-today status for today', () => {
      const today = new Date();

      const result = getPriorityStatus(today);

      expect(result).toEqual({
        status: 'due-today',
        label: 'Due Today',
        className: 'priority-due-today',
      });
    });

    it('should return urgent status for delivery in 1 day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow);

      expect(result).toEqual({
        status: 'urgent',
        label: 'Due in 1 day',
        className: 'priority-urgent',
      });
    });

    it('should return urgent status for delivery in 2 days', () => {
      const twoDays = new Date();
      twoDays.setDate(twoDays.getDate() + 2);

      const result = getPriorityStatus(twoDays);

      expect(result).toEqual({
        status: 'urgent',
        label: 'Due in 2 days',
        className: 'priority-urgent',
      });
    });

    it('should return urgent status for delivery in 3 days', () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);

      const result = getPriorityStatus(threeDays);

      expect(result).toEqual({
        status: 'urgent',
        label: 'Due in 3 days',
        className: 'priority-urgent',
      });
    });

    it('should return normal status for delivery beyond 3 days', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);

      const result = getPriorityStatus(fiveDays);

      expect(result).toEqual({
        status: 'normal',
        label: 'Due in 5 days',
        className: 'priority-normal',
      });
    });

    it('should return short label when shortLabels option is true', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { shortLabels: true });

      expect(result).toEqual({
        status: 'urgent',
        label: '1d',
        className: 'priority-urgent',
      });
    });

    it('should return null for normal status when shortLabels is true', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);

      const result = getPriorityStatus(fiveDays, { shortLabels: true });

      expect(result).toBeNull();
    });

    it('should handle date strings', () => {
      const today = new Date();
      const result = getPriorityStatus(today.toISOString());

      expect(result).toEqual({
        status: 'due-today',
        label: 'Due Today',
        className: 'priority-due-today',
      });
    });

    it('should use correct plural for days label', () => {
      const twoDays = new Date();
      twoDays.setDate(twoDays.getDate() + 2);

      const result = getPriorityStatus(twoDays);

      expect(result.label).toBe('Due in 2 days');
    });

    it('should use correct singular for day label', () => {
      const oneDay = new Date();
      oneDay.setDate(oneDay.getDate() + 1);

      const result = getPriorityStatus(oneDay);

      expect(result.label).toBe('Due in 1 day');
    });
  });
});
