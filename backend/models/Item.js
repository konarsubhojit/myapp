const { eq, desc, isNull } = require('drizzle-orm');
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
      specialFeatures: item.specialFeatures || ''
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
      specialFeatures: result[0].specialFeatures || ''
    };
  },

  /**
   * Create a new item
   * @param {Object} data Item data (name, price, color, fabric, specialFeatures)
   * @returns {Promise<Object>} Created item
   */
  async create(data) {
    const db = getDatabase();
    const result = await db.insert(items).values({
      name: data.name.trim(),
      price: data.price.toString(),
      color: data.color?.trim() || null,
      fabric: data.fabric?.trim() || null,
      specialFeatures: data.specialFeatures?.trim() || null
    }).returning();
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price),
      color: result[0].color || '',
      fabric: result[0].fabric || '',
      specialFeatures: result[0].specialFeatures || ''
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
      specialFeatures: result[0].specialFeatures || ''
    };
  }
};

module.exports = Item;
