import { eq, desc, isNull, isNotNull, ilike, or, sql, and, SQL } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { items } from '../db/schema.js';
import type { 
  Item, 
  ItemRow,
  ItemId, 
  CreateItemData, 
  UpdateItemData,
  PaginatedResult,
  PaginationInfo,
  SearchPaginationParams
} from '../types/index.js';
import { createItemId } from '../types/index.js';

function transformItem(item: ItemRow): Item {
  const itemId = createItemId(item.id);
  return {
    ...item,
    id: itemId,
    _id: itemId,
    price: Number.parseFloat(item.price),
    color: item.color ?? '',
    fabric: item.fabric ?? '',
    specialFeatures: item.specialFeatures ?? '',
    imageUrl: item.imageUrl ?? ''
  };
}

function buildSearchCondition(search: string): SQL | null {
  if (!search?.trim()) return null;
  const searchTerm = `%${search.trim()}%`;
  return or(
    ilike(items.name, searchTerm),
    ilike(items.color, searchTerm),
    ilike(items.fabric, searchTerm),
    ilike(items.specialFeatures, searchTerm)
  ) ?? null;
}

const Item = {
  async find(): Promise<Item[]> {
    const db = getDatabase();
    const result = await db.select().from(items)
      .where(isNull(items.deletedAt))
      .orderBy(desc(items.createdAt));
    return result.map(transformItem);
  },

  async findById(id: ItemId | string | number): Promise<Item | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const result = await db.select().from(items).where(eq(items.id, numericId));
    if (result.length === 0) return null;
    
    return transformItem(result[0] as ItemRow);
  },

  async create(data: CreateItemData): Promise<Item> {
    const db = getDatabase();
    const result = await db.insert(items).values({
      name: data.name.trim(),
      price: data.price.toString(),
      color: data.color?.trim() ?? null,
      fabric: data.fabric?.trim() ?? null,
      specialFeatures: data.specialFeatures?.trim() ?? null,
      imageUrl: data.imageUrl ?? null
    }).returning();
    
    return transformItem(result[0] as ItemRow);
  },

  async findByIdAndUpdate(id: ItemId | string | number, data: UpdateItemData): Promise<Item | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const updateData: Record<string, string | null | undefined> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.price !== undefined) updateData.price = data.price.toString();
    if (data.color !== undefined) updateData.color = data.color?.trim() ?? null;
    if (data.fabric !== undefined) updateData.fabric = data.fabric?.trim() ?? null;
    if (data.specialFeatures !== undefined) updateData.specialFeatures = data.specialFeatures?.trim() ?? null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl ?? null;
    
    if (Object.keys(updateData).length === 0) {
      return this.findById(numericId);
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(eq(items.id, numericId))
      .returning();
    
    if (result.length === 0) return null;
    
    return transformItem(result[0] as ItemRow);
  },

  async findByIdAndDelete(id: ItemId | string | number): Promise<Item | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const result = await db.update(items)
      .set({ deletedAt: new Date() })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;
    
    return transformItem(result[0] as ItemRow);
  },

  async findDeleted(): Promise<Item[]> {
    const db = getDatabase();
    const result = await db.select().from(items)
      .where(isNotNull(items.deletedAt))
      .orderBy(desc(items.deletedAt));
    return result.map(transformItem);
  },

  async restore(id: ItemId | string | number): Promise<Item | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const result = await db.update(items)
      .set({ deletedAt: null })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;
    
    return transformItem(result[0] as ItemRow);
  },

  async findPaginated({ page = 1, limit = 10, search = '' }: SearchPaginationParams): Promise<PaginatedResult<Item>> {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const searchCondition = buildSearchCondition(search);
    const whereCondition = searchCondition 
      ? and(isNull(items.deletedAt), searchCondition)
      : isNull(items.deletedAt);
    
    const countResult = await db.select({ count: sql`count(*)` })
      .from(items)
      .where(whereCondition);
    const total = Number.parseInt(String(countResult[0]?.count ?? 0), 10);
    
    const result = await db.select()
      .from(items)
      .where(whereCondition)
      .orderBy(desc(items.createdAt))
      .limit(limit)
      .offset(offset);
    
    const pagination: PaginationInfo = { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit) 
    };
    
    return {
      items: result.map(transformItem),
      pagination
    };
  },

  async findDeletedPaginated({ page = 1, limit = 10, search = '' }: SearchPaginationParams): Promise<PaginatedResult<Item>> {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const searchCondition = buildSearchCondition(search);
    const whereCondition = searchCondition 
      ? and(isNotNull(items.deletedAt), searchCondition)
      : isNotNull(items.deletedAt);
    
    const countResult = await db.select({ count: sql`count(*)` })
      .from(items)
      .where(whereCondition);
    const total = Number.parseInt(String(countResult[0]?.count ?? 0), 10);
    
    const result = await db.select()
      .from(items)
      .where(whereCondition)
      .orderBy(desc(items.deletedAt))
      .limit(limit)
      .offset(offset);
    
    const pagination: PaginationInfo = { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit) 
    };
    
    return {
      items: result.map(transformItem),
      pagination
    };
  },

  async permanentlyRemoveImage(id: ItemId | string | number): Promise<Item | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const result = await db.update(items)
      .set({ imageUrl: null })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;
    
    return transformItem(result[0] as ItemRow);
  }
};

export default Item;
