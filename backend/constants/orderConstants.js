const VALID_ORDER_STATUSES = ['pending', 'processing', 'completed', 'cancelled'];
const VALID_PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'];
const VALID_CONFIRMATION_STATUSES = ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'];
const VALID_ORDER_SOURCES = ['instagram', 'facebook', 'whatsapp', 'call', 'offline'];
const MAX_CUSTOMER_NOTES_LENGTH = 5000;
const PRIORITY_MIN = 0;
const PRIORITY_MAX = 5;

module.exports = {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  VALID_ORDER_SOURCES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
};
