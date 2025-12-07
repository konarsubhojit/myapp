const Order = require('../../models/Order');

// Mock the database connection
jest.mock('../../db/connection', () => ({
  getDatabase: jest.fn(),
}));

const { getDatabase } = require('../../db/connection');

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

  describe('findPaginated', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'ORD123456',
          customerName: 'John Doe',
          totalPrice: '100.00',
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
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});
