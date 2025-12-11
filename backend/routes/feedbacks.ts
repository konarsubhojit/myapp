import express, { Request, Response } from 'express';
import Feedback from '../models/Feedback.js';
import FeedbackToken from '../models/FeedbackToken.js';
import Order from '../models/Order.js';
import { createLogger } from '../utils/logger.js';
import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_RESPONSE_LENGTH
} from '../constants/feedbackConstants.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { PAGINATION, isAllowedLimit } from '../constants/paginationConstants.js';
import type { ValidationResult } from '../types/index.js';
import { createOrderId } from '../types/index.js';

const router = express.Router();
const logger = createLogger('FeedbacksRoute');

interface RatingValidationResult extends ValidationResult {
  parsedRating?: number;
}

function validateRating(rating: string | number | undefined | null, fieldName = 'rating'): RatingValidationResult {
  if (rating === undefined || rating === null) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const parsedRating = Number.parseInt(String(rating), 10);
  if (Number.isNaN(parsedRating) || parsedRating < MIN_RATING || parsedRating > MAX_RATING) {
    return { valid: false, error: `${fieldName} must be between ${MIN_RATING} and ${MAX_RATING}` };
  }
  
  return { valid: true, parsedRating };
}

function validateOptionalRating(rating: string | number | undefined | null, fieldName: string): RatingValidationResult {
  if (rating === undefined || rating === null) {
    return { valid: true, parsedRating: undefined };
  }
  
  return validateRating(rating, fieldName);
}

function validateComment(comment: string | undefined): ValidationResult {
  if (comment && typeof comment === 'string' && comment.length > MAX_COMMENT_LENGTH) {
    return { valid: false, error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters` };
  }
  return { valid: true };
}

function validateResponse(responseText: string | undefined): ValidationResult {
  if (responseText && typeof responseText === 'string' && responseText.length > MAX_RESPONSE_LENGTH) {
    return { valid: false, error: `Response cannot exceed ${MAX_RESPONSE_LENGTH} characters` };
  }
  return { valid: true };
}

interface FeedbackRequestBody {
  orderId?: string | number;
  rating?: string | number;
  comment?: string;
  productQuality?: string | number;
  deliveryExperience?: string | number;
  customerService?: string | number;
  isPublic?: boolean;
  responseText?: string;
}

// POST /api/feedbacks/generate-token/:orderId - Generate secure feedback token for an order
router.post('/generate-token/:orderId', async (req: Request<{ orderId: string }>, res: Response) => {
  try {
    const orderId = req.params.orderId;
    
    // Check if order exists and is completed
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }
    
    if (order.status !== 'completed') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: 'Feedback tokens can only be generated for completed orders' 
      });
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findByOrderId(orderId);
    if (existingFeedback) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: 'Feedback already submitted for this order' 
      });
    }
    
    // Generate or get existing token
    const tokenData = await FeedbackToken.getOrCreateForOrder(Number.parseInt(orderId, 10));
    
    logger.info('Feedback token generated', { orderId, tokenId: tokenData.id });
    res.json({
      token: tokenData.token,
      orderId: tokenData.orderId,
      expiresAt: tokenData.expiresAt
    });
  } catch (error) {
    logger.error('Failed to generate feedback token', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate feedback token' });
  }
});

// GET /api/feedbacks - Get all feedbacks with optional pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsedPage = Number.parseInt(req.query.page as string, 10);
    const parsedLimit = Number.parseInt(req.query.limit as string, 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isAllowedLimit(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT;
    
    if (req.query.page || req.query.limit) {
      const result = await Feedback.findPaginated({ page, limit });
      res.json(result);
    } else {
      const feedbacksList = await Feedback.find();
      res.json(feedbacksList);
    }
  } catch (error) {
    logger.error('Failed to fetch feedbacks', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch feedbacks' });
  }
});

// GET /api/feedbacks/order/:orderId - Get feedback for a specific order
router.get('/order/:orderId', async (req: Request<{ orderId: string }>, res: Response) => {
  try {
    const feedback = await Feedback.findByOrderId(req.params.orderId);
    if (!feedback) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'No feedback found for this order' });
    }
    res.json(feedback);
  } catch (error) {
    logger.error('Failed to fetch order feedback', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch order feedback' });
  }
});

// GET /api/feedbacks/stats - Get feedback statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await Feedback.getAverageRatings();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch feedback statistics', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch feedback statistics' });
  }
});

// GET /api/feedbacks/:id - Get a specific feedback
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    logger.error('Failed to fetch feedback', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch feedback' });
  }
});

// POST /api/feedbacks - Create a new feedback
router.post('/', async (req: Request<object, object, FeedbackRequestBody>, res: Response) => {
  try {
    const { orderId, rating, comment, productQuality, deliveryExperience, customerService, isPublic } = req.body;

    // Validate orderId
    if (!orderId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Order ID is required' });
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: 'Feedback can only be submitted for completed orders' 
      });
    }

    // Check if feedback already exists for this order
    const existingFeedback = await Feedback.findByOrderId(orderId);
    if (existingFeedback) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: 'Feedback already exists for this order' 
      });
    }

    // Validate overall rating
    const ratingValidation = validateRating(rating, 'Overall rating');
    if (!ratingValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ratingValidation.error });
    }

    // Validate optional ratings
    const productQualityValidation = validateOptionalRating(productQuality, 'Product quality rating');
    if (!productQualityValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: productQualityValidation.error });
    }

    const deliveryValidation = validateOptionalRating(deliveryExperience, 'Delivery experience rating');
    if (!deliveryValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: deliveryValidation.error });
    }

    const serviceValidation = validateOptionalRating(customerService, 'Customer service rating');
    if (!serviceValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: serviceValidation.error });
    }

    // Validate comment
    const commentValidation = validateComment(comment);
    if (!commentValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: commentValidation.error });
    }

    const newFeedback = await Feedback.create({
      orderId: createOrderId(Number.parseInt(String(orderId), 10)),
      rating: ratingValidation.parsedRating!,
      comment: comment || '',
      productQuality: productQualityValidation.parsedRating ?? null,
      deliveryExperience: deliveryValidation.parsedRating ?? null,
      customerService: serviceValidation.parsedRating ?? null,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true
    });

    logger.info('Feedback created', { feedbackId: newFeedback._id, orderId: orderId });
    res.status(201).json(newFeedback);
  } catch (error) {
    logger.error('Failed to create feedback', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create feedback' });
  }
});

// PUT /api/feedbacks/:id - Update a feedback
router.put('/:id', async (req: Request<{ id: string }, object, FeedbackRequestBody>, res: Response) => {
  try {
    const { rating, comment, productQuality, deliveryExperience, customerService, isPublic, responseText } = req.body;

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingValidation = validateRating(rating, 'Overall rating');
      if (!ratingValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ratingValidation.error });
      }
    }

    // Validate optional ratings if provided
    if (productQuality !== undefined) {
      const productQualityValidation = validateOptionalRating(productQuality, 'Product quality rating');
      if (!productQualityValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: productQualityValidation.error });
      }
    }

    if (deliveryExperience !== undefined) {
      const deliveryValidation = validateOptionalRating(deliveryExperience, 'Delivery experience rating');
      if (!deliveryValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: deliveryValidation.error });
      }
    }

    if (customerService !== undefined) {
      const serviceValidation = validateOptionalRating(customerService, 'Customer service rating');
      if (!serviceValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: serviceValidation.error });
      }
    }

    // Validate comment if provided
    if (comment !== undefined) {
      const commentValidation = validateComment(comment);
      if (!commentValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: commentValidation.error });
      }
    }

    // Validate response if provided
    if (responseText !== undefined) {
      const responseValidation = validateResponse(responseText);
      if (!responseValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: responseValidation.error });
      }
    }

    const updateData: Record<string, number | string | boolean | null> = {};
    if (rating !== undefined) updateData.rating = Number.parseInt(String(rating), 10);
    if (comment !== undefined) updateData.comment = comment;
    if (productQuality !== undefined) updateData.productQuality = productQuality ? Number.parseInt(String(productQuality), 10) : null;
    if (deliveryExperience !== undefined) updateData.deliveryExperience = deliveryExperience ? Number.parseInt(String(deliveryExperience), 10) : null;
    if (customerService !== undefined) updateData.customerService = customerService ? Number.parseInt(String(customerService), 10) : null;
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (responseText !== undefined) updateData.responseText = responseText;

    const updatedFeedback = await Feedback.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedFeedback) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Feedback not found' });
    }

    logger.info('Feedback updated', { feedbackId: req.params.id });
    res.json(updatedFeedback);
  } catch (error) {
    logger.error('Failed to update feedback', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update feedback' });
  }
});

export default router;
