import type { TokenValidationResponse, FeedbackSubmissionData, FeedbackResponse, ApiError } from '../types';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get headers for API requests
 */
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Validate token and get order details
 */
export const validateToken = async (token: string): Promise<TokenValidationResponse> => {
  const response = await fetch(`${API_BASE_URL}/public/feedbacks/validate-token`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ token }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired feedback link');
    }
    throw new Error('Failed to validate feedback link');
  }
  
  const data: TokenValidationResponse = await response.json();
  return data;
};

/**
 * Submit feedback for an order (public endpoint)
 */
export const createFeedback = async (feedback: FeedbackSubmissionData): Promise<FeedbackResponse> => {
  const response = await fetch(`${API_BASE_URL}/public/feedbacks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(feedback),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to submit feedback');
  }
  
  const data: FeedbackResponse = await response.json();
  return data;
};
