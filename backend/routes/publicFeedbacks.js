import express from 'express';
const router = express.Router();
import Feedback from '../models/Feedback.js';
import FeedbackToken from '../models/FeedbackToken.js';
import Order from '../models/Order.js';
import { createLogger } from '../utils/logger.js';
import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH
} from '../constants/feedbackConstants.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';

const logger = createLogger('PublicFeedbacksRoute');

function validateRating(rating, fieldName = 'rating') {
  if (rating === undefined || rating === null) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const parsedRating = Number.parseInt(rating, 10);
  if (Number.isNaN(parsedRating) || parsedRating < MIN_RATING || parsedRating > MAX_RATING) {
    return { valid: false, error: `${fieldName} must be between ${MIN_RATING} and ${MAX_RATING}` };
  }
  
  return { valid: true, parsedRating };
}

function validateOptionalRating(rating, fieldName) {
  if (rating === undefined || rating === null) {
    return { valid: true, parsedRating: null };
  }
  
  return validateRating(rating, fieldName);
}

function validateComment(comment) {
  if (comment && typeof comment === 'string' && comment.length > MAX_COMMENT_LENGTH) {
    return { valid: false, error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters` };
  }
  return { valid: true };
}

// POST /api/public/feedbacks/validate-token - Validate token and return order info
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Token is required' });
    }

    // Validate token
    const tokenData = await FeedbackToken.validateToken(token);
    if (!tokenData) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: 'Invalid or expired token' 
      });
    }

    // Get order details
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findByOrderId(tokenData.orderId);

    res.json({
      order: {
        _id: order._id,
        orderId: order.orderId,
        status: order.status
      },
      hasExistingFeedback: !!existingFeedback
    });
  } catch (error) {
    logger.error('Failed to validate token', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to validate token' });
  }
});

// POST /api/public/feedbacks - Public endpoint for customers to submit feedback
router.post('/', async (req, res) => {
  try {
    const { token, rating, comment, productQuality, deliveryExperience, customerService, isPublic } = req.body;

    // Validate token
    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Token is required' });
    }

    // Validate and get order from token
    const tokenData = await FeedbackToken.validateToken(token);
    if (!tokenData) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: 'Invalid or expired token' 
      });
    }

    const orderId = tokenData.orderId;

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
      orderId: Number.parseInt(orderId, 10),
      rating: ratingValidation.parsedRating,
      comment: comment || '',
      productQuality: productQualityValidation.parsedRating,
      deliveryExperience: deliveryValidation.parsedRating,
      customerService: serviceValidation.parsedRating,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true
    });

    // Mark token as used
    await FeedbackToken.markAsUsed(token);

    logger.info('Public feedback created', { feedbackId: newFeedback._id, orderId: orderId, tokenUsed: token });
    res.status(201).json(newFeedback);
  } catch (error) {
    logger.error('Failed to create public feedback', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create feedback' });
  }
});

export default router;
