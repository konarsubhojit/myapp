const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Items API
export const getItems = async () => {
  const response = await fetch(`${API_BASE_URL}/items`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

export const getItemsPaginated = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  
  const response = await fetch(`${API_BASE_URL}/items?${params}`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

export const getDeletedItems = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  
  const response = await fetch(`${API_BASE_URL}/items/deleted?${params}`);
  if (!response.ok) throw new Error('Failed to fetch deleted items');
  return response.json();
};

export const createItem = async (item) => {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create item');
  }
  return response.json();
};

export const updateItem = async (id, item) => {
  const response = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update item');
  }
  return response.json();
};

export const deleteItem = async (id) => {
  const response = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete item');
  }
  return response.json();
};

export const restoreItem = async (id) => {
  const response = await fetch(`${API_BASE_URL}/items/${id}/restore`, {
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
  const response = await fetch(`${API_BASE_URL}/orders`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrdersPaginated = async ({ page = 1, limit = 10 } = {}) => {
  const response = await fetch(`${API_BASE_URL}/orders?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrder = async (id) => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`);
  if (!response.ok) throw new Error('Failed to fetch order');
  return response.json();
};

export const createOrder = async (order) => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }
  return response.json();
};

export const updateOrder = async (id, order) => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order');
  }
  return response.json();
};
