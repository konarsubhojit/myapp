// Branded type for type-safe IDs
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Branded ID types
export type OrderId = Brand<number, 'OrderId'>;
export type FeedbackId = Brand<number, 'FeedbackId'>;

// Helper functions to create branded IDs
export function createOrderId(id: number): OrderId {
  return id as OrderId;
}

export function createFeedbackId(id: number): FeedbackId {
  return id as FeedbackId;
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
}

// Feedback submission data
export interface FeedbackSubmissionData extends FeedbackFormData {
  token: string;
}

// Feedback response from API
export interface FeedbackResponse {
  id: FeedbackId;
  orderId: OrderId;
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
