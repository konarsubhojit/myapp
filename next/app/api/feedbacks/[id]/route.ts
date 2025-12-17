import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Feedback from '@/lib/models/Feedback';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { MAX_RESPONSE_LENGTH } from '@/lib/constants/feedbackConstants';

const logger = createLogger('FeedbackByIdAPI');

/**
 * GET /api/feedbacks/[id] - Get feedback by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedback = await Feedback.findById(id);
    
    if (!feedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    logger.debug('Feedback retrieved', { feedbackId: id });
    
    return NextResponse.json(feedback);
  } catch (error: any) {
    logger.error('GET /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch feedback' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * PUT /api/feedbacks/[id] - Update feedback (add response)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responseText, isPublic } = body;

    const existingFeedback = await Feedback.findById(id);
    if (!existingFeedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Validate response text
    if (responseText && typeof responseText === 'string' && responseText.length > MAX_RESPONSE_LENGTH) {
      return NextResponse.json(
        { message: `Response cannot exceed ${MAX_RESPONSE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (responseText !== undefined) {
      updateData.responseText = responseText;
      updateData.respondedAt = new Date();
    }
    
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic ? 1 : 0;
    }

    const updatedFeedback = await Feedback.findByIdAndUpdate(id, updateData);
    if (!updatedFeedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    logger.info('Feedback updated', { feedbackId: id });
    
    return NextResponse.json(updatedFeedback);
  } catch (error: any) {
    logger.error('PUT /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update feedback' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/feedbacks/[id] - Delete feedback
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First check if feedback exists
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    // Delete using raw database access since model doesn't have delete method
    // @ts-ignore
    const { getDatabase } = await import('@/lib/db/connection');
    // @ts-ignore
    const { feedbacks } = await import('@/lib/db/schema');
    // @ts-ignore
    const { eq } = await import('drizzle-orm');
    
    const db = getDatabase();
    await db.delete(feedbacks).where(eq(feedbacks.id, Number.parseInt(id, 10)));
    
    logger.info('Feedback deleted', { feedbackId: id });
    
    return NextResponse.json({ message: 'Feedback deleted' });
  } catch (error: any) {
    logger.error('DELETE /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete feedback' },
      { status: error.statusCode || 500 }
    );
  }
}
