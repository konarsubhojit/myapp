import express from 'express';
import { createLogger } from '../utils/logger.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { runDailyDigest } from '../services/digestService.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';

const router = express.Router();
const logger = createLogger('DigestRoute');

/**
 * Middleware to verify digest job secret
 * Protects the internal digest endpoint from unauthorized access
 */
function verifyDigestSecret(req, res, next) {
  const providedSecret = req.headers['x-digest-secret'];
  const expectedSecret = process.env.DIGEST_JOB_SECRET;

  if (!expectedSecret) {
    logger.error('DIGEST_JOB_SECRET environment variable is not set');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Server configuration error'
    });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    logger.warn('Invalid or missing digest secret', { 
      hasSecret: !!providedSecret,
      ip: req.ip 
    });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: 'Invalid or missing X-DIGEST-SECRET header'
    });
  }

  next();
}

/**
 * POST /api/internal/digest/run
 * Trigger the daily digest email
 * 
 * Protected by X-DIGEST-SECRET header (must match DIGEST_JOB_SECRET env var)
 * This is meant to be triggered by Vercel Cron at 09:00 IST (03:30 UTC)
 */
router.post('/run', verifyDigestSecret, asyncHandler(async (req, res) => {
  logger.info('Digest run triggered');

  try {
    const result = await runDailyDigest();
    
    if (result.status === 'already_sent') {
      return res.status(HTTP_STATUS.OK).json({
        message: 'Digest already sent for today',
        digestDate: result.digestDate
      });
    }
    
    return res.status(HTTP_STATUS.OK).json({
      message: 'Digest completed successfully',
      ...result
    });
  } catch (error) {
    logger.error('Digest run failed', error);
    
    // Return 500 so Vercel Cron can detect failure
    // The digest service already marked the run as failed in the database
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Digest failed',
      error: error.message
    });
  }
}));

export default router;
