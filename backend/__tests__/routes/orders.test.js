import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../models/Order', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    findPaginated: jest.fn(),
    findPriorityOrders: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/Item', () => ({
  default: {
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { default: orderRoutes } = await import('../../routes/orders.js');
const { default: Order } = await import('../../models/Order.js');
const { default: Item } = await import('../../models/Item.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler); // Add global error handler

describe('Orders Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should return llls without paoin', async ()
      const mockO= 
        _id: 1,
          derId: 'ORD123456',
          stomerName: 'John Doe',
          talPrice: 100.0,
          ems: [],
        },
      ];

      const response = await request(app).get('/api/orders');
Ordr
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].orderId).toBe('ORD123456');
    });

        orders: [e: 100.0 },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      Order.findPaginated.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/orders?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle database errors', async () => {
      Order.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Database error');
    });
  });

  describe('POST /api/orders', () => {
    beforeEach(() => {
      Item.findById.mockResolvedValue({
        _id: 1,
        name: 'Test Item',
        price: 50.0,
      });
    });

    it('should create a new order', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 2 }],
      };

      const mockCreatedOrder = {
        _id: 1,
        orderId: 'ORD654321',
        ...orderData,
        totalPrice: 100.0,
        items: [{ item: 1, name: 'Test Item', price: 50.0, quantity: 2 }],
      };

      Order.create.mockResolvedValue(mockCreatedOrder);

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId', 'ORD654321');
      expect(response.body.totalPrice).toBe(100.0);
    });

    it('should return 400 when orderFrom is missing', async () => {
      const orderData = {
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 2 }],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Order source, customer name, and customer ID are required');
    });

    it('should return 400 when customerName is missing', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 2 }],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Order source, customer name, and customer ID are required');
    });

    it('should return 400 when items array is empty', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one item is required');
    });

    it('should return 400 when item not found', async () => {
      Item.findById.mockResolvedValue(null);

      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 999, quantity: 1 }],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Item with id 999 not found');
    });

    it('should return 400 when quantity is invalid', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 0 }],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Quantity must be a positive integer');
    });

    it('should return 400 when expected delivery date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
        expectedDeliveryDate: pastDate.toISOString(),
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Expected delivery date cannot be in the past');
    });

    it('should return 400 when paid amount exceeds total price', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
        paidAmount: 100,
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Paid amount cannot exceed total price');
    });

    it('should return 400 for invalid payment status', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
        paymentStatus: 'invalid_status',
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid payment status');
    });

    it('should return 400 when priority is out of range', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
        priority: 100,
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Priority must be a number');
    });

    it('should return 400 when customer notes exceed max length', async () => {
      const longNotes = 'a'.repeat(5001);
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
        customerNotes: longNotes,
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Customer notes cannot exceed');
    });

    it('should handle database errors', async () => {
      const orderData = {
        orderFrom: 'Website',
        customerName: 'Jane Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 1 }],
      };

      Order.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Database error');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order by ID', async () => {
      const mockOrder = {
        _id: 1,
        orderId: 'ORD123456',
        customerName: 'John Doe',
        totalPrice: 100.0,
        items: [],
      };

      Order.findById.mockResolvedValue(mockOrder);

      const response = await request(app).get('/api/orders/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orderId', 'ORD123456');
    });

    it('should return 404 when order not found', async () => {
      Order.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/orders/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Order not found');
    });

    it('should handle database errors', async () => {
      Order.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/orders/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Database error');
    });
  });

  describe('PUT /api/orders/:id', () => {
    beforeEach(() => {
      Order.findById.mockResolvedValue({
        _id: 1,
        orderId: 'ORD123456',
        totalPrice: 100.0,
      });

      Item.findById.mockResolvedValue({
        _id: 1,
        name: 'Test Item',
        price: 50.0,
      });
    });

    it('should update an order', async () => {
      const updateData = {
        customerName: 'Updated Name',
        status: 'completed',
      };

      const mockUpdatedOrder = {
        _id: 1,
        orderId: 'ORD123456',
        customerName: 'Updated Name',
        status: 'completed',
        totalPrice: 100.0,
      };

      Order.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.customerName).toBe('Updated Name');
      expect(response.body.status).toBe('completed');
    });

    it('should return 400 when customerName is empty', async () => {
      const updateData = { customerName: '   ' };

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Customer name cannot be empty');
    });

    it('should return 400 for invalid status', async () => {
      const updateData = { status: 'invalid_status' };

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should return 404 when order not found for paid amount validation', async () => {
      Order.findById.mockResolvedValue(null);

      const updateData = { paidAmount: 50 };

      const response = await request(app).put('/api/orders/999').send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Order not found');
    });

    it('should return 400 when paid amount exceeds total price', async () => {
      const updateData = { paidAmount: 200 };

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Paid amount cannot exceed total price');
    });

    it('should update order items', async () => {
      const updateData = {
        items: [{ itemId: 1, quantity: 3 }],
      };

      const mockUpdatedOrder = {
        _id: 1,
        orderId: 'ORD123456',
        totalPrice: 150.0,
        items: [{ item: 1, name: 'Test Item', price: 50.0, quantity: 3 }],
      };

      Order.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.totalPrice).toBe(150.0);
    });

    it('should return 404 when order not found during update', async () => {
      const updateData = { customerName: 'Updated Name' };
      Order.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app).put('/api/orders/999').send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Order not found');
    });

    it('should handle database errors', async () => {
      const updateData = { customerName: 'Updated Name' };
      Order.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Database error');
    });
  });

  describe('Delivery Tracking', () => {
    beforeEach(() => {
      Item.findById.mockResolvedValue({
        _id: 1,
        name: 'Test Item',
        price: 50.0,
      });
    });

    it('should create order with delivery tracking fields', async () => {
      const orderData = {
        orderFrom: 'instagram',
        customerName: 'John Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 2 }],
        deliveryStatus: 'not_shipped',
        trackingId: 'AWB123456789',
        deliveryPartner: 'Delhivery',
        actualDeliveryDate: null,
      };

      const mockCreatedOrder = {
        _id: 1,
        orderId: 'ORD123456',
        ...orderData,
        totalPrice: 100.0,
        deliveryStatus: 'not_shipped',
        trackingId: 'AWB123456789',
        deliveryPartner: 'Delhivery',
        actualDeliveryDate: null,
        items: [{ item: 1, name: 'Test Item', price: 50.0, quantity: 2 }],
      };

      Order.create.mockResolvedValue(mockCreatedOrder);

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.deliveryStatus).toBe('not_shipped');
      expect(response.body.trackingId).toBe('AWB123456789');
      expect(response.body.deliveryPartner).toBe('Delhivery');
    });

    it('should update order to mark as delivered', async () => {
      const updateData = {
        deliveryStatus: 'delivered',
        actualDeliveryDate: '2024-12-08',
      };

      const mockOrder = {
        _id: 1,
        orderId: 'ORD123456',
        totalPrice: 100.0,
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        deliveryStatus: 'delivered',
        actualDeliveryDate: '2024-12-08T00:00:00.000Z',
      };

      Order.findById.mockResolvedValue(mockOrder);
      Order.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.deliveryStatus).toBe('delivered');
      expect(response.body.actualDeliveryDate).toBeTruthy();
    });

    it('should update order with tracking information', async () => {
      const updateData = {
        deliveryStatus: 'shipped',
        trackingId: 'DTDC987654321',
        deliveryPartner: 'DTDC',
      };

      const mockOrder = {
        _id: 1,
        orderId: 'ORD123456',
        totalPrice: 100.0,
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        deliveryStatus: 'shipped',
        trackingId: 'DTDC987654321',
        deliveryPartner: 'DTDC',
      };

      Order.findById.mockResolvedValue(mockOrder);
      Order.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

      const response = await request(app).put('/api/orders/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.deliveryStatus).toBe('shipped');
      expect(response.body.trackingId).toBe('DTDC987654321');
      expect(response.body.deliveryPartner).toBe('DTDC');
    });

    it('should reject invalid delivery status', async () => {
      const orderData = {
        orderFrom: 'instagram',
        customerName: 'John Doe',
        customerId: 'CUST001',
        items: [{ itemId: 1, quantity: 2 }],
        deliveryStatus: 'invalid_status',
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid delivery status');
    });

    it('should accept all valid delivery statuses', async () => {
      const validStatuses = ['not_shipped', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned'];

      for (const status of validStatuses) {
        const orderData = {
          orderFrom: 'instagram',
          customerName: 'John Doe',
          customerId: 'CUST001',
          items: [{ itemId: 1, quantity: 2 }],
          deliveryStatus: status,
        };

        const mockCreatedOrder = {
          _id: 1,
          orderId: 'ORD123456',
          ...orderData,
          totalPrice: 100.0,
          items: [{ item: 1, name: 'Test Item', price: 50.0, quantity: 2 }],
        };

        Order.create.mockResolvedValue(mockCreatedOrder);

        const response = await request(app).post('/api/orders').send(orderData);

        expect(response.status).toBe(201);
        expect(response.body.deliveryStatus).toBe(status);
      }
    });

    it('should allow tracking from multiple delivery partners', async () => {
      const deliveryPartners = ['Delhivery', 'DTDC', 'Blue Dart', 'FedEx', 'DHL'];

      for (const partner of deliveryPartners) {
        const updateData = {
          deliveryPartner: partner,
          trackingId: `${partner}_12345`,
        };

        const mockOrder = {
          _id: 1,
          orderId: 'ORD123456',
          totalPrice: 100.0,
        };

        const mockUpdatedOrder = {
          ...mockOrder,
          deliveryPartner: partner,
          trackingId: `${partner}_12345`,
        };

        Order.findById.mockResolvedValue(mockOrder);
        Order.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

        const response = await request(app).put('/api/orders/1').send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.deliveryPartner).toBe(partner);
      }
    });
  });
});
