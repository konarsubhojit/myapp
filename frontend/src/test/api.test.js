import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItems,
  getItemsPaginated,
  getDeletedItems,
  createItem,
  updateItem,
  deleteItem,
  restoreItem,
  permanentlyDeleteItem,
  getOrders,
  getOrdersPaginated,
  getPriorityOrders,
  getOrder,
  createOrder,
  updateOrder,
  getFeedbacks,
  getFeedbacksPaginated,
  getFeedbackStats,
  getFeedback,
  getFeedbackByOrderId,
  createFeedback,
  updateFeedback,
  generateFeedbackToken,
  setAccessTokenGetter,
  setGuestModeChecker,
  setOnUnauthorizedCallback,
} from '../services/api';

describe('API Service', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    // Reset the access token getter
    setAccessTokenGetter(null);
    setGuestModeChecker(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Items API', () => {
    describe('getItems', () => {
      it('should fetch all items', async () => {
        const mockItems = [
          { _id: 1, name: 'Item 1', price: 10 },
          { _id: 2, name: 'Item 2', price: 20 },
        ];

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        });

        const result = await getItems();

        expect(result).toEqual(mockItems);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should throw error on failed fetch', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
        });

        await expect(getItems()).rejects.toThrow('Failed to fetch items');
      });

      it('should handle cursor-paginated response from backend', async () => {
        const mockItems = [
          { _id: 1, name: 'Item 1', price: 10 },
          { _id: 2, name: 'Item 2', price: 20 },
        ];
        const mockCursorResponse = {
          items: mockItems,
          page: {
            limit: 10,
            nextCursor: null,
            hasMore: false,
          },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockCursorResponse,
        });

        const result = await getItems();

        expect(result).toEqual(mockItems);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('getItemsPaginated', () => {
      it('should fetch paginated items', async () => {
        const mockResult = {
          items: [{ _id: 1, name: 'Item 1' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult,
        });

        const result = await getItemsPaginated({ page: 1, limit: 10 });

        expect(result).toEqual(mockResult);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should include search param when provided', async () => {
        const mockResult = {
          items: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult,
        });

        await getItemsPaginated({ page: 1, limit: 10, search: 'test' });

        const callUrl = global.fetch.mock.calls[0][0];
        expect(callUrl).toContain('search=test');
      });
    });

    describe('getDeletedItems', () => {
      it('should fetch deleted items', async () => {
        const mockResult = {
          items: [{ _id: 1, name: 'Deleted Item', deletedAt: new Date() }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult,
        });

        const result = await getDeletedItems({ page: 1, limit: 10 });

        expect(result).toEqual(mockResult);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('createItem', () => {
      it('should create a new item', async () => {
        const newItem = { name: 'New Item', price: 25 };
        const createdItem = { _id: 1, ...newItem };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createdItem,
        });

        const result = await createItem(newItem);

        expect(result).toEqual(createdItem);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/items'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should throw error on failed create', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Item name is required' }),
        });

        await expect(createItem({})).rejects.toThrow('Item name is required');
      });
    });

    describe('updateItem', () => {
      it('should update an item', async () => {
        const updatedItem = { _id: 1, name: 'Updated Item', price: 30 };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedItem,
        });

        const result = await updateItem(1, { name: 'Updated Item', price: 30 });

        expect(result).toEqual(updatedItem);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('deleteItem', () => {
      it('should soft delete an item', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Item deleted' }),
        });

        const result = await deleteItem(1);

        expect(result).toEqual({ message: 'Item deleted' });
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('restoreItem', () => {
      it('should restore a deleted item', async () => {
        const restoredItem = { _id: 1, name: 'Restored Item' };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => restoredItem,
        });

        const result = await restoreItem(1);

        expect(result).toEqual(restoredItem);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/items/1/restore'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('permanentlyDeleteItem', () => {
      it('should permanently delete an item', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Item image permanently removed' }),
        });

        const result = await permanentlyDeleteItem(1);

        expect(result).toEqual({ message: 'Item image permanently removed' });
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/items/1/permanent'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Orders API', () => {
    describe('getOrders', () => {
      it('should fetch all orders', async () => {
        const mockOrders = [
          { _id: 1, orderId: 'ORD123', customerName: 'John Doe' },
        ];

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrders,
        });

        const result = await getOrders();

        expect(result).toEqual(mockOrders);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should throw error on failed fetch', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
        });

        await expect(getOrders()).rejects.toThrow('Failed to fetch orders');
      });
    });

    describe('getOrdersPaginated', () => {
      it('should fetch paginated orders', async () => {
        const mockResult = {
          orders: [{ _id: 1, orderId: 'ORD123' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult,
        });

        const result = await getOrdersPaginated({ page: 1, limit: 10 });

        expect(result).toEqual(mockResult);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('getOrder', () => {
      it('should fetch a single order', async () => {
        const mockOrder = { _id: 1, orderId: 'ORD123', customerName: 'John Doe' };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrder,
        });

        const result = await getOrder(1);

        expect(result).toEqual(mockOrder);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/orders/1'),
          expect.anything()
        );
      });
    });

    describe('createOrder', () => {
      it('should create a new order', async () => {
        const newOrder = {
          orderFrom: 'Website',
          customerName: 'Jane Doe',
          customerId: 'CUST001',
          items: [{ itemId: 1, quantity: 2 }],
        };
        const createdOrder = { _id: 1, orderId: 'ORD456', ...newOrder };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createdOrder,
        });

        const result = await createOrder(newOrder);

        expect(result).toEqual(createdOrder);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/orders'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('updateOrder', () => {
      it('should update an order', async () => {
        const updatedOrder = { _id: 1, orderId: 'ORD123', status: 'completed' };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedOrder,
        });

        const result = await updateOrder(1, { status: 'completed' });

        expect(result).toEqual(updatedOrder);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/orders/1'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });
  });

  describe('Authentication', () => {
    it('should include Authorization header when token is available', async () => {
      const mockToken = 'test-token-123';
      setAccessTokenGetter(async () => mockToken);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getItems();

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should call unauthorized callback on 401 response', async () => {
      const onUnauthorized = vi.fn();
      setOnUnauthorizedCallback(onUnauthorized);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(getItems()).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('Feedbacks API', () => {
    describe('getFeedbacks', () => {
      it('should fetch all feedbacks', async () => {
        const mockFeedbacks = [
          { _id: 1, orderId: 123, rating: 5, comment: 'Great!' },
          { _id: 2, orderId: 124, rating: 4, comment: 'Good' },
        ];

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockFeedbacks,
        });

        const result = await getFeedbacks();

        expect(result).toEqual(mockFeedbacks);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should throw error on failed fetch', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
        });

        await expect(getFeedbacks()).rejects.toThrow('Failed to fetch feedbacks');
      });
    });

    describe('getFeedbacksPaginated', () => {
      it('should fetch paginated feedbacks', async () => {
        const mockResult = {
          feedbacks: [{ _id: 1, orderId: 123, rating: 5 }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult,
        });

        const result = await getFeedbacksPaginated({ page: 1, limit: 10 });

        expect(result).toEqual(mockResult);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('getFeedbackStats', () => {
      it('should fetch feedback statistics', async () => {
        const mockStats = {
          avgRating: '4.5',
          avgProductQuality: '4.7',
          avgDeliveryExperience: '4.3',
          totalFeedbacks: 10,
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

        const result = await getFeedbackStats();

        expect(result).toEqual(mockStats);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('getFeedback', () => {
      it('should fetch a specific feedback', async () => {
        const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockFeedback,
        });

        const result = await getFeedback(1);

        expect(result).toEqual(mockFeedback);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('getFeedbackByOrderId', () => {
      it('should fetch feedback by order ID', async () => {
        const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockFeedback,
        });

        const result = await getFeedbackByOrderId(123);

        expect(result).toEqual(mockFeedback);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should return null for 404 response', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        const result = await getFeedbackByOrderId(999);

        expect(result).toBeNull();
      });

      it('should throw error for non-404 failures', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        await expect(getFeedbackByOrderId(123)).rejects.toThrow();
      });
    });

    describe('createFeedback', () => {
      it('should create a new feedback', async () => {
        const newFeedback = { orderId: 123, rating: 5, comment: 'Excellent!' };
        const createdFeedback = { _id: 1, ...newFeedback };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createdFeedback,
        });

        const result = await createFeedback(newFeedback);

        expect(result).toEqual(createdFeedback);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/feedbacks'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should throw error on failed create', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Rating is required' }),
        });

        await expect(createFeedback({})).rejects.toThrow('Rating is required');
      });
    });

    describe('updateFeedback', () => {
      it('should update a feedback', async () => {
        const updatedFeedback = { _id: 1, orderId: 123, rating: 4, comment: 'Updated' };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedFeedback,
        });

        const result = await updateFeedback(1, { rating: 4, comment: 'Updated' });

        expect(result).toEqual(updatedFeedback);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/feedbacks/1'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('generateFeedbackToken', () => {
      it('should generate feedback token for order', async () => {
        const mockResponse = {
          token: 'abc123',
          orderId: 123,
          expiresAt: '2025-02-15T00:00:00Z',
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await generateFeedbackToken(123);

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/feedbacks/generate-token/123'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should throw error on failed generation', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Order not found' }),
        });

        await expect(generateFeedbackToken(999)).rejects.toThrow('Order not found');
      });
    });
  });

  describe('Priority Orders API', () => {
    it('should fetch priority orders', async () => {
      const mockPriorityOrders = [
        { _id: 1, orderId: 'ORD-001', priority: 'high' },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPriorityOrders,
      });

      const result = await getPriorityOrders();

      expect(result).toEqual(mockPriorityOrders);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Guest Mode', () => {
    it('should return dummy data in guest mode', async () => {
      setGuestModeChecker(() => true);

      const result = await getItems();

      // Should return dummy items, not empty array
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('price');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return cursor-paginated structure with dummy data in guest mode', async () => {
      setGuestModeChecker(() => true);

      const result = await getItemsPaginated();

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('page');
      // Should return dummy items in cursor-paginated structure
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.page).toHaveProperty('limit');
      expect(result.page).toHaveProperty('nextCursor');
      expect(result.page).toHaveProperty('hasMore');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
