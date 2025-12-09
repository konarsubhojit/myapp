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
 * Get order details by ID
 */
export const getOrder = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    throw new Error('Failed to fetch order details');
  }
  
  return response.json();
};

/**
 * Check if feedback already exists for an order
 */
export const getFeedbackByOrderId = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/feedbacks/order/${orderId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to check feedback status');
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
