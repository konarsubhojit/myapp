import { getMockDatabase } from '../db/mockDatabase.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MockItemModel');

function transformItem(item) {
  if (!item) return null;
  
  return {
    ...item,
    _id: item.id,
    price: parseFloat(item.price),
    color: item.color || '',
    fabric: item.fabric || '',
    specialFeatures: item.specialFeatures || '',
    imageUrl: item.imageUrl || ''
  };
}

function buildCursorResponse(items, limit) {
  const hasMore = items.length > limit;
  const itemsToReturn = hasMore ? items.slice(0, limit) : items;
  
  let nextCursor = null;
  if (hasMore && itemsToReturn.length > 0) {
    const lastItem = itemsToReturn[itemsToReturn.length - 1];
    nextCursor = `${lastItem.createdAt}:${lastItem.id}`;
  }
  
  return {
    items: itemsToReturn.map(transformItem),
    page: {
      limit,
      nextCursor,
      hasMore
    }
  };
}

function parseCursor(cursor) {
  if (!cursor) return null;
  
  const lastColonIndex = cursor.lastIndexOf(':');
  if (lastColonIndex === -1) return null;
  
  const timestampStr = cursor.substring(0, lastColonIndex);
  const idStr = cursor.substring(lastColonIndex + 1);
  
  const timestamp = new Date(timestampStr);
  const id = parseInt(idStr, 10);
  
  if (isNaN(timestamp.getTime()) || isNaN(id)) {
    return null;
  }
  
  return { timestamp, id };
}

function filterByCursor(items, cursorData) {
  if (!cursorData) return items;
  
  return items.filter(item => {
    const itemDate = new Date(item.createdAt);
    
    if (itemDate < cursorData.timestamp) return true;
    if (itemDate.getTime() === cursorData.timestamp.getTime() && item.id < cursorData.id) return true;
    
    return false;
  });
}

function filterBySearch(items, search) {
  if (!search?.trim()) return items;
  
  const searchLower = search.trim().toLowerCase();
  return items.filter(item => 
    item.name.toLowerCase().includes(searchLower) ||
    (item.fabric && item.fabric.toLowerCase().includes(searchLower)) ||
    (item.specialFeatures && item.specialFeatures.toLowerCase().includes(searchLower))
  );
}

const MockItem = {
  async find() {
    const db = getMockDatabase();
    const items = db.getItems();
    logger.debug('MockItem.find called', { count: items.length });
    return items.map(transformItem);
  },

  async findById(id) {
    const db = getMockDatabase();
    const item = db.getItemById(id);
    logger.debug('MockItem.findById called', { id, found: !!item });
    return transformItem(item);
  },

  async findByIds(ids) {
    const db = getMockDatabase();
    const itemMap = new Map();
    
    for (const id of ids) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        const item = db.getItemById(numericId);
        if (item) {
          itemMap.set(numericId, transformItem(item));
        }
      }
    }
    
    logger.debug('MockItem.findByIds called', { idsCount: ids.length, foundCount: itemMap.size });
    return itemMap;
  },

  async create(data) {
    const db = getMockDatabase();
    const item = db.createItem(data);
    logger.info('MockItem.create called', { itemId: item.id, name: item.name });
    return transformItem(item);
  },

  async findByIdAndUpdate(id, data) {
    const db = getMockDatabase();
    const item = db.updateItem(id, data);
    logger.info('MockItem.findByIdAndUpdate called', { id, found: !!item });
    return transformItem(item);
  },

  async findByIdAndDelete(id) {
    const db = getMockDatabase();
    const item = db.deleteItem(id);
    logger.info('MockItem.findByIdAndDelete called', { id, found: !!item });
    return transformItem(item);
  },

  async findDeleted() {
    const db = getMockDatabase();
    const items = db.getDeletedItems();
    logger.debug('MockItem.findDeleted called', { count: items.length });
    return items.map(transformItem);
  },

  async restore(id) {
    const db = getMockDatabase();
    const item = db.restoreItem(id);
    logger.info('MockItem.restore called', { id, found: !!item });
    return transformItem(item);
  },

  async findCursor({ limit = 10, cursor = null, search = '' }) {
    const db = getMockDatabase();
    let items = db.getItems();
    
    // Filter by search
    items = filterBySearch(items, search);
    
    // Sort by createdAt DESC, id DESC
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB - dateA;
      }
      
      return b.id - a.id;
    });
    
    // Filter by cursor
    const cursorData = parseCursor(cursor);
    items = filterByCursor(items, cursorData);
    
    // Take limit + 1 for hasMore
    const itemsForPage = items.slice(0, limit + 1);
    
    logger.debug('MockItem.findCursor called', { 
      limit, 
      hasCursor: !!cursor, 
      hasSearch: !!search,
      resultCount: itemsForPage.length 
    });
    
    return buildCursorResponse(itemsForPage, limit);
  },

  async findDeletedCursor({ limit = 10, cursor = null, search = '' }) {
    const db = getMockDatabase();
    let items = db.getDeletedItems();
    
    // Filter by search
    items = filterBySearch(items, search);
    
    // Sort by deletedAt DESC, id DESC
    items.sort((a, b) => {
      const dateA = new Date(a.deletedAt);
      const dateB = new Date(b.deletedAt);
      
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB - dateA;
      }
      
      return b.id - a.id;
    });
    
    // Filter by cursor
    const cursorData = parseCursor(cursor);
    if (cursorData) {
      items = items.filter(item => {
        const itemDate = new Date(item.deletedAt);
        
        if (itemDate < cursorData.timestamp) return true;
        if (itemDate.getTime() === cursorData.timestamp.getTime() && item.id < cursorData.id) return true;
        
        return false;
      });
    }
    
    // Take limit + 1 for hasMore
    const itemsForPage = items.slice(0, limit + 1);
    
    logger.debug('MockItem.findDeletedCursor called', { 
      limit, 
      hasCursor: !!cursor, 
      hasSearch: !!search,
      resultCount: itemsForPage.length 
    });
    
    return buildCursorResponse(itemsForPage, limit);
  },

  async findPaginated({ page = 1, limit = 10, search = '' }) {
    const db = getMockDatabase();
    let items = db.getItems();
    
    // Filter by search
    items = filterBySearch(items, search);
    
    // Sort by createdAt DESC
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const total = items.length;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);
    
    logger.debug('MockItem.findPaginated called', { page, limit, hasSearch: !!search, total });
    
    return {
      items: paginatedItems.map(transformItem),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async findDeletedPaginated({ page = 1, limit = 10, search = '' }) {
    const db = getMockDatabase();
    let items = db.getDeletedItems();
    
    // Filter by search
    items = filterBySearch(items, search);
    
    // Sort by deletedAt DESC
    items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    
    const total = items.length;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);
    
    logger.debug('MockItem.findDeletedPaginated called', { page, limit, hasSearch: !!search, total });
    
    return {
      items: paginatedItems.map(transformItem),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async permanentlyRemoveImage(id) {
    const db = getMockDatabase();
    const item = db.updateItem(id, { imageUrl: '' });
    logger.info('MockItem.permanentlyRemoveImage called', { id, found: !!item });
    return transformItem(item);
  }
};

export default MockItem;
