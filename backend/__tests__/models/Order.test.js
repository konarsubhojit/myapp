import { jest } from '@jest/globals';

// Mock the database connection
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn(),
}));

const { getDatabase } = await import('../../db/connection.js');
const { default: Order } = await import('../../models/Order.js');

describe('Order Model', () => {
  let mockDb;
  let mockSelect;
  let mockInsert;
  let mockUpdate;
  let mockDelete;

  beforeEach(() => {
    mockSelect = jest.fn();
    mockInsert = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    mockDb = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
          orderBy: jest.fn(() => mockSelect),
          limit: jest.fn(() => ({ offset: jest.fn(() => mockSelect) })),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => mockInsert),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => mockUpdate),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        where: jest.fn(() => mockDelete),
      })),
    };

    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    it('should return all orders with items', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'ORD123456',
          customerName: 'John Doe',
          customerId: 'CUST001',
          totalPrice: '100.00',
          status: 'pending',
          createdAt: new Date(),
        },
      ];

      const mockOrderItems = [
        { id: 1, orderId: 1, itemId: 1, name: 'Item 1', price: '50.00', quantity: 2 },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve(mockOrders)),
          })),
        })
        .mockReturnValue({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockOrderItems)),
          })),
        });

      const result = await Order.find();

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(1);
      expect(result[0].orderId).toBe('ORD123456');
      expect(result[0].items).toHaveLength(1);
      expect(result[0].totalPrice).toBe(100);
    });

    it('should handle empty result', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          orderBy: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await Order.find();

      expect(result).toHaveLength(0);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated orders with items', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'ORD123456',
          customerName: 'John Doe',
          customerId: 'CUST001',
          totalPrice: '100.00',
          status: 'pending',
          createdAt: new Date(),
        },
      ];

      const mockOrderItems = [
        { id: 1, orderId: 1, itemId: 1, name: 'Item 1', price: '50.00', quantity: 2 },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => Promise.resolve([{ count: '5' }])),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => Promise.resolve(mockOrders)),
              })),
            })),
          })),
        })
        .mockReturnValue({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockOrderItems)),
          })),
        });

      const result = await Order.findPaginated({ page: 1, limit: 10 });

      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('pagination');
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]._id).toBe(1);
      expect(result.orders[0].items).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1
      });
    });

    it('should return empty result when no orders', async () => {
      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => Promise.resolve([{ count: '0' }])),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        });

      const result = await Order.findPaginated({ page: 1, limit: 10 });

      expect(result.orders).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    });

    it('should use default values for page and limit', async () => {
      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => Promise.resolve([{ count: '0' }])),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        });

      const result = await Order.findPaginated({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return order by ID with items', async () => {
      const mockOrder = {
        id: 1,
        orderId: 'ORD123456',
        customerName: 'John Doe',
        customerId: 'CUST001',
        totalPrice: '100.00',
        status: 'pending',
        createdAt: new Date(),
      };

      const mockOrderItems = [
        { id: 1, orderId: 1, itemId: 1, name: 'Item 1', price: '50.00', quantity: 2 },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([mockOrder])),
          })),
        })
        .mockReturnValue({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockOrderItems)),
          })),
        });

      const result = await Order.findById(1);

      expect(result).toBeDefined();
      expect(result._id).toBe(1);
      expect(result.orderId).toBe('ORD123456');
      expect(result.items).toHaveLength(1);
    });

    it('should return null for invalid ID', async () => {
      const result = await Order.findById('invalid');

      expect(result).toBeNull();
    });

    it('should return null when order not found', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await Order.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new order with items', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST002',
        totalPrice: 150.0,
        paidAmount: 50.0,
        items: [
          { item: 1, name: 'Item 1', price: 50.0, quantity: 3 },
        ],
        paymentStatus: 'partially_paid',
        confirmationStatus: 'confirmed',
        customerNotes: 'Special instructions',
        priority: 1,
        expectedDeliveryDate: new Date('2024-12-31'),
      };

      const mockCreatedOrder = {
        id: 1,
        orderId: 'ORD654321',
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST002',
        totalPrice: '150.00',
        paidAmount: '50.00',
        paymentStatus: 'partially_paid',
        confirmationStatus: 'confirmed',
        customerNotes: 'Special instructions',
        priority: 1,
        expectedDeliveryDate: new Date('2024-12-31'),
        createdAt: new Date(),
      };

      const mockCreatedItems = [
        { id: 1, orderId: 1, itemId: 1, name: 'Item 1', price: '50.00', quantity: 3 },
      ];

      mockDb.insert = jest.fn()
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockCreatedOrder])),
          })),
        })
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve(mockCreatedItems)),
          })),
        });

      const result = await Order.create(orderData);

      expect(result).toBeDefined();
      expect(result._id).toBe(1);
      expect(result.orderId).toBe('ORD654321');
      expect(result.items).toHaveLength(1);
      expect(result.totalPrice).toBe(150);
      expect(result.paidAmount).toBe(50);
    });

    it('should create order with default values', async () => {
      const orderData = {
        orderFrom: 'App',
        customerName: 'Test User',
        customerId: 'CUST003',
        totalPrice: 100.0,
        items: [
          { item: 1, name: 'Item 1', price: 100.0, quantity: 1 },
        ],
      };

      const mockCreatedOrder = {
        id: 2,
        orderId: 'ORD111111',
        orderFrom: 'App',
        customerName: 'Test User',
        customerId: 'CUST003',
        totalPrice: '100.00',
        paidAmount: '0.00',
        paymentStatus: 'unpaid',
        confirmationStatus: 'unconfirmed',
        customerNotes: null,
        priority: 0,
        expectedDeliveryDate: null,
        createdAt: new Date(),
      };

      const mockCreatedItems = [
        { id: 2, orderId: 2, itemId: 1, name: 'Item 1', price: '100.00', quantity: 1 },
      ];

      mockDb.insert = jest.fn()
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockCreatedOrder])),
          })),
        })
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve(mockCreatedItems)),
          })),
        });

      const result = await Order.create(orderData);

      expect(result).toBeDefined();
      expect(result.paymentStatus).toBe('unpaid');
      expect(result.confirmationStatus).toBe('unconfirmed');
      expect(result.paidAmount).toBe(0);
      expect(result.priority).toBe(0);
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update an order', async () => {
      const updateData = {
        customerName: 'Updated Name',
        status: 'completed',
        paymentStatus: 'paid',
      };

      const mockExistingOrder = {
        id: 1,
        orderId: 'ORD123456',
        customerName: 'Old Name',
        status: 'pending',
      };

      const mockUpdatedOrder = {
        id: 1,
        orderId: 'ORD123456',
        customerName: 'Updated Name',
        customerId: 'CUST001',
        totalPrice: '100.00',
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: new Date(),
      };

      const mockOrderItems = [
        { id: 1, orderId: 1, itemId: 1, name: 'Item 1', price: '50.00', quantity: 2 },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([mockExistingOrder])),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([mockUpdatedOrder])),
          })),
        })
        .mockReturnValue({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockOrderItems)),
          })),
        });

      const result = await Order.findByIdAndUpdate(1, updateData);

      expect(result).toBeDefined();
      expect(result._id).toBe(1);
      expect(result.customerName).toBe('Updated Name');
      expect(result.status).toBe('completed');
    });

    it('should return null for invalid ID', async () => {
      const result = await Order.findByIdAndUpdate('invalid', { status: 'completed' });

      expect(result).toBeNull();
    });

    it('should return null when order not found', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await Order.findByIdAndUpdate(999, { status: 'completed' });

      expect(result).toBeNull();
    });

    it('should update order items when provided', async () => {
      const updateData = {
        items: [
          { item: 2, name: 'New Item', price: 75.0, quantity: 1 },
        ],
      };

      const mockExistingOrder = {
        id: 1,
        orderId: 'ORD123456',
      };

      const mockUpdatedOrder = {
        id: 1,
        orderId: 'ORD123456',
        customerName: 'Test',
        customerId: 'CUST001',
        totalPrice: '75.00',
        createdAt: new Date(),
      };

      const mockNewOrderItems = [
        { id: 2, orderId: 1, itemId: 2, name: 'New Item', price: '75.00', quantity: 1 },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([mockExistingOrder])),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([mockUpdatedOrder])),
          })),
        })
        .mockReturnValue({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockNewOrderItems)),
          })),
        });

      mockDelete.mockResolvedValue([]);
      mockInsert.mockResolvedValue(mockNewOrderItems);

      const result = await Order.findByIdAndUpdate(1, updateData);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('New Item');
    });
  });

  describe('orderDate handling', () => {
    it('should use current date when orderDate is not provided', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Test User',
        customerId: 'CUST999',
        totalPrice: 100.0,
        items: [
          { item: 1, name: 'Item 1', price: 100.0, quantity: 1 },
        ],
        // orderDate is not provided
      };

      const mockCreatedOrder = {
        id: 100,
        orderId: 'ORD999999',
        orderFrom: 'Website',
        customerName: 'Test User',
        customerId: 'CUST999',
        totalPrice: '100.00',
        paidAmount: '0.00',
        paymentStatus: 'unpaid',
        confirmationStatus: 'unconfirmed',
        priority: 0,
        orderDate: new Date(), // Should be set to current date
        expectedDeliveryDate: null,
        createdAt: new Date(),
      };

      const mockCreatedItems = [
        { id: 100, orderId: 100, itemId: 1, name: 'Item 1', price: '100.00', quantity: 1 },
      ];

      mockDb.insert = jest.fn()
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockCreatedOrder])),
          })),
        })
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve(mockCreatedItems)),
          })),
        });

      const result = await Order.create(orderData);

      expect(result).toBeDefined();
      expect(result.orderDate).toBeDefined();
      expect(result.orderDate).not.toBeNull();
    });

    it('should use provided orderDate when specified', async () => {
      const specificDate = new Date('2024-01-15');
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Test User',
        customerId: 'CUST998',
        totalPrice: 100.0,
        items: [
          { item: 1, name: 'Item 1', price: 100.0, quantity: 1 },
        ],
        orderDate: specificDate,
      };

      const mockCreatedOrder = {
        id: 101,
        orderId: 'ORD999998',
        orderFrom: 'Website',
        customerName: 'Test User',
        customerId: 'CUST998',
        totalPrice: '100.00',
        paidAmount: '0.00',
        paymentStatus: 'unpaid',
        confirmationStatus: 'unconfirmed',
        priority: 0,
        orderDate: specificDate,
        expectedDeliveryDate: null,
        createdAt: new Date(),
      };

      const mockCreatedItems = [
        { id: 101, orderId: 101, itemId: 1, name: 'Item 1', price: '100.00', quantity: 1 },
      ];

      mockDb.insert = jest.fn()
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockCreatedOrder])),
          })),
        })
        .mockReturnValueOnce({
          values: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve(mockCreatedItems)),
          })),
        });

      const result = await Order.create(orderData);

      expect(result).toBeDefined();
      expect(result.orderDate).toBeDefined();
      // Compare ISO strings to avoid timezone issues
      expect(new Date(result.orderDate).toISOString()).toBe(specificDate.toISOString());
    });
  });

  describe('findPriorityOrders', () => {
    it('should return priority orders sorted by urgency', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const mockOrders = [
        {
          id: 1,
          orderId: 'ORD-001',
          orderFrom: 'instagram',
          customerName: 'Priority Customer',
          customerId: 'CUST-001',
          address: '123 Main St',
          totalPrice: '100.00',
          status: 'pending',
          paymentStatus: 'unpaid',
          paidAmount: '0',
          confirmationStatus: 'confirmed',
          customerNotes: '',
          priority: 8,
          orderDate: now,
          expectedDeliveryDate: tomorrow,
          deliveryStatus: 'not_shipped',
          trackingId: '',
          deliveryPartner: '',
          actualDeliveryDate: null,
          createdAt: now,
        },
      ];

      const mockItems = [
        {
          id: 1,
          orderId: 1,
          itemId: 1,
          name: 'Test Item',
          price: '100.00',
          quantity: 1,
          customizationRequest: '',
        },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => Promise.resolve(mockOrders)),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockItems)),
          })),
        });

      const result = await Order.findPriorityOrders();

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('ORD-001');
      expect(result[0].priority).toBe(8);
    });

    it('should return empty array when no priority orders exist', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Order.findPriorityOrders();

      expect(result).toEqual([]);
    });

    it('should include orders with delivery dates in the past', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const mockOrders = [
        {
          id: 2,
          orderId: 'ORD-002',
          orderFrom: 'facebook',
          customerName: 'Overdue Customer',
          customerId: 'CUST-002',
          address: '456 Oak Ave',
          totalPrice: '200.00',
          status: 'processing',
          paymentStatus: 'paid',
          paidAmount: '200.00',
          confirmationStatus: 'confirmed',
          customerNotes: '',
          priority: 5,
          orderDate: yesterday,
          expectedDeliveryDate: yesterday,
          deliveryStatus: 'shipped',
          trackingId: 'TRK-123',
          deliveryPartner: 'FedEx',
          actualDeliveryDate: null,
          createdAt: yesterday,
        },
      ];

      const mockItems = [
        {
          id: 2,
          orderId: 2,
          itemId: 2,
          name: 'Overdue Item',
          price: '200.00',
          quantity: 1,
          customizationRequest: 'Rush order',
        },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => Promise.resolve(mockOrders)),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockItems)),
          })),
        });

      const result = await Order.findPriorityOrders();

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('ORD-002');
    });
  });
});
