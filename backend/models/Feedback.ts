import { eq, desc, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { feedbacks } from '../db/schema.js';
import type {
  Feedback,
  FeedbackRow,
  FeedbackId,
  OrderId,
  CreateFeedbackData,
  UpdateFeedbackData,
  PaginatedFeedbacksResult,
  PaginationInfo,
  PaginationParams,
  FeedbackStats
} from '../types/index.js';
import { createFeedbackId, createOrderId } from '../types/index.js';

function transformFeedback(feedback: FeedbackRow): Feedback {
  const feedbackId = createFeedbackId(feedback.id);
  return {
    ...feedback,
    id: feedbackId,
    _id: feedbackId,
    orderId: createOrderId(feedback.orderId),
    rating: feedback.rating,
    comment: feedback.comment ?? '',
    productQuality: feedback.productQuality ?? null,
    deliveryExperience: feedback.deliveryExperience ?? null,
    customerService: feedback.customerService ?? null,
    isPublic: Boolean(feedback.isPublic),
    responseText: feedback.responseText ?? '',
    respondedAt: feedback.respondedAt ? feedback.respondedAt.toISOString() : null,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString()
  };
}

const Feedback = {
  async find(): Promise<Feedback[]> {
    const db = getDatabase();
    const feedbacksResult = await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
    return feedbacksResult.map(row => transformFeedback(row as FeedbackRow));
  },

  async findPaginated({ page = 1, limit = 10 }: PaginationParams): Promise<PaginatedFeedbacksResult> {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const countResult = await db.select({ count: sql`count(*)` }).from(feedbacks);
    const total = Number.parseInt(String(countResult[0]?.count ?? 0), 10);
    
    const feedbacksResult = await db.select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit)
      .offset(offset);
    
    const pagination: PaginationInfo = { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit) 
    };
    
    return {
      feedbacks: feedbacksResult.map(row => transformFeedback(row as FeedbackRow)),
      pagination
    };
  },

  async findById(id: FeedbackId | string | number): Promise<Feedback | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const feedbacksResult = await db.select().from(feedbacks).where(eq(feedbacks.id, numericId));
    if (feedbacksResult.length === 0) return null;
    
    return transformFeedback(feedbacksResult[0] as FeedbackRow);
  },

  async findByOrderId(orderId: OrderId | string | number): Promise<Feedback | null> {
    const db = getDatabase();
    const numericOrderId = typeof orderId === 'number' ? orderId : Number.parseInt(String(orderId), 10);
    if (Number.isNaN(numericOrderId)) return null;
    
    const feedbacksResult = await db.select().from(feedbacks).where(eq(feedbacks.orderId, numericOrderId));
    if (feedbacksResult.length === 0) return null;
    
    return transformFeedback(feedbacksResult[0] as FeedbackRow);
  },

  async create(data: CreateFeedbackData): Promise<Feedback> {
    const db = getDatabase();
    
    const feedbackResult = await db.insert(feedbacks).values({
      orderId: Number(data.orderId),
      rating: data.rating,
      comment: data.comment?.trim() ?? null,
      productQuality: data.productQuality ?? null,
      deliveryExperience: data.deliveryExperience ?? null,
      customerService: data.customerService ?? null,
      isPublic: data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : 1
    }).returning();
    
    return transformFeedback(feedbackResult[0] as FeedbackRow);
  },

  async findByIdAndUpdate(id: FeedbackId | string | number, data: UpdateFeedbackData): Promise<Feedback | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const existingFeedback = await db.select().from(feedbacks).where(eq(feedbacks.id, numericId));
    if (existingFeedback.length === 0) return null;
    
    const updateData: Record<string, number | string | Date | null> = {
      updatedAt: new Date()
    };
    
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.comment !== undefined) updateData.comment = data.comment?.trim() ?? null;
    if (data.productQuality !== undefined) updateData.productQuality = data.productQuality;
    if (data.deliveryExperience !== undefined) updateData.deliveryExperience = data.deliveryExperience;
    if (data.customerService !== undefined) updateData.customerService = data.customerService;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic ? 1 : 0;
    if (data.responseText !== undefined) {
      updateData.responseText = data.responseText?.trim() ?? null;
      if (data.responseText?.trim()) {
        updateData.respondedAt = new Date();
      }
    }
    
    await db.update(feedbacks)
      .set(updateData)
      .where(eq(feedbacks.id, numericId));
    
    return this.findById(numericId);
  },

  async getAverageRatings(): Promise<FeedbackStats> {
    const db = getDatabase();
    
    const result = await db.select({
      avgRating: sql`AVG(${feedbacks.rating})`,
      avgProductQuality: sql`AVG(${feedbacks.productQuality})`,
      avgDeliveryExperience: sql`AVG(${feedbacks.deliveryExperience})`,
      avgCustomerService: sql`AVG(${feedbacks.customerService})`,
      totalFeedbacks: sql`COUNT(*)`
    }).from(feedbacks);
    
    const row = result[0];
    return {
      avgRating: row?.avgRating ? Number.parseFloat(String(row.avgRating)).toFixed(2) : null,
      avgProductQuality: row?.avgProductQuality ? Number.parseFloat(String(row.avgProductQuality)).toFixed(2) : null,
      avgDeliveryExperience: row?.avgDeliveryExperience ? Number.parseFloat(String(row.avgDeliveryExperience)).toFixed(2) : null,
      avgCustomerService: row?.avgCustomerService ? Number.parseFloat(String(row.avgCustomerService)).toFixed(2) : null,
      totalFeedbacks: Number.parseInt(String(row?.totalFeedbacks ?? 0), 10)
    };
  },

  async getFeedbacksByRating(rating: number): Promise<Feedback[]> {
    const db = getDatabase();
    
    const feedbacksResult = await db.select()
      .from(feedbacks)
      .where(eq(feedbacks.rating, rating))
      .orderBy(desc(feedbacks.createdAt));
    
    return feedbacksResult.map(row => transformFeedback(row as FeedbackRow));
  }
};

export default Feedback;
