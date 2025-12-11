import type { OrderStatus, PaymentStatus, ConfirmationStatus, OrderSource, DeliveryStatus } from '../types/index.js';

export const VALID_ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'] as const;
export const VALID_PAYMENT_STATUSES: readonly PaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'] as const;
export const VALID_CONFIRMATION_STATUSES: readonly ConfirmationStatus[] = ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'] as const;
export const VALID_ORDER_SOURCES: readonly OrderSource[] = ['instagram', 'facebook', 'whatsapp', 'call', 'offline'] as const;
export const VALID_DELIVERY_STATUSES: readonly DeliveryStatus[] = ['not_shipped', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned'] as const;
export const MAX_CUSTOMER_NOTES_LENGTH = 5000;
export const PRIORITY_MIN = 0;
export const PRIORITY_MAX = 5;

// Type guards
export function isValidOrderStatus(value: string): value is OrderStatus {
  return (VALID_ORDER_STATUSES as readonly string[]).includes(value);
}

export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return (VALID_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isValidConfirmationStatus(value: string): value is ConfirmationStatus {
  return (VALID_CONFIRMATION_STATUSES as readonly string[]).includes(value);
}

export function isValidOrderSource(value: string): value is OrderSource {
  return (VALID_ORDER_SOURCES as readonly string[]).includes(value);
}

export function isValidDeliveryStatus(value: string): value is DeliveryStatus {
  return (VALID_DELIVERY_STATUSES as readonly string[]).includes(value);
}
