const { eq, desc, sql, asc, isNull } = require('drizzle-orm');
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
          paidAmount: parseFloat(order.paidAmount || 0),
          status: order.status || 'pending',
          paymentStatus: order.paymentStatus || 'unpaid',
          confirmationStatus: order.confirmationStatus || 'unconfirmed',
          customerNotes: order.customerNotes || '',
          priority: order.priority || 0,
          expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
          items: itemsResult.map(item => ({
            ...item,
            _id: item.id,
            item: item.itemId,
            price: parseFloat(item.price),
            customizationRequest: item.customizationRequest || ''
          }))
        };
      })
    );
    
    return ordersWithItems;
  },

  /**
   * Get orders with server-side pagination, sorted by expected delivery date (ascending)
   * Orders without expected delivery date are shown last
   * @param {Object} options Pagination options
   * @param {number} options.page Page number (1-based)
   * @param {number} options.limit Number of orders per page
   * @returns {Promise<Object>} Paginated orders with metadata
   */
  async findPaginated({ page = 1, limit = 10 }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await db.select({ count: sql`count(*)` }).from(orders);
    const total = parseInt(countResult[0].count, 10);
    
    // Get paginated orders sorted by expected delivery date (ascending), nulls last
    const ordersResult = await db.select()
      .from(orders)
      .orderBy(
        sql`${orders.expectedDeliveryDate} IS NULL`,
        asc(orders.expectedDeliveryDate),
        desc(orders.createdAt)
      )
      .limit(limit)
      .offset(offset);
    
    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          _id: order.id,
          totalPrice: parseFloat(order.totalPrice),
          paidAmount: parseFloat(order.paidAmount || 0),
          status: order.status || 'pending',
          paymentStatus: order.paymentStatus || 'unpaid',
          confirmationStatus: order.confirmationStatus || 'unconfirmed',
          customerNotes: order.customerNotes || '',
          priority: order.priority || 0,
          expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
          items: itemsResult.map(item => ({
            ...item,
            _id: item.id,
            item: item.itemId,
            price: parseFloat(item.price),
            customizationRequest: item.customizationRequest || ''
          }))
        };
      })
    );
    
    return {
      orders: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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
      paidAmount: parseFloat(order.paidAmount || 0),
      status: order.status || 'pending',
      paymentStatus: order.paymentStatus || 'unpaid',
      confirmationStatus: order.confirmationStatus || 'unconfirmed',
      customerNotes: order.customerNotes || '',
      priority: order.priority || 0,
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
      items: itemsResult.map(item => ({
        ...item,
        _id: item.id,
        item: item.itemId,
        price: parseFloat(item.price),
        customizationRequest: item.customizationRequest || ''
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
      totalPrice: data.totalPrice.toString(),
      paidAmount: (data.paidAmount || 0).toString(),
      paymentStatus: data.paymentStatus || 'unpaid',
      confirmationStatus: data.confirmationStatus || 'unconfirmed',
      customerNotes: data.customerNotes?.trim() || null,
      priority: data.priority || 0,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null
    }).returning();
    
    const newOrder = orderResult[0];
    
    // Insert order items with customization request
    const orderItemsData = data.items.map(item => ({
      orderId: newOrder.id,
      itemId: item.item,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() || null
    }));
    
    const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();
    
    return {
      ...newOrder,
      _id: newOrder.id,
      totalPrice: parseFloat(newOrder.totalPrice),
      paidAmount: parseFloat(newOrder.paidAmount || 0),
      status: newOrder.status || 'pending',
      paymentStatus: newOrder.paymentStatus || 'unpaid',
      confirmationStatus: newOrder.confirmationStatus || 'unconfirmed',
      customerNotes: newOrder.customerNotes || '',
      priority: newOrder.priority || 0,
      expectedDeliveryDate: newOrder.expectedDeliveryDate ? newOrder.expectedDeliveryDate.toISOString() : null,
      items: itemsResult.map(item => ({
        ...item,
        _id: item.id,
        item: item.itemId,
        price: parseFloat(item.price),
        customizationRequest: item.customizationRequest || ''
      }))
    };
  },

  /**
   * Update an order by ID
   * @param {number|string} id Order ID
   * @param {Object} data Order data to update
   * @returns {Promise<Object|null>} Updated order or null if not found
   */
  async findByIdAndUpdate(id, data) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    // Check if order exists
    const existingOrder = await db.select().from(orders).where(eq(orders.id, numericId));
    if (existingOrder.length === 0) return null;
    
    // Update order fields
    const updateData = {};
    if (data.orderFrom !== undefined) updateData.orderFrom = data.orderFrom;
    if (data.customerName !== undefined) updateData.customerName = data.customerName.trim();
    if (data.customerId !== undefined) updateData.customerId = data.customerId.trim();
    if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice.toString();
    if (data.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount.toString();
    if (data.confirmationStatus !== undefined) updateData.confirmationStatus = data.confirmationStatus;
    if (data.customerNotes !== undefined) updateData.customerNotes = data.customerNotes?.trim() || null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    
    // Update the order if there are changes
    if (Object.keys(updateData).length > 0) {
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, numericId));
    }
    
    // If items are provided, replace them
    if (data.items && Array.isArray(data.items)) {
      // Delete existing order items
      await db.delete(orderItems).where(eq(orderItems.orderId, numericId));
      
      // Insert new order items
      if (data.items.length > 0) {
        const orderItemsData = data.items.map(item => ({
          orderId: numericId,
          itemId: item.item,
          name: item.name,
          price: item.price.toString(),
          quantity: item.quantity,
          customizationRequest: item.customizationRequest?.trim() || null
        }));
        
        await db.insert(orderItems).values(orderItemsData);
      }
    }
    
    // Return the updated order
    return this.findById(numericId);
  }
};

module.exports = Order;
