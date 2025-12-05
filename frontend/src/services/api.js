const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token getter function - will be set by AuthProvider
let getAccessTokenFn = null;

/**
 * Set the function to get access token
 * This should be called by AuthProvider after initialization
 */
export const setAccessTokenGetter = (getter) => {
  getAccessTokenFn = getter;
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
