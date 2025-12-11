import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateToken, createFeedback } from '../services/api';
import type { TokenValidationResponse, FeedbackSubmissionData, FeedbackResponse, OrderId, FeedbackId } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateToken', () => {
    it('should validate token and return order data', async () => {
      const mockResponse: TokenValidationResponse = {
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-001',
          status: 'completed'
        },
        hasExistingFeedback: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await validateToken('valid-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/public/feedbacks/validate-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'valid-token' })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(validateToken('invalid-token')).rejects.toThrow(
        'Invalid or expired feedback link'
      );
    });

    it('should throw error for other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(validateToken('token')).rejects.toThrow(
        'Failed to validate feedback link'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(validateToken('token')).rejects.toThrow('Network error');
    });
  });

  describe('createFeedback', () => {
    it('should submit feedback successfully', async () => {
      const mockFeedback: FeedbackSubmissionData = {
        token: 'valid-token',
        rating: 5,
        comment: 'Great service!',
        productQuality: 5,
        deliveryExperience: 4,
      };

      const mockResponse: FeedbackResponse = {
        id: 1 as FeedbackId,
        orderId: 123 as OrderId,
        rating: 5,
        comment: 'Great service!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await createFeedback(mockFeedback);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/public/feedbacks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockFeedback)
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error with message from server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Token expired' })
      });

      await expect(createFeedback({
        token: 'expired-token',
        rating: 5,
        comment: '',
        productQuality: 0,
        deliveryExperience: 0,
      })).rejects.toThrow('Token expired');
    });

    it('should throw default error when no message provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({})
      });

      await expect(createFeedback({
        token: 'token',
        rating: 5,
        comment: '',
        productQuality: 0,
        deliveryExperience: 0,
      })).rejects.toThrow('Failed to submit feedback');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(createFeedback({
        token: 'token',
        rating: 5,
        comment: '',
        productQuality: 0,
        deliveryExperience: 0,
      })).rejects.toThrow('Network error');
    });
  });
});
