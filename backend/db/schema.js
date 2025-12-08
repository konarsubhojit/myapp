const { pgTable, serial, text, numeric, timestamp, integer, pgEnum } = require('drizzle-orm/pg-core');

const orderFromEnum = pgEnum('order_from', ['instagram', 'facebook', 'whatsapp', 'call', 'offline']);
const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']);

const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  color: text('color'),
  fabric: text('fabric'),
  specialFeatures: text('special_features'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderFrom: orderFromEnum('order_from').notNull(),
  customerName: text('customer_name').notNull(),
  customerId: text('customer_id').notNull(),
  address: text('address'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: text('status').default('pending'),
  paymentStatus: text('payment_status').default('unpaid'),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default('0'),
  confirmationStatus: text('confirmation_status').default('unconfirmed'),
  customerNotes: text('customer_notes'),
  priority: integer('priority').default(0),
  orderDate: timestamp('order_date'),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  deliveryStatus: text('delivery_status').default('not_shipped'),
  trackingId: text('tracking_id'),
  deliveryPartner: text('delivery_partner'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  customizationRequest: text('customization_request')
});

module.exports = { items, orders, orderItems, orderFromEnum, orderStatusEnum };
