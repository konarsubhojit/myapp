const { pgTable, serial, text, numeric, timestamp, integer, uuid, pgEnum } = require('drizzle-orm/pg-core');

// Enum for order source
const orderFromEnum = pgEnum('order_from', ['instagram', 'facebook', 'whatsapp', 'call', 'offline']);

// Items table
const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  color: text('color'),
  fabric: text('fabric'),
  specialFeatures: text('special_features'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

// Orders table
const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderFrom: orderFromEnum('order_from').notNull(),
  customerName: text('customer_name').notNull(),
  customerId: text('customer_id').notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Order items table (for the items in each order)
const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  customizationRequest: text('customization_request')
});

module.exports = { items, orders, orderItems, orderFromEnum };
