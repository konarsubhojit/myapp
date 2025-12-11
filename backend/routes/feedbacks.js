import express from 'express';
const router = express.Router();
import Feedback from '../models/Feedback.js';
import FeedbackToken from '../models/FeedbackToken.js';
import Order from '../models/Order.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler, badRequestError, notFoundError } from '../utils/errorHandler.js';
import { parsePaginationParams } from '../utils/pagination.js';
import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_RESPONSE_LENGTH
} from '../constants/feedbackConstants.js';
import { PAGINATION } from '../constants/paginationConstants.js';

const logger = createLogger('FeedbacksRoute');

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

function validateResponse(responseText) {
  if (responseText && typeof responseText === 'string' && responseText.length > MAX_RESPONSE_LENGTH) {
    return { valid: false, error: `Response cannot exceed ${MAX_RESPONSE_LENGTH} characters` };
  }
  return { valid: true };
}

// POST /api/feedbacks/generate-token/:orderId - Generate secure feedback token for an order
router.post('/generate-token/:orderId', asyncHandler(async (req, res) => {
  const orderId = req.params.orderId;
  
  // Check if order exists and is completed
  const order = await Order.findById(orderId);
  if (!order) {
    throw notFoundError('Order');
  }
  
  if (order.status !== 'completed') {
    throw badRequestError('Feedback tokens can only be generated for completed orders');
  }
  
  // Check if feedback already exists
  const existingFeedback = await Feedback.findByOrderId(orderId);
  if (existingFeedback) {
    throw badRequestError('Feedback already submitted for this order');
  }
  
  // Generate or get existing token
  const tokenData = await FeedbackToken.getOrCreateForOrder(Number.parseInt(orderId, 10));
  
  logger.info('Feedback token generated', { orderId, tokenId: tokenData.id });
  res.json({
    token: tokenData.token,
    orderId: tokenData.orderId,
    expiresAt: tokenData.expiresAt
  });
}));

// GET /api/feedbacks - Get all feedbacks with optional pagination
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit } = parsePaginationParams(req.query);
  
  if (req.query.page || req.query.limit) {
    const result = await Feedback.findPaginated({ page, limit });
    res.json(result);
  } else {
    const feedbacksList = await Feedback.find();
    res.json(feedbacksList);
  }
}));

// GET /api/feedbacks/order/:orderId - Get feedback for a specific order
router.get('/order/:orderId', asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByOrderId(req.params.orderId);
  if (!feedback) {
    throw notFoundError('Feedback for this order');
  }
  res.json(feedback);
}));

// GET /api/feedbacks/stats - Get feedback statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await Feedback.getAverageRatings();
  res.json(stats);
}));

// GET /api/feedbacks/:id - Get a specific feedback
router.get('/:id', asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    throw notFoundError('Feedback');
  }
  res.json(feedback);
}));

// POST /api/feedbacks - Create a new feedback
router.post('/', asyncHandler(async (req, res) => {
  const { orderId, rating, comment, productQuality, deliveryExperience, isPublic } = req.body;

  // Validate orderId
  if (!orderId) {
    throw badRequestError('Order ID is required');
  }

  // Check if order exists
  const order = await Order.findById(orderId);
  if (!order) {
    throw notFoundError('Order');
  }

  // Check if order is completed
  if (order.status !== 'completed') {
    throw badRequestError('Feedback can only be submitted for completed orders');
  }

  // Check if feedback already exists for this order
  const existingFeedback = await Feedback.findByOrderId(orderId);
  if (existingFeedback) {
    throw badRequestError('Feedback already exists for this order');
  }

  // Validate overall rating
  const ratingValidation = validateRating(rating, 'Overall rating');
  if (!ratingValidation.valid) {
    throw badRequestError(ratingValidation.error);
  }

  // Validate optional ratings
  const productQualityValidation = validateOptionalRating(productQuality, 'Product quality rating');
  if (!productQualityValidation.valid) {
    throw badRequestError(productQualityValidation.error);
  }

  const deliveryValidation = validateOptionalRating(deliveryExperience, 'Delivery experience rating');
  if (!deliveryValidation.valid) {
    throw badRequestError(deliveryValidation.error);
  }

  // Validate comment
  const commentValidation = validateComment(comment);
  if (!commentValidation.valid) {
    throw badRequestError(commentValidation.error);
  }

  const newFeedback = await Feedback.create({
    orderId: Number.parseInt(orderId, 10),
    rating: ratingValidation.parsedRating,
    comment: comment || '',
    productQuality: productQualityValidation.parsedRating,
    deliveryExperience: deliveryValidation.parsedRating,
    isPublic: isPublic !== undefined ? Boolean(isPublic) : true
  });

  logger.info('Feedback created', { feedbackId: newFeedback._id, orderId: orderId });
  res.status(201).json(newFeedback);
}));

// PUT /api/feedbacks/:id - Update a feedback
router.put('/:id', asyncHandler(async (req, res) => {
  const { rating, comment, productQuality, deliveryExperience, isPublic, responseText } = req.body;

  // Validate rating if provided
  if (rating !== undefined) {
    const ratingValidation = validateRating(rating, 'Overall rating');
    if (!ratingValidation.valid) {
      throw badRequestError(ratingValidation.error);
    }
  }

  // Validate optional ratings if provided
  if (productQuality !== undefined) {
    const productQualityValidation = validateOptionalRating(productQuality, 'Product quality rating');
    if (!productQualityValidation.valid) {
      throw badRequestError(productQualityValidation.error);
    }
  }

  if (deliveryExperience !== undefined) {
    const deliveryValidation = validateOptionalRating(deliveryExperience, 'Delivery experience rating');
    if (!deliveryValidation.valid) {
      throw badRequestError(deliveryValidation.error);
    }
  }

  // Validate comment if provided
  if (comment !== undefined) {
    const commentValidation = validateComment(comment);
    if (!commentValidation.valid) {
      throw badRequestError(commentValidation.error);
    }
  }

  // Validate response if provided
  if (responseText !== undefined) {
    const responseValidation = validateResponse(responseText);
    if (!responseValidation.valid) {
      throw badRequestError(responseValidation.error);
    }
  }

  const updateData = {};
  if (rating !== undefined) updateData.rating = Number.parseInt(rating, 10);
  if (comment !== undefined) updateData.comment = comment;
  if (productQuality !== undefined) updateData.productQuality = productQuality ? Number.parseInt(productQuality, 10) : null;
  if (deliveryExperience !== undefined) updateData.deliveryExperience = deliveryExperience ? Number.parseInt(deliveryExperience, 10) : null;
  if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
  if (responseText !== undefined) updateData.responseText = responseText;

  const updatedFeedback = await Feedback.findByIdAndUpdate(req.params.id, updateData);
  if (!updatedFeedback) {
    throw notFoundError('Feedback');
  }

  logger.info('Feedback updated', { feedbackId: req.params.id });
  res.json(updatedFeedback);
}));

export default router;
