import { describe, it, expect } from 'vitest';
import {
  getOrderStatusColor,
  getOrderPriorityColor,
  formatOrderDate,
  formatOrderDeliveryDate,
} from '../utils/orderUtils';

describe('orderUtils', () => {
  describe('getOrderStatusColor', () => {
    it('should return warning for pending status', () => {
      expect(getOrderStatusColor('pending')).toBe('warning');
    });

    it('should return info for processing status', () => {
      expect(getOrderStatusColor('processing')).toBe('info');
    });

    it('should return success for completed status', () => {
      expect(getOrderStatusColor('completed')).toBe('success');
    });

    it('should return error for cancelled status', () => {
      expect(getOrderStatusColor('cancelled')).toBe('error');
    });

    it('should return default for unknown status', () => {
      expect(getOrderStatusColor('unknown')).toBe('default');
    });
  });

  describe('getOrderPriorityColor', () => {
    it('should return default when priorityData is null', () => {
      expect(getOrderPriorityColor(null)).toBe('default');
    });

    it('should return error for overdue priority', () => {
      const priority = { className: 'priority-overdue', label: 'Overdue' };
      expect(getOrderPriorityColor(priority)).toBe('error');
    });

    it('should return warning for due-today priority', () => {
      const priority = { className: 'priority-due-today', label: 'Due Today' };
      expect(getOrderPriorityColor(priority)).toBe('warning');
    });

    it('should return warning for urgent priority', () => {
      const priority = { className: 'priority-urgent', label: 'Urgent' };
      expect(getOrderPriorityColor(priority)).toBe('warning');
    });

    it('should return success for normal priority', () => {
      const priority = { className: 'priority-normal', label: 'Normal' };
      expect(getOrderPriorityColor(priority)).toBe('success');
    });
  });

  describe('formatOrderDate', () => {
    it('should format date with time', () => {
      const date = '2024-01-15T10:30:00Z';
      const formatted = formatOrderDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should return "Not set" for null date', () => {
      expect(formatOrderDate(null)).toBe('Not set');
    });

    it('should return "Not set" for undefined date', () => {
      expect(formatOrderDate(undefined)).toBe('Not set');
    });
  });

  describe('formatOrderDeliveryDate', () => {
    it('should format date without time', () => {
      const date = '2024-01-20';
      const formatted = formatOrderDeliveryDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('20');
      expect(formatted).toContain('2024');
    });

    it('should return "Not set" for null date', () => {
      expect(formatOrderDeliveryDate(null)).toBe('Not set');
    });

    it('should return "Not set" for undefined date', () => {
      expect(formatOrderDeliveryDate(undefined)).toBe('Not set');
    });
  });
});
