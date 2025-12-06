const { eq, desc, sql, asc } = require('drizzle-orm');
const { getDatabase } = require('../db/connection');
const { orders, orderItems } = require('../db/schema');

function generateOrderId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD${randomNum}`;
}

function transformOrderItem(item) {
  return {
    ...item,
    _id: item.id,
    item: item.itemId,
    price: parseFloat(item.price),
    customizationRequest: item.customizationRequest || ''
  };
}

function transformOrder(order, items = []) {
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
    items: items.map(transformOrderItem)
  };
}

const Order = {
  async find() {
    const db = getDatabase();
    const ordersResult = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order, itemsResult);
      })
    );
    
    return ordersWithItems;
  },

  async findPaginated({ page = 1, limit = 10 }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const countResult = await db.select({ count: sql`count(*)` }).from(orders);
    const total = parseInt(countResult[0].count, 10);
    
    const ordersResult = await db.select()
      .from(orders)
      .orderBy(
        sql`${orders.expectedDeliveryDate} IS NULL`,
        asc(orders.expectedDeliveryDate),
        desc(orders.createdAt)
      )
      .limit(limit)
      .offset(offset);
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order, itemsResult);
      })
    );
    
    return {
      orders: ordersWithItems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async findById(id) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const ordersResult = await db.select().from(orders).where(eq(orders.id, numericId));
    if (ordersResult.length === 0) return null;
    
    const order = ordersResult[0];
    const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    return transformOrder(order, itemsResult);
  },

  async create(data) {
    const db = getDatabase();
    const orderId = generateOrderId();
    
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
    
    const orderItemsData = data.items.map(item => ({
      orderId: newOrder.id,
      itemId: item.item,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() || null
    }));
    
    const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();
    
    return transformOrder(newOrder, itemsResult);
  },

  async findByIdAndUpdate(id, data) {
    const db = getDatabase();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    
    const existingOrder = await db.select().from(orders).where(eq(orders.id, numericId));
    if (existingOrder.length === 0) return null;
    
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
    
    if (Object.keys(updateData).length > 0) {
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, numericId));
    }
    
    if (data.items && Array.isArray(data.items)) {
      await db.delete(orderItems).where(eq(orderItems.orderId, numericId));
      
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
    
    return this.findById(numericId);
  }
};

module.exports = Order;
