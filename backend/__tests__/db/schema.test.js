import { items, orders, orderItems, orderFromEnum, orderStatusEnum } from '../../db/schema.ts';

describe('Database Schema', () => {
  describe('items table', () => {
    it('should be defined', () => {
      expect(items).toBeDefined();
      expect(items).toHaveProperty('id');
      expect(items).toHaveProperty('name');
      expect(items).toHaveProperty('price');
      expect(items).toHaveProperty('color');
      expect(items).toHaveProperty('fabric');
      expect(items).toHaveProperty('specialFeatures');
      expect(items).toHaveProperty('imageUrl');
      expect(items).toHaveProperty('createdAt');
      expect(items).toHaveProperty('deletedAt');
    });

    it('should have correct table name', () => {
      expect(items[Symbol.for('drizzle:Name')]).toBe('items');
    });
  });

  describe('orders table', () => {
    it('should be defined', () => {
      expect(orders).toBeDefined();
      expect(orders).toHaveProperty('id');
      expect(orders).toHaveProperty('orderId');
      expect(orders).toHaveProperty('orderFrom');
      expect(orders).toHaveProperty('customerName');
      expect(orders).toHaveProperty('customerId');
      expect(orders).toHaveProperty('address');
      expect(orders).toHaveProperty('totalPrice');
      expect(orders).toHaveProperty('status');
      expect(orders).toHaveProperty('paymentStatus');
      expect(orders).toHaveProperty('paidAmount');
      expect(orders).toHaveProperty('confirmationStatus');
      expect(orders).toHaveProperty('customerNotes');
      expect(orders).toHaveProperty('priority');
      expect(orders).toHaveProperty('orderDate');
      expect(orders).toHaveProperty('expectedDeliveryDate');
      expect(orders).toHaveProperty('deliveryStatus');
      expect(orders).toHaveProperty('trackingId');
      expect(orders).toHaveProperty('deliveryPartner');
      expect(orders).toHaveProperty('actualDeliveryDate');
      expect(orders).toHaveProperty('createdAt');
    });

    it('should have correct table name', () => {
      expect(orders[Symbol.for('drizzle:Name')]).toBe('orders');
    });
  });

  describe('orderItems table', () => {
    it('should be defined', () => {
      expect(orderItems).toBeDefined();
      expect(orderItems).toHaveProperty('id');
      expect(orderItems).toHaveProperty('orderId');
      expect(orderItems).toHaveProperty('itemId');
      expect(orderItems).toHaveProperty('name');
      expect(orderItems).toHaveProperty('price');
      expect(orderItems).toHaveProperty('quantity');
      expect(orderItems).toHaveProperty('customizationRequest');
    });

    it('should have correct table name', () => {
      expect(orderItems[Symbol.for('drizzle:Name')]).toBe('order_items');
    });
  });

  describe('enums', () => {
    it('should define orderFromEnum', () => {
      expect(orderFromEnum).toBeDefined();
      expect(orderFromEnum.enumName).toBe('order_from');
    });

    it('should define orderStatusEnum', () => {
      expect(orderStatusEnum).toBeDefined();
      expect(orderStatusEnum.enumName).toBe('order_status');
    });
  });

  describe('module exports', () => {
    it('should export all required schema objects', async () => {
      const schema = await import('../../db/schema.ts');
      expect(schema).toHaveProperty('items');
      expect(schema).toHaveProperty('orders');
      expect(schema).toHaveProperty('orderItems');
      expect(schema).toHaveProperty('orderFromEnum');
      expect(schema).toHaveProperty('orderStatusEnum');
    });
  });
});
