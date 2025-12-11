import { eq, and, gt } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { feedbackTokens } from '../db/schema.js';
import { generateFeedbackToken } from '../utils/tokenUtils.js';
import type { FeedbackToken, FeedbackTokenRow, OrderId } from '../types/index.js';

const FeedbackToken = {
  /**
   * Generate a new feedback token for an order
   * @param orderId - The order ID
   * @param expiryDays - Days until token expires (default 30)
   * @returns Token details
   */
  async generateForOrder(orderId: OrderId | number, expiryDays = 30): Promise<FeedbackTokenRow> {
    const db = getDatabase();
    const { token, expiresAt } = generateFeedbackToken(expiryDays);
    const numericOrderId = typeof orderId === 'number' ? orderId : Number(orderId);
    
    const result = await db.insert(feedbackTokens).values({
      orderId: numericOrderId,
      token,
      expiresAt,
      used: 0
    }).returning();
    
    return result[0] as FeedbackTokenRow;
  },

  /**
   * Validate a token and return associated order ID
   * @param token - The token to validate
   * @returns Token details if valid, null otherwise
   */
  async validateToken(token: string): Promise<FeedbackTokenRow | null> {
    const db = getDatabase();
    const now = new Date();
    
    const result = await db.select()
      .from(feedbackTokens)
      .where(
        and(
          eq(feedbackTokens.token, token),
          eq(feedbackTokens.used, 0),
          gt(feedbackTokens.expiresAt, now)
        )
      );
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0] as FeedbackTokenRow;
  },

  /**
   * Mark a token as used
   * @param token - The token to mark as used
   */
  async markAsUsed(token: string): Promise<void> {
    const db = getDatabase();
    
    await db.update(feedbackTokens)
      .set({ used: 1 })
      .where(eq(feedbackTokens.token, token));
  },

  /**
   * Get or create a token for an order
   * @param orderId - The order ID
   * @returns Token details
   */
  async getOrCreateForOrder(orderId: OrderId | number): Promise<FeedbackTokenRow> {
    const db = getDatabase();
    const now = new Date();
    const numericOrderId = typeof orderId === 'number' ? orderId : Number(orderId);
    
    // Check if valid unused token exists
    const existingTokens = await db.select()
      .from(feedbackTokens)
      .where(
        and(
          eq(feedbackTokens.orderId, numericOrderId),
          eq(feedbackTokens.used, 0),
          gt(feedbackTokens.expiresAt, now)
        )
      );
    
    if (existingTokens.length > 0) {
      return existingTokens[0] as FeedbackTokenRow;
    }
    
    // Generate new token
    return await this.generateForOrder(orderId);
  }
};

export default FeedbackToken;
