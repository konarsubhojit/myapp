import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Feedback from '@/lib/models/Feedback';
// @ts-ignore
import FeedbackToken from '@/lib/models/FeedbackToken';
// @ts-ignore
import Order from '@/lib/models/Order';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ValidateTokenAPI');

/**
 * POST /api/public/feedbacks/validate-token - Validate token and return order info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate token
    const tokenData = await FeedbackToken.validateToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get order details
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findByOrderId(tokenData.orderId);

    return NextResponse.json({
      order: {
        _id: order._id,
        orderId: order.orderId,
        status: order.status
      },
      hasExistingFeedback: !!existingFeedback
    });
  } catch (error: any) {
    logger.error('POST /api/public/feedbacks/validate-token error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to validate token' },
      { status: error.statusCode || 500 }
    );
  }
}
