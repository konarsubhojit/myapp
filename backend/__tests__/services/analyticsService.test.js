import { calculateSalesAnalytics } from '../../services/analyticsService.js';

describe('Analytics Service', () => {
  describe('calculateSalesAnalytics', () => {
    it('should return analytics for all time ranges', () => {
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 100,
          status: 'completed',
          createdAt: new Date().toISOString(),
          items: [
            { name: 'Item A', price: 50, quantity: 2 }
          ]
        },
        {
          orderId: 'ORD002',
          customerId: 'CUST002',
          customerName: 'Jane Smith',
          orderFrom: 'facebook',
          totalPrice: 200,
          status: 'completed',
          createdAt: new Date().toISOString(),
          items: [
            { name: 'Item B', price: 100, quantity: 2 }
          ]
        }
      ];

      const result = calculateSalesAnalytics(mockOrders, 'completed');

      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('timeRanges');
      expect(result).toHaveProperty('generatedAt');
      expect(result.timeRanges).toHaveLength(5); // week, month, quarter, halfYear, year
    });

    it('should compute correct analytics for month range', () => {
      const now = new Date();
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 150,
          status: 'completed',
          createdAt: now.toISOString(),
          items: [
            { name: 'Item A', price: 50, quantity: 3 }
          ]
        },
        {
          orderId: 'ORD002',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 250,
          status: 'completed',
          createdAt: now.toISOString(),
          items: [
            { name: 'Item A', price: 50, quantity: 2 },
            { name: 'Item B', price: 75, quantity: 2 }
          ]
        }
      ];

      const result = calculateSalesAnalytics(mockOrders, 'completed');
      const monthAnalytics = result.analytics.month;

      expect(monthAnalytics.totalSales).toBe(400);
      expect(monthAnalytics.orderCount).toBe(2);
      expect(monthAnalytics.averageOrderValue).toBe(200);
      expect(monthAnalytics.uniqueCustomers).toBe(1);
      expect(monthAnalytics.topItems).toHaveLength(2);
      expect(monthAnalytics.topItems[0].name).toBe('Item A');
      expect(monthAnalytics.topItems[0].quantity).toBe(5);
    });

    it('should filter by status correctly', () => {
      const now = new Date();
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 100,
          status: 'completed',
          createdAt: now.toISOString(),
          items: [{ name: 'Item A', price: 100, quantity: 1 }]
        },
        {
          orderId: 'ORD002',
          customerId: 'CUST002',
          customerName: 'Jane Smith',
          orderFrom: 'facebook',
          totalPrice: 200,
          status: 'pending',
          createdAt: now.toISOString(),
          items: [{ name: 'Item B', price: 200, quantity: 1 }]
        }
      ];

      const completedResult = calculateSalesAnalytics(mockOrders, 'completed');
      const allResult = calculateSalesAnalytics(mockOrders, 'all');

      expect(completedResult.analytics.month.orderCount).toBe(1);
      expect(completedResult.analytics.month.totalSales).toBe(100);
      
      expect(allResult.analytics.month.orderCount).toBe(2);
      expect(allResult.analytics.month.totalSales).toBe(300);
    });

    it('should handle empty orders array', () => {
      const result = calculateSalesAnalytics([], 'completed');
      const monthAnalytics = result.analytics.month;

      expect(monthAnalytics.totalSales).toBe(0);
      expect(monthAnalytics.orderCount).toBe(0);
      expect(monthAnalytics.averageOrderValue).toBe(0);
      expect(monthAnalytics.uniqueCustomers).toBe(0);
      expect(monthAnalytics.topItems).toHaveLength(0);
      expect(monthAnalytics.topCustomersByOrders).toHaveLength(0);
      expect(monthAnalytics.highestOrderingCustomer).toBeNull();
    });
  });
});
