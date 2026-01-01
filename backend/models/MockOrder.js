import { getMockDatabase } from '../db/mockDatabase.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MockOrderModel');

function transformOrderItem(item) {
  return {
    ...item,
    _id: item.id,
    item: item.itemId,
    price: parseFloat(item.price),
    customizationRequest: item.customizationRequest || ''
  };
}

function transformOrder(order) {
  if (!order) return null;
  
  return {
    ...order,
    _id: order.id,
    totalPrice: parseFloat(order.totalPrice),
    paidAmount: parseFloat(order.paidAmount || 0),
    status: order.status || 'pending',
    paymentStatus: order.paymentStatus || 'unpaid',
    confirmationStatus: order.confirmationStatus || 'unconfirmed',
    customerNotes: order.customerNotes || '',
    address: order.address || '',
    priority: order.priority || 0,
    deliveryStatus: order.deliveryStatus || 'not_shipped',
    trackingId: order.trackingId || '',
    deliveryPartner: order.deliveryPartner || '',
    items: (order.items || []).map(transformOrderItem)
  };
}

function parseCursor(cursor) {
  if (!cursor) return null;
  
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id
    };
  } catch (error) {
    return null;
  }
}

function encodeCursor(order) {
  const cursorData = {
    createdAt: order.createdAt,
    id: order.id
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

function filterByCursor(orders, cursorData) {
  if (!cursorData) return orders;
  
  return orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    
    if (orderDate < cursorData.createdAt) return true;
    if (orderDate.getTime() === cursorData.createdAt.getTime() && order.id < cursorData.id) return true;
    
    return false;
  });
}

const MockOrder = {
  async find() {
    const db = getMockDatabase();
    const orders = db.getOrders();
    logger.debug('MockOrder.find called', { count: orders.length });
    return orders.map(transformOrder);
  },

  async findPaginated({ page = 1, limit = 10 }) {
    const db = getMockDatabase();
    let orders = db.getOrders();
    
    // Sort by createdAt DESC
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const total = orders.length;
    const offset = (page - 1) * limit;
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    logger.debug('MockOrder.findPaginated called', { page, limit, total });
    
    return {
      orders: paginatedOrders.map(transformOrder),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async findCursorPaginated({ limit = 10, cursor = null }) {
    const db = getMockDatabase();
    let orders = db.getOrders();
    
    const validLimit = Math.min(Math.max(1, limit), 100);
    
    // Sort by createdAt DESC, id DESC
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB - dateA;
      }
      
      return b.id - a.id;
    });
    
    // Filter by cursor
    const cursorData = parseCursor(cursor);
    if (cursorData) {
      if (!cursorData) {
        throw new Error('Invalid cursor format');
      }
      orders = filterByCursor(orders, cursorData);
    }
    
    // Take limit + 1 for hasMore
    const ordersForPage = orders.slice(0, validLimit + 1);
    
    const hasMore = ordersForPage.length > validLimit;
    const ordersToReturn = hasMore ? ordersForPage.slice(0, validLimit) : ordersForPage;
    
    const nextCursor = hasMore && ordersToReturn.length > 0 
      ? encodeCursor(ordersToReturn[ordersToReturn.length - 1])
      : null;
    
    logger.debug('MockOrder.findCursorPaginated called', { 
      limit: validLimit, 
      hasCursor: !!cursor,
      resultCount: ordersToReturn.length,
      hasMore
    });
    
    return {
      orders: ordersToReturn.map(transformOrder),
      pagination: { limit: validLimit, nextCursor, hasMore }
    };
  },

  async findById(id) {
    const db = getMockDatabase();
    const order = db.getOrderById(id);
    logger.debug('MockOrder.findById called', { id, found: !!order });
    return transformOrder(order);
  },

  async findPriorityOrders() {
    const db = getMockDatabase();
    const orders = db.getPriorityOrders();
    logger.debug('MockOrder.findPriorityOrders called', { count: orders.length });
    
    // Sort priority orders
    orders.sort((a, b) => {
      const now = new Date();
      
      // Overdue orders first
      const aOverdue = a.expectedDeliveryDate && new Date(a.expectedDeliveryDate) < now;
      const bOverdue = b.expectedDeliveryDate && new Date(b.expectedDeliveryDate) < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Then by delivery date
      if (a.expectedDeliveryDate && b.expectedDeliveryDate) {
        const dateA = new Date(a.expectedDeliveryDate);
        const dateB = new Date(b.expectedDeliveryDate);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
      }
      
      // Then by priority
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      
      return 0;
    });
    
    return orders.map(transformOrder);
  },

  async create(data) {
    const db = getMockDatabase();
    const order = db.createOrder(data);
    logger.info('MockOrder.create called', { orderId: order.orderId, id: order.id });
    return transformOrder(order);
  },

  async findByIdAndUpdate(id, data) {
    const db = getMockDatabase();
    const order = db.updateOrder(id, data);
    logger.info('MockOrder.findByIdAndUpdate called', { id, found: !!order });
    return transformOrder(order);
  }
};

export default MockOrder;
