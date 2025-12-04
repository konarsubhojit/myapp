const { eq, desc } = require('drizzle-orm');
const { getDatabase } = require('../db/connection');
const { orders, orderItems } = require('../db/schema');

/**
 * Generate a unique order ID
 * @returns {string} Order ID in format ORD######
 */
function generateOrderId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD${randomNum}`;
}

/**
 * Order model with methods for database operations
 */
const Order = {
  /**
   * Get all orders sorted by creation date (newest first)
   * @returns {Promise<Array>} Array of orders with their items
   */
  async find() {
    const db = getDatabase();
    const ordersResult = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          _id: order.id,
          totalPrice: parseFloat(order.totalPrice),
          items: itemsResult.map(item => ({
            ...item,
            _id: item.id,
            item: item.itemId,
            price: parseFloat(item.price)
          }))
        };
      })
    );
    
    return ordersWithItems;
  },

  /**
   * Find an order by ID
   * @param {number|string} id Order ID
   * @returns {Promise<Object|null>} Order with items or null if not found
   */
  async findById(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const ordersResult = await db.select().from(orders).where(eq(orders.id, numericId));
    if (ordersResult.length === 0) return null;
    
    const order = ordersResult[0];
    const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    return {
      ...order,
      _id: order.id,
      totalPrice: parseFloat(order.totalPrice),
      items: itemsResult.map(item => ({
        ...item,
        _id: item.id,
        item: item.itemId,
        price: parseFloat(item.price)
      }))
    };
  },

  /**
   * Create a new order with items
   * @param {Object} data Order data
   * @returns {Promise<Object>} Created order with items
   */
  async create(data) {
    const db = getDatabase();
    
    // Generate unique order ID
    const orderId = generateOrderId();
    
    // Insert the order
    const orderResult = await db.insert(orders).values({
      orderId: orderId,
      orderFrom: data.orderFrom,
      customerName: data.customerName.trim(),
      customerId: data.customerId.trim(),
      totalPrice: data.totalPrice.toString()
    }).returning();
    
    const newOrder = orderResult[0];
    
    // Insert order items
    const orderItemsData = data.items.map(item => ({
      orderId: newOrder.id,
      itemId: item.item,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity
    }));
    
    const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();
    
    return {
      ...newOrder,
      _id: newOrder.id,
      totalPrice: parseFloat(newOrder.totalPrice),
      items: itemsResult.map(item => ({
        ...item,
        _id: item.id,
        item: item.itemId,
        price: parseFloat(item.price)
      }))
    };
  }
};

module.exports = Order;
