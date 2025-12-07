const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token getter function - will be set by AuthProvider
let getAccessTokenFn = null;

// Guest mode flag
let isGuestModeFn = null;

/**
 * Set the function to get access token
 * This should be called by AuthProvider after initialization
 */
export const setAccessTokenGetter = (getter) => {
  getAccessTokenFn = getter;
};

/**
 * Set the function to check if guest mode is enabled
 * @param {Function} checker - Function that returns true if guest mode is enabled
 */
export const setGuestModeChecker = (checker) => {
  isGuestModeFn = checker;
};

/**
 * Get authorization headers with bearer token
 * @returns {Promise<Object>} Headers object with Authorization
 */
async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (getAccessTokenFn) {
    try {
      const token = await getAccessTokenFn();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
    }
  }

  return headers;
}

// Callback for handling unauthorized responses
let onUnauthorizedCallback = null;

/**
 * Set callback to be called when an unauthorized (401) response is received
 * @param {Function} callback - Function to call on 401 response
 */
export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

/**
 * Wrapper for fetch that includes auth headers
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function authFetch(url, options = {}) {
  // Check if guest mode is enabled
  if (isGuestModeFn?.()) {
    console.log('[API] Guest mode active - skipping API call to:', url);
    // Return mock empty response for guest mode
    // Check if this is a paginated endpoint (contains query params like page, limit)
    let mockData;
    if (url.includes('?page=') || url.includes('&page=')) {
      // Paginated endpoint - return pagination structure
      // Determine if it's items or orders based on URL
      const dataKey = url.includes('/orders') ? 'orders' : 'items';
      mockData = { 
        [dataKey]: [], 
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
      };
    } else if (url.includes('/items/') || url.includes('/orders/')) {
      // Single item endpoint - return empty object
      mockData = {};
    } else {
      // List endpoint without pagination - return empty array
      mockData = [];
    }
    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
  
  // If unauthorized, notify callback to handle re-authentication
  if (response.status === 401) {
    console.warn('Unauthorized request - token may be expired or invalid');
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }
  
  return response;
}

// Items API
export const getItems = async () => {
  const response = await authFetch(`${API_BASE_URL}/items`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

export const getItemsPaginated = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  
  const response = await authFetch(`${API_BASE_URL}/items?${params}`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

export const getDeletedItems = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  
  const response = await authFetch(`${API_BASE_URL}/items/deleted?${params}`);
  if (!response.ok) throw new Error('Failed to fetch deleted items');
  return response.json();
};

export const createItem = async (item) => {
  const response = await authFetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create item');
  }
  return response.json();
};

export const updateItem = async (id, item) => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update item');
  }
  return response.json();
};

export const deleteItem = async (id) => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete item');
  }
  return response.json();
};

export const restoreItem = async (id) => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}/restore`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to restore item');
  }
  return response.json();
};

export const permanentlyDeleteItem = async (id) => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}/permanent`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to permanently delete item');
  }
  return response.json();
};

// Orders API
export const getOrders = async () => {
  const response = await authFetch(`${API_BASE_URL}/orders`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrdersPaginated = async ({ page = 1, limit = 10 } = {}) => {
  const response = await authFetch(`${API_BASE_URL}/orders?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrder = async (id) => {
  const response = await authFetch(`${API_BASE_URL}/orders/${id}`);
  if (!response.ok) throw new Error('Failed to fetch order');
  return response.json();
};

export const createOrder = async (order) => {
  const response = await authFetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }
  return response.json();
};

export const updateOrder = async (id, order) => {
  const response = await authFetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order');
  }
  return response.json();
};
