const request = require('supertest');
const express = require('express');
const itemRoutes = require('../../routes/items');
const Item = require('../../models/Item');

// Mock dependencies
jest.mock('../../models/Item');
jest.mock('@vercel/blob');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { put, del } = require('@vercel/blob');

const app = express();
app.use(express.json());
app.use('/api/items', itemRoutes);

describe('Items Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return all items without pagination', async () => {
      const mockItems = [
        { _id: 1, name: 'Item 1', price: 10.0 },
        { _id: 2, name: 'Item 2', price: 20.0 },
      ];

      Item.find.mockResolvedValue(mockItems);

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Item 1');
    });

    it('should return paginated items when pagination params provided', async () => {
      const mockResult = {
        items: [{ _id: 1, name: 'Item 1', price: 10.0 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      Item.findPaginated.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/items?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.items).toHaveLength(1);
    });

    it('should handle search query', async () => {
      const mockResult = {
        items: [{ _id: 1, name: 'Search Item', price: 10.0 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      Item.findPaginated.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/items?page=1&search=Search');

      expect(response.status).toBe(200);
      expect(Item.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'Search' });
    });

    it('should handle database errors', async () => {
      Item.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to fetch items');
    });
  });

  describe('GET /api/items/deleted', () => {
    it('should return deleted items', async () => {
      const mockResult = {
        items: [{ _id: 1, name: 'Deleted Item', price: 10.0, deletedAt: new Date() }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      Item.findDeletedPaginated.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/items/deleted?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1);
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const itemData = {
        name: 'New Item',
        price: 25.99,
        color: 'Blue',
        fabric: 'Cotton',
      };

      const mockCreatedItem = { _id: 1, ...itemData };
      Item.create.mockResolvedValue(mockCreatedItem);

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id', 1);
      expect(response.body.name).toBe('New Item');
    });

    it('should return 400 when name is missing', async () => {
      const itemData = { price: 25.99 };

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Item name is required');
    });

    it('should return 400 when name is empty', async () => {
      const itemData = { name: '   ', price: 25.99 };

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Item name is required');
    });

    it('should return 400 when price is invalid', async () => {
      const itemData = { name: 'Test Item', price: -10 };

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Valid price is required');
    });

    it('should return 400 when price is missing', async () => {
      const itemData = { name: 'Test Item' };

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Valid price is required');
    });

    it('should upload image when provided', async () => {
      const itemData = {
        name: 'Item with Image',
        price: 30.0,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const mockBlobUrl = 'https://blob.vercel-storage.com/test-image.png';
      put.mockResolvedValue({ url: mockBlobUrl });

      const mockCreatedItem = { _id: 1, name: 'Item with Image', price: 30.0, imageUrl: mockBlobUrl };
      Item.create.mockResolvedValue(mockCreatedItem);

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(201);
      expect(put).toHaveBeenCalled();
      expect(response.body.imageUrl).toBe(mockBlobUrl);
    });

    it('should return 400 when image upload fails', async () => {
      const itemData = {
        name: 'Item with Image',
        price: 30.0,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      put.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Upload failed');
    });

    it('should return 500 on database error', async () => {
      const itemData = { name: 'Test Item', price: 25.99 };
      Item.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/api/items').send(itemData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to create item');
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an item', async () => {
      const updateData = { name: 'Updated Item', price: 35.0 };
      const mockExistingItem = { _id: 1, name: 'Old Item', price: 25.0, imageUrl: '' };
      const mockUpdatedItem = { _id: 1, name: 'Updated Item', price: 35.0, imageUrl: '' };

      Item.findById.mockResolvedValue(mockExistingItem);
      Item.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);

      const response = await request(app).put('/api/items/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Item');
      expect(response.body.price).toBe(35.0);
    });

    it('should return 400 when name is empty', async () => {
      const updateData = { name: '   ' };

      const response = await request(app).put('/api/items/1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Item name cannot be empty');
    });

    it('should return 400 when price is invalid', async () => {
      const updateData = { price: -10 };

      const response = await request(app).put('/api/items/1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Valid price is required');
    });

    it('should return 404 when item not found', async () => {
      const updateData = { name: 'Updated Item' };
      Item.findById.mockResolvedValue(null);

      const response = await request(app).put('/api/items/999').send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Item not found');
    });

    it('should update image when new image provided', async () => {
      const updateData = {
        name: 'Updated Item',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const mockExistingItem = { _id: 1, name: 'Old Item', price: 25.0, imageUrl: 'old-url' };
      const mockNewBlobUrl = 'https://blob.vercel-storage.com/new-image.png';

      Item.findById.mockResolvedValue(mockExistingItem);
      put.mockResolvedValue({ url: mockNewBlobUrl });
      
      const mockUpdatedItem = { _id: 1, name: 'Updated Item', price: 25.0, imageUrl: mockNewBlobUrl };
      Item.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);

      del.mockResolvedValue();

      const response = await request(app).put('/api/items/1').send(updateData);

      expect(response.status).toBe(200);
      expect(put).toHaveBeenCalled();
      expect(del).toHaveBeenCalledWith('old-url');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should soft delete an item', async () => {
      const mockDeletedItem = { _id: 1, name: 'Deleted Item', deletedAt: new Date() };
      Item.findByIdAndDelete.mockResolvedValue(mockDeletedItem);

      const response = await request(app).delete('/api/items/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Item deleted');
    });

    it('should return 404 when item not found', async () => {
      Item.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete('/api/items/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Item not found');
    });
  });

  describe('POST /api/items/:id/restore', () => {
    it('should restore a soft-deleted item', async () => {
      const mockRestoredItem = { _id: 1, name: 'Restored Item', deletedAt: null };
      Item.restore.mockResolvedValue(mockRestoredItem);

      const response = await request(app).post('/api/items/1/restore');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', 1);
    });

    it('should return 404 when item not found', async () => {
      Item.restore.mockResolvedValue(null);

      const response = await request(app).post('/api/items/999/restore');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Item not found');
    });
  });

  describe('DELETE /api/items/:id/permanent', () => {
    it('should permanently remove item image', async () => {
      const mockItem = {
        _id: 1,
        name: 'Item',
        imageUrl: 'https://blob.vercel-storage.com/image.png',
        deletedAt: new Date(),
      };

      Item.findById.mockResolvedValue(mockItem);
      Item.permanentlyRemoveImage.mockResolvedValue({ _id: 1, imageUrl: null });
      del.mockResolvedValue();

      const response = await request(app).delete('/api/items/1/permanent');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Item image permanently removed');
      expect(del).toHaveBeenCalledWith(mockItem.imageUrl);
    });

    it('should return 404 when item not found', async () => {
      Item.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/items/999/permanent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Item not found');
    });

    it('should return 400 when item is not soft-deleted', async () => {
      const mockItem = { _id: 1, name: 'Item', deletedAt: null };
      Item.findById.mockResolvedValue(mockItem);

      const response = await request(app).delete('/api/items/1/permanent');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Item must be soft-deleted before permanent image removal');
    });
  });
});
