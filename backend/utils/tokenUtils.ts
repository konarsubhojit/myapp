import crypto from 'crypto';
import type { TokenGenerationResult } from '../types/index.js';

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default 32)
 * @returns Hex-encoded token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure feedback token that expires in specified days
 * @param expiryDays - Number of days until token expires (default 30)
 * @returns Object with token and expiresAt date
 */
export function generateFeedbackToken(expiryDays = 30): TokenGenerationResult {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  
  return {
    token,
    expiresAt
  };
}
