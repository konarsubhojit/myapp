import { jest } from '@jest/globals';

// Mock the database connection
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn(),
}));

const { getDatabase } = await import('../../db/connection.js');
const { default: Item } = await import('../../models/Item.js');

describe('Item Model', () => {
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
          where: jest.fn(() => ({
            orderBy: jest.fn(() => mockSelect),
            limit: jest.fn(() => ({ offset: jest.fn(() => mockSelect) })),
          })),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({ offset: jest.fn(() => mockSelect) })),
          })),
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
      delete: jest.fn(() => mockDelete),
    };

    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    it('should return all non-deleted items ordered by creation date', async () => {
      const mockItems = [
        { id: 1, name: 'Item 1', price: '10.00', createdAt: new Date(), deletedAt: null },
        { id: 2, name: 'Item 2', price: '20.00', createdAt: new Date(), deletedAt: null },
      ];
      
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve(mockItems)),
          })),
        })),
      }));

      const result = await Item.find();

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe(1);
      expect(result[0].price).toBe(10);
      expect(result[1]._id).toBe(2);
      expect(result[1].price).toBe(20);
    });

    it('should handle empty result', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.find();

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return item by ID', async () => {
      const mockItem = { id: 1, name: 'Test Item', price: '15.50', createdAt: new Date() };
      
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockItem])),
        })),
      }));

      const result = await Item.findById(1);

      expect(result).toBeDefined();
      expect(result._id).toBe(1);
      expect(result.name).toBe('Test Item');
      expect(result.price).toBe(15.5);
    });

    it('should return null for invalid ID', async () => {
      const result = await Item.findById('invalid');

      expect(result).toBeNull();
    });

    it('should return null when item not found', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await Item.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new item', async () => {
      const itemData = {
        name: 'New Item',
        price: 25.99,
        color: 'Blue',
        fabric: 'Cotton',
        specialFeatures: 'Waterproof',
        imageUrl: 'https://example.com/image.jpg',
      };

      const mockCreatedItem = {
        id: 1,
        name: 'New Item',
        price: '25.99',
        color: 'Blue',
        fabric: 'Cotton',
        specialFeatures: 'Waterproof',
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date(),
      };

      mockDb.insert = jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([mockCreatedItem])),
        })),
      }));

      const result = await Item.create(itemData);

      expect(result).toBeDefined();
      expect(result._id).toBe(1);
      expect(result.name).toBe('New Item');
      expect(result.price).toBe(25.99);
    });

    it('should create item with null optional fields', async () => {
      const itemData = {
        name: 'Basic Item',
        price: 10.0,
      };

      const mockCreatedItem = {
        id: 2,
        name: 'Basic Item',
        price: '10.00',
        color: null,
        fabric: null,
        specialFeatures: null,
        imageUrl: null,
        createdAt: new Date(),
      };

      mockDb.insert = jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([mockCreatedItem])),
        })),
      }));

      const result = await Item.create(itemData);

      expect(result).toBeDefined();
      expect(result._id).toBe(2);
      expect(result.color).toBe('');
      expect(result.fabric).toBe('');
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update an item', async () => {
      const updateData = { name: 'Updated Item', price: 30.0 };
      const mockUpdatedItem = {
        id: 1,
        name: 'Updated Item',
        price: '30.00',
        createdAt: new Date(),
      };

      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockUpdatedItem])),
          })),
        })),
      }));

      const result = await Item.findByIdAndUpdate(1, updateData);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result._id).toBe(1);
        expect(result.name).toBe('Updated Item');
        expect(result.price).toBe(30);
      }
    });

    it('should return null for invalid ID', async () => {
      const result = await Item.findByIdAndUpdate('invalid', { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return null when item not found', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.findByIdAndUpdate(999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return item unchanged when no update data provided', async () => {
      const mockItem = { id: 1, name: 'Test Item', price: '10.00' };
      
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockItem])),
        })),
      }));

      const result = await Item.findByIdAndUpdate(1, {});

      expect(result).toBeDefined();
      if (result) {
        expect(result._id).toBe(1);
      }
    });
  });

  describe('findByIdAndDelete', () => {
    it('should soft delete an item', async () => {
      const mockDeletedItem = {
        id: 1,
        name: 'Deleted Item',
        price: '10.00',
        deletedAt: new Date(),
      };

      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockDeletedItem])),
          })),
        })),
      }));

      const result = await Item.findByIdAndDelete(1);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result._id).toBe(1);
        expect(result.deletedAt).toBeDefined();
      }
    });

    it('should return null for invalid ID', async () => {
      const result = await Item.findByIdAndDelete('invalid');

      expect(result).toBeNull();
    });

    it('should return null when item not found', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.findByIdAndDelete(999);

      expect(result).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted item', async () => {
      const mockRestoredItem = {
        id: 1,
        name: 'Restored Item',
        price: '10.00',
        deletedAt: null,
      };

      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockRestoredItem])),
          })),
        })),
      }));

      const result = await Item.restore(1);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result._id).toBe(1);
        expect(result.deletedAt).toBeNull();
      }
    });

    it('should return null when item not found', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.restore(999);

      expect(result).toBeNull();
    });
  });

  describe('findPaginated', () => {
    it('should return paginated items', async () => {
      const mockItems = [
        { id: 1, name: 'Item 1', price: '10.00', createdAt: new Date() },
        { id: 2, name: 'Item 2', price: '20.00', createdAt: new Date() },
      ];

      // Mock count query
      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([{ count: '10' }])),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(() => Promise.resolve(mockItems)),
                })),
              })),
            })),
          })),
        });

      const result = await Item.findPaginated({ page: 1, limit: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('pagination');
      expect(result.items).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should support search functionality', async () => {
      const mockItems = [{ id: 1, name: 'Searched Item', price: '10.00' }];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve([{ count: '1' }])),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(() => Promise.resolve(mockItems)),
                })),
              })),
            })),
          })),
        });

      const result = await Item.findPaginated({ page: 1, limit: 10, search: 'Searched' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Searched Item');
    });
  });

  describe('permanentlyRemoveImage', () => {
    it('should remove image URL from item', async () => {
      const mockItem = {
        id: 1,
        name: 'Item',
        price: '10.00',
        imageUrl: null,
      };

      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([mockItem])),
          })),
        })),
      }));

      const result = await Item.permanentlyRemoveImage(1);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.imageUrl).toBe('');
      }
    });

    it('should return null when item not found', async () => {
      mockDb.update = jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.permanentlyRemoveImage(999);

      expect(result).toBeNull();
    });
  });

  describe('findDeleted', () => {
    it('should return all deleted items', async () => {
      const mockItems = [
        {
          id: 1,
          name: 'Deleted Item 1',
          price: '50.00',
          color: 'Red',
          fabric: 'Cotton',
          special_features: 'Vintage',
          image_url: 'http://example.com/deleted.jpg',
          created_at: new Date('2024-01-01'),
          deleted_at: new Date('2024-01-15'),
        },
        {
          id: 2,
          name: 'Deleted Item 2',
          price: '75.00',
          color: null,
          fabric: null,
          special_features: null,
          image_url: null,
          created_at: new Date('2024-01-02'),
          deleted_at: new Date('2024-01-16'),
        },
      ];

      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve(mockItems)),
          })),
        })),
      }));

      const result = await Item.findDeleted();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('Deleted Item 1');
      expect(result[0].deleted_at).toEqual(mockItems[0].deleted_at);
      expect(result[1].id).toBe(2);
      expect(result[1].name).toBe('Deleted Item 2');
    });

    it('should return empty array when no deleted items exist', async () => {
      mockDb.select = jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      const result = await Item.findDeleted();

      expect(result).toEqual([]);
    });
  });

  describe('findDeletedPaginated', () => {
    it('should return paginated deleted items', async () => {
      const mockCountResult = [{ count: '5' }];
      const mockItems = [
        {
          id: 1,
          name: 'Deleted Item 1',
          price: '50.00',
          color: null,
          fabric: null,
          special_features: null,
          image_url: null,
          created_at: new Date(),
          deleted_at: new Date(),
        },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockCountResult)),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(() => Promise.resolve(mockItems)),
                })),
              })),
            })),
          })),
        });

      const result = await Item.findDeletedPaginated({ page: 1, limit: 10, search: '' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Deleted Item 1');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
      });
    });

    it('should support search in deleted items', async () => {
      const mockCountResult = [{ count: '1' }];
      const mockItems = [
        {
          id: 1,
          name: 'Special Deleted Item',
          price: '100.00',
          color: null,
          fabric: null,
          special_features: null,
          image_url: null,
          created_at: new Date(),
          deleted_at: new Date(),
        },
      ];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(mockCountResult)),
          })),
        })
        .mockReturnValueOnce({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(() => Promise.resolve(mockItems)),
                })),
              })),
            })),
          })),
        });

      const result = await Item.findDeletedPaginated({ page: 1, limit: 10, search: 'Special' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Special Deleted Item');
    });
  });
});
