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
      pastDate.setDate(pastDate.getDate() - 2);

      const result = getPriorityStatus(pastDate);

      expect(result).toMatchObject({
        status: 'overdue',
        label: 'Overdue by 2 days',
        className: 'priority-overdue',
        level: 'critical',
        icon: '🔴',
      });
    });

    it('should return critical status for today', () => {
      const today = new Date();

      const result = getPriorityStatus(today);

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due Today',
        className: 'priority-critical',
        level: 'critical',
        icon: '🔴',
      });
    });

    it('should return critical status for delivery in 1 day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow);

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due in 1 day',
        className: 'priority-critical',
        level: 'critical',
        icon: '🔴',
      });
    });

    it('should return critical status for delivery in 3 days', () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);

      const result = getPriorityStatus(threeDays);

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due in 3 days',
        className: 'priority-critical',
        level: 'critical',
        icon: '🔴',
      });
    });

    it('should return urgent status for delivery in 5 days', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);

      const result = getPriorityStatus(fiveDays);

      expect(result).toMatchObject({
        status: 'urgent',
        label: 'Due in 5 days',
        className: 'priority-urgent',
        level: 'urgent',
        icon: '🟠',
      });
    });

    it('should return urgent status for delivery in 7 days', () => {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);

      const result = getPriorityStatus(sevenDays);

      expect(result).toMatchObject({
        status: 'urgent',
        label: 'Due in 7 days',
        className: 'priority-urgent',
        level: 'urgent',
        icon: '🟠',
      });
    });

    it('should return medium status for delivery in 10 days', () => {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);

      const result = getPriorityStatus(tenDays);

      expect(result).toMatchObject({
        status: 'medium',
        label: 'Due in 10 days',
        className: 'priority-medium',
        level: 'medium',
        icon: '🔵',
      });
    });

    it('should return medium status for delivery in 14 days', () => {
      const fourteenDays = new Date();
      fourteenDays.setDate(fourteenDays.getDate() + 14);

      const result = getPriorityStatus(fourteenDays);

      expect(result).toMatchObject({
        status: 'medium',
        label: 'Due in 14 days',
        className: 'priority-medium',
        level: 'medium',
        icon: '🔵',
      });
    });

    it('should return normal status for delivery beyond 14 days', () => {
      const twentyDays = new Date();
      twentyDays.setDate(twentyDays.getDate() + 20);

      const result = getPriorityStatus(twentyDays);

      expect(result).toMatchObject({
        status: 'normal',
        label: 'Due in 20 days',
        className: 'priority-normal',
        level: 'normal',
        icon: '🟢',
      });
    });

    it('should return short label when shortLabels option is true for critical', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { shortLabels: true });

      expect(result).toMatchObject({
        status: 'critical',
        label: '1d',
        className: 'priority-critical',
        level: 'critical',
      });
    });

    it('should return short label for urgent status', () => {
      const fiveDays = new Date();
      fiveDays.setDate(fiveDays.getDate() + 5);

      const result = getPriorityStatus(fiveDays, { shortLabels: true });

      expect(result).toMatchObject({
        status: 'urgent',
        label: '5d',
        className: 'priority-urgent',
        level: 'urgent',
      });
    });

    it('should return short label for medium status', () => {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);

      const result = getPriorityStatus(tenDays, { shortLabels: true });

      expect(result).toMatchObject({
        status: 'medium',
        label: '10d',
        className: 'priority-medium',
        level: 'medium',
      });
    });

    it('should return short label for normal status', () => {
      const twentyDays = new Date();
      twentyDays.setDate(twentyDays.getDate() + 20);

      const result = getPriorityStatus(twentyDays, { shortLabels: true });

      expect(result).toMatchObject({
        status: 'normal',
        label: '20d',
        className: 'priority-normal',
        level: 'normal',
      });
    });

    it('should handle date strings', () => {
      const today = new Date();
      const result = getPriorityStatus(today.toISOString());

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due Today',
        className: 'priority-critical',
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

    it('should show overdue days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = getPriorityStatus(pastDate);

      expect(result.label).toBe('Overdue by 1 day');
    });

    it('should show overdue days plural for multiple past days', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const result = getPriorityStatus(pastDate);

      expect(result.label).toBe('Overdue by 5 days');
    });

    it('should show short overdue label', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);

      const result = getPriorityStatus(pastDate, { shortLabels: true });

      expect(result.label).toBe('3d late');
    });

    it('should return null for completed orders', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { orderStatus: 'completed' });

      expect(result).toBeNull();
    });

    it('should return null for cancelled orders', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { orderStatus: 'cancelled' });

      expect(result).toBeNull();
    });

    it('should return priority for pending orders', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { orderStatus: 'pending' });

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due in 1 day',
      });
    });

    it('should return priority for processing orders', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getPriorityStatus(tomorrow, { orderStatus: 'processing' });

      expect(result).toMatchObject({
        status: 'critical',
        label: 'Due in 1 day',
      });
    });
  });
});
