const {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  VALID_ORDER_SOURCES,
  VALID_DELIVERY_STATUSES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
} = require('../../constants/orderConstants');

describe('Order Constants', () => {
  describe('VALID_ORDER_STATUSES', () => {
    it('should be an array with expected order statuses', () => {
      expect(Array.isArray(VALID_ORDER_STATUSES)).toBe(true);
      expect(VALID_ORDER_STATUSES).toContain('pending');
      expect(VALID_ORDER_STATUSES).toContain('processing');
      expect(VALID_ORDER_STATUSES).toContain('completed');
      expect(VALID_ORDER_STATUSES).toContain('cancelled');
      expect(VALID_ORDER_STATUSES).toHaveLength(4);
    });
  });

  describe('VALID_PAYMENT_STATUSES', () => {
    it('should be an array with expected payment statuses', () => {
      expect(Array.isArray(VALID_PAYMENT_STATUSES)).toBe(true);
      expect(VALID_PAYMENT_STATUSES).toContain('unpaid');
      expect(VALID_PAYMENT_STATUSES).toContain('partially_paid');
      expect(VALID_PAYMENT_STATUSES).toContain('paid');
      expect(VALID_PAYMENT_STATUSES).toContain('cash_on_delivery');
      expect(VALID_PAYMENT_STATUSES).toContain('refunded');
      expect(VALID_PAYMENT_STATUSES).toHaveLength(5);
    });
  });

  describe('VALID_CONFIRMATION_STATUSES', () => {
    it('should be an array with expected confirmation statuses', () => {
      expect(Array.isArray(VALID_CONFIRMATION_STATUSES)).toBe(true);
      expect(VALID_CONFIRMATION_STATUSES).toContain('unconfirmed');
      expect(VALID_CONFIRMATION_STATUSES).toContain('pending_confirmation');
      expect(VALID_CONFIRMATION_STATUSES).toContain('confirmed');
      expect(VALID_CONFIRMATION_STATUSES).toContain('cancelled');
      expect(VALID_CONFIRMATION_STATUSES).toHaveLength(4);
    });
  });

  describe('VALID_ORDER_SOURCES', () => {
    it('should be an array with expected order sources', () => {
      expect(Array.isArray(VALID_ORDER_SOURCES)).toBe(true);
      expect(VALID_ORDER_SOURCES).toContain('instagram');
      expect(VALID_ORDER_SOURCES).toContain('facebook');
      expect(VALID_ORDER_SOURCES).toContain('whatsapp');
      expect(VALID_ORDER_SOURCES).toContain('call');
      expect(VALID_ORDER_SOURCES).toContain('offline');
      expect(VALID_ORDER_SOURCES).toHaveLength(5);
    });
  });

  describe('VALID_DELIVERY_STATUSES', () => {
    it('should be an array with expected delivery statuses', () => {
      expect(Array.isArray(VALID_DELIVERY_STATUSES)).toBe(true);
      expect(VALID_DELIVERY_STATUSES).toContain('not_shipped');
      expect(VALID_DELIVERY_STATUSES).toContain('shipped');
      expect(VALID_DELIVERY_STATUSES).toContain('in_transit');
      expect(VALID_DELIVERY_STATUSES).toContain('out_for_delivery');
      expect(VALID_DELIVERY_STATUSES).toContain('delivered');
      expect(VALID_DELIVERY_STATUSES).toContain('returned');
      expect(VALID_DELIVERY_STATUSES).toHaveLength(6);
    });
  });

  describe('MAX_CUSTOMER_NOTES_LENGTH', () => {
    it('should be set to 5000', () => {
      expect(MAX_CUSTOMER_NOTES_LENGTH).toBe(5000);
    });

    it('should be a positive number', () => {
      expect(typeof MAX_CUSTOMER_NOTES_LENGTH).toBe('number');
      expect(MAX_CUSTOMER_NOTES_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('PRIORITY_MIN', () => {
    it('should be set to 0', () => {
      expect(PRIORITY_MIN).toBe(0);
    });

    it('should be a number', () => {
      expect(typeof PRIORITY_MIN).toBe('number');
    });
  });

  describe('PRIORITY_MAX', () => {
    it('should be set to 5', () => {
      expect(PRIORITY_MAX).toBe(5);
    });

    it('should be a number', () => {
      expect(typeof PRIORITY_MAX).toBe('number');
    });

    it('should be greater than PRIORITY_MIN', () => {
      expect(PRIORITY_MAX).toBeGreaterThan(PRIORITY_MIN);
    });
  });

  describe('Priority Range', () => {
    it('should have valid priority range', () => {
      expect(PRIORITY_MAX - PRIORITY_MIN).toBe(5);
    });
  });
});
