import { eq, desc, and, inArray } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { itemDesigns } from '../db/schema.js';
import { executeWithRetry } from '../utils/dbRetry.js';

function transformItemDesign(design) {
  return {
    ...design,
    _id: design.id,
    itemId: design.itemId
  };
}

const ItemDesign = {
  async findByItemId(itemId) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(itemId, 10);
      if (Number.isNaN(numericId)) return [];

      const result = await db.select().from(itemDesigns)
        .where(eq(itemDesigns.itemId, numericId))
        .orderBy(desc(itemDesigns.isPrimary), itemDesigns.displayOrder);
      
      return result.map(transformItemDesign);
    }, { operationName: 'ItemDesign.findByItemId' });
  },

  async findByItemIds(itemIds) {
    return executeWithRetry(async () => {
      if (!itemIds || itemIds.length === 0) {
        return new Map();
      }

      const db = getDatabase();
      const numericIds = itemIds
        .map(id => Number.parseInt(id, 10))
        .filter(id => !Number.isNaN(id));
      
      if (numericIds.length === 0) {
        return new Map();
      }

      const result = await db.select()
        .from(itemDesigns)
        .where(inArray(itemDesigns.itemId, numericIds))
        .orderBy(desc(itemDesigns.isPrimary), itemDesigns.displayOrder);
      
      const designMap = new Map();
      for (const design of result) {
        if (!designMap.has(design.itemId)) {
          designMap.set(design.itemId, []);
        }
        designMap.get(design.itemId).push(transformItemDesign(design));
      }
      
      return designMap;
    }, { operationName: 'ItemDesign.findByItemIds' });
  },

  async findById(id) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db.select().from(itemDesigns)
        .where(eq(itemDesigns.id, numericId));
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.findById' });
  },

  async create(data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db.insert(itemDesigns).values({
        itemId: data.itemId,
        designName: data.designName.trim(),
        imageUrl: data.imageUrl,
        isPrimary: data.isPrimary || false,
        displayOrder: data.displayOrder || 0
      }).returning();

      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.create' });
  },

  async delete(id) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db.delete(itemDesigns)
        .where(eq(itemDesigns.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.delete' });
  },

  async updatePrimary(itemId, designId) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = Number.parseInt(itemId, 10);
      const numericDesignId = Number.parseInt(designId, 10);
      
      if (Number.isNaN(numericItemId) || Number.isNaN(numericDesignId)) return null;

      await db.update(itemDesigns)
        .set({ isPrimary: false })
        .where(eq(itemDesigns.itemId, numericItemId));

      const result = await db.update(itemDesigns)
        .set({ isPrimary: true })
        .where(and(
          eq(itemDesigns.itemId, numericItemId),
          eq(itemDesigns.id, numericDesignId)
        ))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.updatePrimary' });
  },

  async update(id, data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const updateData = {};
      if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
      if (data.designName !== undefined) updateData.designName = data.designName.trim();

      if (Object.keys(updateData).length === 0) {
        return ItemDesign.findById(id);
      }

      const result = await db.update(itemDesigns)
        .set(updateData)
        .where(eq(itemDesigns.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.update' });
  }
};

export default ItemDesign;
