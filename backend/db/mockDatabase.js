import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('MockDatabase');

const MOCK_DATA_PATH = path.join(__dirname, 'mockData.json');

class MockDatabase {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      const fileContent = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
      this.data = JSON.parse(fileContent);
      logger.info('Mock database loaded successfully', { 
        itemsCount: this.data.items.length,
        ordersCount: this.data.orders.length 
      });
    } catch (error) {
      logger.error('Failed to load mock database', { error: error.message });
      throw error;
    }
  }

  save() {
    try {
      fs.writeFileSync(MOCK_DATA_PATH, JSON.stringify(this.data, null, 2), 'utf8');
      logger.debug('Mock database saved successfully');
    } catch (error) {
      logger.error('Failed to save mock database', { error: error.message });
      throw error;
    }
  }

  getItems() {
    return this.data.items.filter(item => !item.deletedAt);
  }

  getDeletedItems() {
    return this.data.items.filter(item => item.deletedAt !== null);
  }

  getItemById(id) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return this.data.items.find(item => item.id === numericId);
  }

  createItem(itemData) {
    const newItem = {
      id: this.data.nextIds.items,
      _id: this.data.nextIds.items,
      name: itemData.name,
      price: itemData.price.toString(),
      color: itemData.color || '',
      fabric: itemData.fabric || '',
      specialFeatures: itemData.specialFeatures || '',
      imageUrl: itemData.imageUrl || '',
      createdAt: new Date().toISOString(),
      deletedAt: null
    };
    
    this.data.items.push(newItem);
    this.data.nextIds.items++;
    this.save();
    
    logger.info('Item created in mock database', { itemId: newItem.id, name: newItem.name });
    return newItem;
  }

  updateItem(id, updates) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const itemIndex = this.data.items.findIndex(item => item.id === numericId);
    
    if (itemIndex === -1) {
      return null;
    }

    const item = this.data.items[itemIndex];
    
    if (updates.name !== undefined) item.name = updates.name;
    if (updates.price !== undefined) item.price = updates.price.toString();
    if (updates.color !== undefined) item.color = updates.color;
    if (updates.fabric !== undefined) item.fabric = updates.fabric;
    if (updates.specialFeatures !== undefined) item.specialFeatures = updates.specialFeatures;
    if (updates.imageUrl !== undefined) item.imageUrl = updates.imageUrl;
    
    this.save();
    
    logger.info('Item updated in mock database', { itemId: item.id, name: item.name });
    return item;
  }

  deleteItem(id) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const itemIndex = this.data.items.findIndex(item => item.id === numericId);
    
    if (itemIndex === -1) {
      return null;
    }

    const item = this.data.items[itemIndex];
    item.deletedAt = new Date().toISOString();
    this.save();
    
    logger.info('Item soft deleted in mock database', { itemId: item.id });
    return item;
  }

  restoreItem(id) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const itemIndex = this.data.items.findIndex(item => item.id === numericId);
    
    if (itemIndex === -1) {
      return null;
    }

    const item = this.data.items[itemIndex];
    item.deletedAt = null;
    this.save();
    
    logger.info('Item restored in mock database', { itemId: item.id });
    return item;
  }

  getOrders() {
    return this.data.orders;
  }

  getOrderById(id) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return this.data.orders.find(order => order.id === numericId);
  }

  createOrder(orderData) {
    const newOrder = {
      id: this.data.nextIds.orders,
      _id: this.data.nextIds.orders,
      orderId: `ORD${Math.floor(100000 + Math.random() * 900000)}`,
      orderFrom: orderData.orderFrom,
      customerName: orderData.customerName,
      customerId: orderData.customerId,
      address: orderData.address || '',
      totalPrice: orderData.totalPrice.toString(),
      paidAmount: (orderData.paidAmount || 0).toString(),
      paymentStatus: orderData.paymentStatus || 'unpaid',
      confirmationStatus: orderData.confirmationStatus || 'unconfirmed',
      customerNotes: orderData.customerNotes || '',
      priority: orderData.priority || 0,
      status: 'pending',
      orderDate: orderData.orderDate || new Date().toISOString(),
      expectedDeliveryDate: orderData.expectedDeliveryDate || null,
      deliveryStatus: orderData.deliveryStatus || 'not_shipped',
      trackingId: orderData.trackingId || '',
      deliveryPartner: orderData.deliveryPartner || '',
      actualDeliveryDate: orderData.actualDeliveryDate || null,
      createdAt: new Date().toISOString(),
      items: []
    };

    if (orderData.items && Array.isArray(orderData.items)) {
      newOrder.items = orderData.items.map(item => ({
        id: this.data.nextIds.orderItems,
        _id: this.data.nextIds.orderItems++,
        orderId: newOrder.id,
        itemId: item.item,
        item: item.item,
        designId: item.designId || null,
        name: item.name,
        price: item.price.toString(),
        quantity: item.quantity,
        customizationRequest: item.customizationRequest || ''
      }));
      
      this.data.orderItems.push(...newOrder.items);
    }

    this.data.orders.push(newOrder);
    this.data.nextIds.orders++;
    this.save();
    
    logger.info('Order created in mock database', { orderId: newOrder.orderId, id: newOrder.id });
    return newOrder;
  }

  updateOrder(id, updates) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const orderIndex = this.data.orders.findIndex(order => order.id === numericId);
    
    if (orderIndex === -1) {
      return null;
    }

    const order = this.data.orders[orderIndex];
    
    if (updates.orderFrom !== undefined) order.orderFrom = updates.orderFrom;
    if (updates.customerName !== undefined) order.customerName = updates.customerName;
    if (updates.customerId !== undefined) order.customerId = updates.customerId;
    if (updates.address !== undefined) order.address = updates.address;
    if (updates.totalPrice !== undefined) order.totalPrice = updates.totalPrice.toString();
    if (updates.paidAmount !== undefined) order.paidAmount = updates.paidAmount.toString();
    if (updates.paymentStatus !== undefined) order.paymentStatus = updates.paymentStatus;
    if (updates.confirmationStatus !== undefined) order.confirmationStatus = updates.confirmationStatus;
    if (updates.customerNotes !== undefined) order.customerNotes = updates.customerNotes;
    if (updates.priority !== undefined) order.priority = updates.priority;
    if (updates.status !== undefined) order.status = updates.status;
    if (updates.orderDate !== undefined) order.orderDate = updates.orderDate;
    if (updates.expectedDeliveryDate !== undefined) order.expectedDeliveryDate = updates.expectedDeliveryDate;
    if (updates.deliveryStatus !== undefined) order.deliveryStatus = updates.deliveryStatus;
    if (updates.trackingId !== undefined) order.trackingId = updates.trackingId;
    if (updates.deliveryPartner !== undefined) order.deliveryPartner = updates.deliveryPartner;
    if (updates.actualDeliveryDate !== undefined) order.actualDeliveryDate = updates.actualDeliveryDate;

    if (updates.items && Array.isArray(updates.items)) {
      // Remove old order items
      this.data.orderItems = this.data.orderItems.filter(item => item.orderId !== numericId);
      order.items = [];

      // Add new order items
      const newItems = updates.items.map(item => ({
        id: this.data.nextIds.orderItems,
        _id: this.data.nextIds.orderItems++,
        orderId: order.id,
        itemId: item.item,
        item: item.item,
        designId: item.designId || null,
        name: item.name,
        price: item.price.toString(),
        quantity: item.quantity,
        customizationRequest: item.customizationRequest || ''
      }));
      
      this.data.orderItems.push(...newItems);
      order.items = newItems;
    }
    
    this.save();
    
    logger.info('Order updated in mock database', { orderId: order.orderId, id: order.id });
    return order;
  }

  getPriorityOrders() {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    return this.data.orders.filter(order => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        return false;
      }
      
      if (order.priority >= 5) {
        return true;
      }
      
      if (order.expectedDeliveryDate) {
        const deliveryDate = new Date(order.expectedDeliveryDate);
        return deliveryDate <= threeDaysFromNow;
      }
      
      return false;
    });
  }

  reset() {
    this.load();
    logger.info('Mock database reset to original state');
  }
}

let mockDbInstance = null;

export function getMockDatabase() {
  if (!mockDbInstance) {
    mockDbInstance = new MockDatabase();
  }
  return mockDbInstance;
}

export function resetMockDatabase() {
  if (mockDbInstance) {
    mockDbInstance.reset();
  }
}
