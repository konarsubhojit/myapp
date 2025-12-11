import type { ItemId, OrderId, OrderItemId, FeedbackId, FeedbackTokenId } from './brandedIds.js';

// Order source enum type
export type OrderSource = 'instagram' | 'facebook' | 'whatsapp' | 'call' | 'offline';

// Order status enum type
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Payment status enum type
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cash_on_delivery' | 'refunded';

// Confirmation status enum type
export type ConfirmationStatus = 'unconfirmed' | 'pending_confirmation' | 'confirmed' | 'cancelled';

// Delivery status enum type
export type DeliveryStatus = 'not_shipped' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned';

// Database row types (raw from database)
export interface ItemRow {
  id: number;
  name: string;
  price: string;
  color: string | null;
  fabric: string | null;
  specialFeatures: string | null;
  imageUrl: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface OrderRow {
  id: number;
  orderId: string;
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address: string | null;
  totalPrice: string;
  status: string | null;
  paymentStatus: string | null;
  paidAmount: string | null;
  confirmationStatus: string | null;
  customerNotes: string | null;
  priority: number | null;
  orderDate: Date | null;
  expectedDeliveryDate: Date | null;
  deliveryStatus: string | null;
  trackingId: string | null;
  deliveryPartner: string | null;
  actualDeliveryDate: Date | null;
  createdAt: Date;
}

export interface OrderItemRow {
  id: number;
  orderId: number;
  itemId: number;
  name: string;
  price: string;
  quantity: number;
  customizationRequest: string | null;
}

export interface FeedbackRow {
  id: number;
  orderId: number;
  rating: number;
  comment: string | null;
  productQuality: number | null;
  deliveryExperience: number | null;
  customerService: number | null;
  isPublic: number | null;
  responseText: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackTokenRow {
  id: number;
  orderId: number;
  token: string;
  used: number | null;
  expiresAt: Date;
  createdAt: Date;
}

// Transformed types (after processing from database)
export interface Item {
  id: ItemId;
  _id: ItemId;
  name: string;
  price: number;
  color: string;
  fabric: string;
  specialFeatures: string;
  imageUrl: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface OrderItem {
  id: OrderItemId;
  _id: OrderItemId;
  item: ItemId;
  name: string;
  price: number;
  quantity: number;
  customizationRequest: string;
}

export interface Order {
  id: OrderId;
  _id: OrderId;
  orderId: string;
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address: string;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  confirmationStatus: ConfirmationStatus;
  customerNotes: string;
  priority: number;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  deliveryStatus: DeliveryStatus;
  trackingId: string;
  deliveryPartner: string;
  actualDeliveryDate: string | null;
  createdAt: Date;
  items: OrderItem[];
}

export interface Feedback {
  id: FeedbackId;
  _id: FeedbackId;
  orderId: OrderId;
  rating: number;
  comment: string;
  productQuality: number | null;
  deliveryExperience: number | null;
  customerService: number | null;
  isPublic: boolean;
  responseText: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackToken {
  id: FeedbackTokenId;
  orderId: OrderId;
  token: string;
  used: number | null;
  expiresAt: Date;
  createdAt: Date;
}

// Create/Update DTOs
export interface CreateItemData {
  name: string;
  price: number;
  color?: string;
  fabric?: string;
  specialFeatures?: string;
  imageUrl?: string;
}

export interface UpdateItemData {
  name?: string;
  price?: number;
  color?: string;
  fabric?: string;
  specialFeatures?: string;
  imageUrl?: string;
}

export interface CreateOrderItemData {
  item: ItemId;
  name: string;
  price: number;
  quantity: number;
  customizationRequest?: string;
}

export interface CreateOrderData {
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address?: string;
  orderDate?: string | Date;
  items: CreateOrderItemData[];
  totalPrice: number;
  expectedDeliveryDate?: Date | null;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  confirmationStatus?: ConfirmationStatus;
  customerNotes?: string;
  priority?: number;
  deliveryStatus?: DeliveryStatus;
  trackingId?: string;
  deliveryPartner?: string;
  actualDeliveryDate?: Date | null;
}

export interface UpdateOrderData {
  orderFrom?: OrderSource;
  customerName?: string;
  customerId?: string;
  address?: string | null;
  orderDate?: string | Date | null;
  items?: CreateOrderItemData[];
  totalPrice?: number;
  expectedDeliveryDate?: Date | null;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  confirmationStatus?: ConfirmationStatus;
  customerNotes?: string | null;
  priority?: number;
  deliveryStatus?: DeliveryStatus;
  trackingId?: string | null;
  deliveryPartner?: string | null;
  actualDeliveryDate?: Date | null;
}

export interface CreateFeedbackData {
  orderId: OrderId;
  rating: number;
  comment?: string;
  productQuality?: number | null;
  deliveryExperience?: number | null;
  customerService?: number | null;
  isPublic?: boolean;
}

export interface UpdateFeedbackData {
  rating?: number;
  comment?: string;
  productQuality?: number | null;
  deliveryExperience?: number | null;
  customerService?: number | null;
  isPublic?: boolean;
  responseText?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchPaginationParams extends PaginationParams {
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface PaginatedOrdersResult {
  orders: Order[];
  pagination: PaginationInfo;
}

export interface PaginatedFeedbacksResult {
  feedbacks: Feedback[];
  pagination: PaginationInfo;
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsedRating?: number;
  parsedPrice?: number;
  parsedDate?: Date | null;
  parsedAmount?: number;
  parsedPriority?: number;
}

export interface ItemsValidationResult extends ValidationResult {
  orderItems?: CreateOrderItemData[];
  totalPrice?: number;
}

// Feedback statistics
export interface FeedbackStats {
  avgRating: string | null;
  avgProductQuality: string | null;
  avgDeliveryExperience: string | null;
  avgCustomerService: string | null;
  totalFeedbacks: number;
}

// Token generation result
export interface TokenGenerationResult {
  token: string;
  expiresAt: Date;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
}

export interface DecodedJwt {
  header: {
    kid?: string;
    alg: string;
  };
  payload: {
    sub?: string;
    email?: string;
    name?: string;
    iss?: string;
    aud?: string;
    exp?: number;
    [key: string]: unknown;
  };
}

// Express request with user
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Logger types
export interface LogMeta {
  [key: string]: unknown;
}

export interface Logger {
  error(message: string, errorOrMeta?: Error | LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}
