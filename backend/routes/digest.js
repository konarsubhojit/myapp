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
 * Supports both X-DIGEST-SECRET header and Vercel's CRON_SECRET authorization
 */
function verifyDigestSecret(req, res, next) {
  const providedSecret = req.headers['x-digest-secret'];
  const expectedSecret = process.env.DIGEST_JOB_SECRET;
  
  // Also check for Vercel Cron's authorization header
  const authHeader = req.headers['authorization'];
  const vercelCronSecret = process.env.CRON_SECRET;

  // Check X-DIGEST-SECRET first
  if (expectedSecret && providedSecret === expectedSecret) {
    return next();
  }
  
  // Check Vercel's CRON_SECRET authorization
  if (vercelCronSecret && authHeader === `Bearer ${vercelCronSecret}`) {
    logger.debug('Verified via Vercel CRON_SECRET');
    return next();
  }

  // Neither authentication method worked
  if (!expectedSecret && !vercelCronSecret) {
    logger.error('Neither DIGEST_JOB_SECRET nor CRON_SECRET environment variable is set');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Server configuration error'
    });
  }

  logger.warn('Invalid or missing digest secret', { 
    hasXDigestSecret: !!providedSecret,
    hasAuthHeader: !!authHeader,
    ip: req.ip 
  });
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    message: 'Invalid or missing authentication'
  });
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
