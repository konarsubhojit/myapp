import type {
  Item,
  ItemId,
  Order,
  Feedback,
  CreateItemData,
  UpdateItemData,
  CreateOrderData,
  UpdateOrderData,
  CreateFeedbackData,
  UpdateFeedbackData,
  PaginatedResult,
  PaginatedOrdersResult,
  PaginatedFeedbacksResult,
  CursorPaginatedOrdersResult,
  CursorPaginationParams,
  FeedbackStats,
  TokenGenerationResponse,
  PaginationParams,
  SearchPaginationParams,
  CursorSearchPaginationParams,
  CursorPaginatedResult
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token getter function - will be set by AuthProvider
type TokenGetter = () => Promise<string | null>;
type GuestModeChecker = () => boolean;

let getAccessTokenFn: TokenGetter | null = null;
let isGuestModeFn: GuestModeChecker | null = null;

/**
 * Set the function to get access token
 * This should be called by AuthProvider after initialization
 */
export const setAccessTokenGetter = (getter: TokenGetter): void => {
  getAccessTokenFn = getter;
};

/**
 * Set the function to check if guest mode is enabled
 */
export const setGuestModeChecker = (checker: GuestModeChecker): void => {
  isGuestModeFn = checker;
};

/**
 * Get authorization headers with bearer token
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
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
type UnauthorizedCallback = () => void;
let onUnauthorizedCallback: UnauthorizedCallback | null = null;

/**
 * Set callback to be called when an unauthorized (401) response is received
 */
export const setOnUnauthorizedCallback = (callback: UnauthorizedCallback): void => {
  onUnauthorizedCallback = callback;
};

interface MockDataResult {
  items?: Item[];
  orders?: Order[];
  feedbacks?: Feedback[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  page?: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Generate dummy items for guest mode testing
 */
function generateDummyItems(): Item[] {
  return [
    {
      id: 1 as ItemId,
      _id: 1 as ItemId,
      name: 'Cotton Kurta',
      price: 899,
      color: 'Blue',
      fabric: 'Cotton',
      specialFeatures: 'Handwoven, Lightweight',
      imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    },
    {
      id: 2 as ItemId,
      _id: 2 as ItemId,
      name: 'Silk Saree',
      price: 2499,
      color: 'Red',
      fabric: 'Silk',
      specialFeatures: 'Embroidered, Traditional',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    },
    {
      id: 3 as ItemId,
      _id: 3 as ItemId,
      name: 'Linen Shirt',
      price: 1299,
      color: 'White',
      fabric: 'Linen',
      specialFeatures: 'Breathable, Casual',
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    },
    {
      id: 4 as ItemId,
      _id: 4 as ItemId,
      name: 'Denim Jeans',
      price: 1599,
      color: 'Blue',
      fabric: 'Denim',
      specialFeatures: 'Stretchable, Durable',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    },
    {
      id: 5 as ItemId,
      _id: 5 as ItemId,
      name: 'Woolen Sweater',
      price: 1899,
      color: 'Grey',
      fabric: 'Wool',
      specialFeatures: 'Warm, Winter Collection',
      imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    },
  ];
}

function getCursorPaginatedMockData(dummyItems: Item[]): MockDataResult {
  return {
    items: dummyItems,
    page: {
      limit: 10,
      nextCursor: null,
      hasMore: false
    }
  };
}

function getPagePaginatedMockData(url: string, dummyItems: Item[]): MockDataResult {
  let dataKey: 'items' | 'orders' | 'feedbacks' = 'items';
  let data: Item[] | Order[] | Feedback[] = [];
  
  if (url.includes('/orders')) {
    dataKey = 'orders';
  } else if (url.includes('/feedbacks')) {
    dataKey = 'feedbacks';
  } else if (url.includes('/items')) {
    dataKey = 'items';
    data = dummyItems;
  }
  
  return { 
    [dataKey]: data, 
    pagination: { page: 1, limit: 10, total: data.length, totalPages: 1 } 
  } as MockDataResult;
}

function getSingleItemMockData(options: RequestInit): Record<string, string> | Record<string, never> {
  const isModifyingRequest = options.method === 'PUT' || options.method === 'DELETE' || options.method === 'POST';
  return isModifyingRequest ? { message: 'Success' } : {};
}

function getItemsEndpointMockData(url: string, dummyItems: Item[]): MockDataResult | Item[] {
  const hasQueryParams = url.includes('?');
  if (hasQueryParams) {
    return getCursorPaginatedMockData(dummyItems);
  }
  return dummyItems;
}

function getMockDataForGuestMode(url: string, options: RequestInit): MockDataResult | Item[] | Order[] | Feedback[] | Record<string, string> | Record<string, never> {
  const dummyItems = generateDummyItems();
  
  const isCursorPaginated = url.includes('/items') && (url.includes('?cursor=') || url.includes('&cursor=') || url.includes('?limit=') || url.includes('&limit='));
  if (isCursorPaginated) {
    return getCursorPaginatedMockData(dummyItems);
  }
  
  const isPagePaginated = url.includes('?page=') || url.includes('&page=');
  if (isPagePaginated) {
    return getPagePaginatedMockData(url, dummyItems);
  }
  
  const isSingleItemEndpoint = /\/(items|orders|feedbacks)\/[^/]+$/.test(url);
  if (isSingleItemEndpoint) {
    return getSingleItemMockData(options);
  }
  
  if (url.includes('/items')) {
    return getItemsEndpointMockData(url, dummyItems);
  }
  
  return [];
}

/**
 * Wrapper for fetch that includes auth headers
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (isGuestModeFn?.()) {
    console.log('[API] Guest mode active - skipping API call to:', url);
    const mockData = getMockDataForGuestMode(url, options);
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
export const getItems = async (): Promise<Item[]> => {
  const response = await authFetch(`${API_BASE_URL}/items`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

// Items API - Cursor-based pagination
export const getItemsPaginated = async ({ 
  limit = 10, 
  cursor = null,
  search = '' 
}: CursorSearchPaginationParams = {}): Promise<CursorPaginatedResult<Item>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  if (search) params.append('search', search);
  
  const response = await authFetch(`${API_BASE_URL}/items?${params}`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
};

export const getDeletedItems = async ({ 
  limit = 10,
  cursor = null,
  search = '' 
}: CursorSearchPaginationParams = {}): Promise<CursorPaginatedResult<Item>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  if (search) params.append('search', search);
  
  const response = await authFetch(`${API_BASE_URL}/items/deleted?${params}`);
  if (!response.ok) throw new Error('Failed to fetch deleted items');
  return response.json();
};

export const createItem = async (item: CreateItemData): Promise<Item> => {
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

export const updateItem = async (id: number | string, item: UpdateItemData): Promise<Item> => {
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

export const deleteItem = async (id: number | string): Promise<{ message: string }> => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete item');
  }
  return response.json();
};

export const restoreItem = async (id: number | string): Promise<Item> => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}/restore`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to restore item');
  }
  return response.json();
};

export const permanentlyDeleteItem = async (id: number | string): Promise<{ message: string }> => {
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
export const getOrders = async (): Promise<Order[]> => {
  const response = await authFetch(`${API_BASE_URL}/orders/all`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrdersPaginated = async ({ 
  page = 1, 
  limit = 10 
}: PaginationParams = {}): Promise<PaginatedOrdersResult> => {
  const response = await authFetch(`${API_BASE_URL}/orders?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const getOrdersCursorPaginated = async ({ 
  limit = 10,
  cursor = null
}: CursorPaginationParams = {}): Promise<CursorPaginatedOrdersResult> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  
  const response = await authFetch(`${API_BASE_URL}/orders/cursor?${params}`);
  if (!response.ok) throw new Error('Failed to fetch orders with cursor pagination');
  return response.json();
};

export const getPriorityOrders = async (): Promise<Order[]> => {
  const response = await authFetch(`${API_BASE_URL}/orders/priority`);
  if (!response.ok) throw new Error('Failed to fetch priority orders');
  return response.json();
};

export const getOrder = async (id: number | string): Promise<Order> => {
  const response = await authFetch(`${API_BASE_URL}/orders/${id}`);
  if (!response.ok) throw new Error('Failed to fetch order');
  return response.json();
};

export const createOrder = async (order: CreateOrderData): Promise<Order> => {
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

export const updateOrder = async (id: number | string, order: UpdateOrderData): Promise<Order> => {
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

// Feedbacks API
export const getFeedbacks = async (): Promise<Feedback[]> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks`);
  if (!response.ok) throw new Error('Failed to fetch feedbacks');
  return response.json();
};

export const getFeedbacksPaginated = async ({ 
  page = 1, 
  limit = 10 
}: PaginationParams = {}): Promise<PaginatedFeedbacksResult> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch feedbacks');
  return response.json();
};

export const getFeedbackStats = async (): Promise<FeedbackStats> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks/stats`);
  if (!response.ok) throw new Error('Failed to fetch feedback statistics');
  return response.json();
};

export const getFeedback = async (id: number | string): Promise<Feedback> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks/${id}`);
  if (!response.ok) throw new Error('Failed to fetch feedback');
  return response.json();
};

export const getFeedbackByOrderId = async (orderId: number | string): Promise<Feedback | null> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks/order/${orderId}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch order feedback');
  }
  return response.json();
};

export const createFeedback = async (feedback: CreateFeedbackData): Promise<Feedback> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create feedback');
  }
  return response.json();
};

export const updateFeedback = async (id: number | string, feedback: UpdateFeedbackData): Promise<Feedback> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(feedback),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update feedback');
  }
  return response.json();
};

export const generateFeedbackToken = async (orderId: number | string): Promise<TokenGenerationResponse> => {
  const response = await authFetch(`${API_BASE_URL}/feedbacks/generate-token/${orderId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate feedback token');
  }
  return response.json();
};

// Analytics API
export const getSalesAnalytics = async (statusFilter: 'completed' | 'all' = 'completed'): Promise<import('../types').SalesAnalyticsResponse> => {
  const response = await authFetch(`${API_BASE_URL}/analytics/sales?statusFilter=${statusFilter}`);
  if (!response.ok) throw new Error('Failed to fetch sales analytics');
  return response.json();
};
