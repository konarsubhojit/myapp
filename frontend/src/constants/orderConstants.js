// Shared constants for order-related data

export const ORDER_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'offline', label: 'Offline' },
];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'refunded', label: 'Refunded' },
];

export const CONFIRMATION_STATUSES = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PRIORITY_LEVELS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Low Priority' },
  { value: 2, label: 'Medium Priority' },
  { value: 3, label: 'High Priority' },
  { value: 4, label: 'Urgent' },
  { value: 5, label: 'Critical' },
];

// Helper functions to get labels
export const getPaymentStatusLabel = (status) => {
  return PAYMENT_STATUSES.find(s => s.value === status)?.label || 'Unpaid';
};

export const getConfirmationStatusLabel = (status) => {
  return CONFIRMATION_STATUSES.find(s => s.value === status)?.label || 'Unconfirmed';
};

export const getPriorityLabel = (priority) => {
  return PRIORITY_LEVELS.find(l => l.value === priority)?.label || 'Normal';
};

export const getOrderStatusLabel = (status) => {
  return ORDER_STATUSES.find(s => s.value === status)?.label || 'Pending';
};
