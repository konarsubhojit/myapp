const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get authorization headers (none needed for public feedback app)
 */
function getHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Validate token and get order details
 */
export const validateToken = async (token) => {
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
  
  return response.json();
};

/**
 * Submit feedback for an order (public endpoint)
 */
export const createFeedback = async (feedback) => {
  const response = await fetch(`${API_BASE_URL}/public/feedbacks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(feedback),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit feedback');
  }
  
  return response.json();
};
