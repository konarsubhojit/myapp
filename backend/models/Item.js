const { eq, desc } = require('drizzle-orm');
const { getDatabase } = require('../db/connection');
const { items } = require('../db/schema');

/**
 * Item model with methods for database operations
 */
const Item = {
  /**
   * Get all items sorted by creation date (newest first)
   * @returns {Promise<Array>} Array of items
   */
  async find() {
    const db = getDatabase();
    const result = await db.select().from(items).orderBy(desc(items.createdAt));
    return result.map(item => ({
      ...item,
      _id: item.id,
      price: parseFloat(item.price)
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
      price: parseFloat(result[0].price)
    };
  },

  /**
   * Create a new item
   * @param {Object} data Item data (name, price)
   * @returns {Promise<Object>} Created item
   */
  async create(data) {
    const db = getDatabase();
    const result = await db.insert(items).values({
      name: data.name.trim(),
      price: data.price.toString()
    }).returning();
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price)
    };
  },

  /**
   * Delete an item by ID
   * @param {number|string} id Item ID
   * @returns {Promise<Object|null>} Deleted item or null if not found
   */
  async findByIdAndDelete(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const result = await db.delete(items).where(eq(items.id, numericId)).returning();
    if (result.length === 0) return null;
    
    return {
      ...result[0],
      _id: result[0].id,
      price: parseFloat(result[0].price)
    };
  }
};

module.exports = Item;
