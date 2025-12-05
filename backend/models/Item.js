const { eq, desc, isNull, isNotNull, ilike, or, sql, and } = require('drizzle-orm');
const { getDatabase } = require('../db/connection');
const { items } = require('../db/schema');

/**
 * Item model with methods for database operations
 */
const Item = {
  /**
   * Get all active items (not soft-deleted) sorted by creation date (newest first)
   * @returns {Promise<Array>} Array of items
   */
  async find() {
    const db = getDatabase();
    const result = await db.select().from(items)
      .where(isNull(items.deletedAt))
      .orderBy(desc(items.createdAt));
    return result.map(item => ({
      ...item,
      _id: item.id,
      price: parseFloat(item.price),
      color: item.color || '',
      fabric: item.fabric || '',
      specialFeatures: item.specialFeatures || '',
      imageUrl: item.imageUrl || ''
    }));
  },

  /**
   * Find an item by ID
   * @param {number|string} id Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async findById(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const result = await db.select().from(items).where(eq(items.id, numericId));
    if (result.length === 0) return null;
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price),
      color: result[0].color || '',
      fabric: result[0].fabric || '',
      specialFeatures: result[0].specialFeatures || '',
      imageUrl: result[0].imageUrl || ''
    };
  },

  /**
   * Create a new item
   * @param {Object} data Item data (name, price, color, fabric, specialFeatures, imageUrl)
   * @returns {Promise<Object>} Created item
   */
  async create(data) {
    const db = getDatabase();
    const result = await db.insert(items).values({
      name: data.name.trim(),
      price: data.price.toString(),
      color: data.color?.trim() || null,
      fabric: data.fabric?.trim() || null,
      specialFeatures: data.specialFeatures?.trim() || null,
      imageUrl: data.imageUrl || null
    }).returning();
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price),
      color: result[0].color || '',
      fabric: result[0].fabric || '',
      specialFeatures: result[0].specialFeatures || '',
      imageUrl: result[0].imageUrl || ''
    };
  },

  /**
   * Soft delete an item by ID (sets deletedAt timestamp)
   * @param {number|string} id Item ID
   * @returns {Promise<Object|null>} Soft-deleted item or null if not found
   */
  async findByIdAndDelete(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const result = await db.update(items)
      .set({ deletedAt: new Date() })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price),
      color: result[0].color || '',
      fabric: result[0].fabric || '',
      specialFeatures: result[0].specialFeatures || '',
      imageUrl: result[0].imageUrl || ''
    };
  },

  /**
   * Get all soft-deleted items sorted by deletion date (newest first)
   * @returns {Promise<Array>} Array of deleted items
   */
  async findDeleted() {
    const db = getDatabase();
    const result = await db.select().from(items)
      .where(isNotNull(items.deletedAt))
      .orderBy(desc(items.deletedAt));
    return result.map(item => ({
      ...item,
      _id: item.id,
      price: parseFloat(item.price),
      color: item.color || '',
      fabric: item.fabric || '',
      specialFeatures: item.specialFeatures || '',
      imageUrl: item.imageUrl || ''
    }));
  },

  /**
   * Restore a soft-deleted item by ID (clears deletedAt timestamp)
   * @param {number|string} id Item ID
   * @returns {Promise<Object|null>} Restored item or null if not found
   */
  async restore(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const result = await db.update(items)
      .set({ deletedAt: null })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price),
      color: result[0].color || '',
      fabric: result[0].fabric || '',
      specialFeatures: result[0].specialFeatures || '',
      imageUrl: result[0].imageUrl || ''
    };
  },

  /**
   * Get active items with server-side pagination, filtering, and searching
   * @param {Object} options Options for pagination and filtering
   * @param {number} options.page Page number (1-based)
   * @param {number} options.limit Number of items per page
   * @param {string} options.search Search term for name, color, fabric
   * @returns {Promise<Object>} Paginated items with metadata
   */
  async findPaginated({ page = 1, limit = 10, search = '' }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    let whereCondition = isNull(items.deletedAt);
    
    // Add search condition if search term is provided using safe drizzle-orm operators
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const searchCondition = or(
        ilike(items.name, searchTerm),
        ilike(items.color, searchTerm),
        ilike(items.fabric, searchTerm),
        ilike(items.specialFeatures, searchTerm)
      );
      whereCondition = and(isNull(items.deletedAt), searchCondition);
    }
    
    // Get total count
    const countResult = await db.select({ count: sql`count(*)` })
      .from(items)
      .where(whereCondition);
    const total = parseInt(countResult[0].count, 10);
    
    // Get paginated items
    const result = await db.select()
      .from(items)
      .where(whereCondition)
      .orderBy(desc(items.createdAt))
      .limit(limit)
      .offset(offset);
    
    const itemsData = result.map(item => ({
      ...item,
      _id: item.id,
      price: parseFloat(item.price),
      color: item.color || '',
      fabric: item.fabric || '',
      specialFeatures: item.specialFeatures || '',
      imageUrl: item.imageUrl || ''
    }));
    
    return {
      items: itemsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Get deleted items with server-side pagination and searching
   * @param {Object} options Options for pagination
   * @param {number} options.page Page number (1-based)
   * @param {number} options.limit Number of items per page
   * @param {string} options.search Search term for name, color, fabric
   * @returns {Promise<Object>} Paginated deleted items with metadata
   */
  async findDeletedPaginated({ page = 1, limit = 10, search = '' }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    let whereCondition = isNotNull(items.deletedAt);
    
    // Add search condition if search term is provided using safe drizzle-orm operators
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const searchCondition = or(
        ilike(items.name, searchTerm),
        ilike(items.color, searchTerm),
        ilike(items.fabric, searchTerm),
        ilike(items.specialFeatures, searchTerm)
      );
      whereCondition = and(isNotNull(items.deletedAt), searchCondition);
    }
    
    // Get total count
    const countResult = await db.select({ count: sql`count(*)` })
      .from(items)
      .where(whereCondition);
    const total = parseInt(countResult[0].count, 10);
    
    // Get paginated items
    const result = await db.select()
      .from(items)
      .where(whereCondition)
      .orderBy(desc(items.deletedAt))
      .limit(limit)
      .offset(offset);
    
    const itemsData = result.map(item => ({
      ...item,
      _id: item.id,
      price: parseFloat(item.price),
      color: item.color || '',
      fabric: item.fabric || '',
      specialFeatures: item.specialFeatures || '',
      imageUrl: item.imageUrl || ''
    }));
    
    return {
      items: itemsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

module.exports = Item;
