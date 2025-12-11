// Branded type for type-safe IDs
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Branded ID types
export type OrderId = Brand<number, 'OrderId'>;

// Helper functions to create branded IDs
export function createOrderId(id: number): OrderId {
  return id as OrderId;
}

// Order status type
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Order information from API
export interface OrderInfo {
  _id: OrderId;
  orderId: string;
  status: OrderStatus;
}

// Token validation response
export interface TokenValidationResponse {
  order: OrderInfo;
  hasExistingFeedback: boolean;
}

// Feedback form data
export interface FeedbackFormData {
  rating: number;
  comment: string;
  productQuality: number;
  deliveryExperience: number;
  customerService: number;
  isPublic: boolean;
}

// Feedback submission data
export interface FeedbackSubmissionData extends FeedbackFormData {
  token: string;
}

// Feedback response from API
export interface FeedbackResponse {
  id: number;
  orderId: number;
  rating: number;
  comment: string;
  productQuality: number | null;
  deliveryExperience: number | null;
  customerService: number | null;
  isPublic: boolean;
  createdAt: string;
}

// API error response
export interface ApiError {
  message: string;
}

// Component props
export interface FeedbackFormProps {
  token: string;
  order: OrderInfo;
  onSuccess: () => void;
}
