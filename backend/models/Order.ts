import { eq, desc, sql, asc } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { orders, orderItems } from '../db/schema.js';
import type { 
  Order, 
  OrderItem,
  OrderRow,
  OrderItemRow,
  OrderId,
  CreateOrderData,
  UpdateOrderData,
  CreateOrderItemData,
  PaginatedOrdersResult,
  PaginationInfo,
  PaginationParams,
  OrderStatus,
  PaymentStatus,
  ConfirmationStatus,
  DeliveryStatus
} from '../types/index.js';
import { createOrderId, createOrderItemId, createItemId } from '../types/index.js';

function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD${randomNum}`;
}

function transformOrderItem(item: OrderItemRow): OrderItem {
  const orderItemId = createOrderItemId(item.id);
  return {
    ...item,
    id: orderItemId,
    _id: orderItemId,
    item: createItemId(item.itemId),
    price: Number.parseFloat(item.price),
    customizationRequest: item.customizationRequest ?? ''
  };
}

function transformOrder(order: OrderRow, items: OrderItemRow[] = []): Order {
  const orderId = createOrderId(order.id);
  return {
    ...order,
    id: orderId,
    _id: orderId,
    totalPrice: Number.parseFloat(order.totalPrice),
    paidAmount: Number.parseFloat(order.paidAmount ?? '0'),
    status: (order.status ?? 'pending') as OrderStatus,
    paymentStatus: (order.paymentStatus ?? 'unpaid') as PaymentStatus,
    confirmationStatus: (order.confirmationStatus ?? 'unconfirmed') as ConfirmationStatus,
    customerNotes: order.customerNotes ?? '',
    address: order.address ?? '',
    priority: order.priority ?? 0,
    orderDate: order.orderDate ? order.orderDate.toISOString() : null,
    expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
    deliveryStatus: (order.deliveryStatus ?? 'not_shipped') as DeliveryStatus,
    trackingId: order.trackingId ?? '',
    deliveryPartner: order.deliveryPartner ?? '',
    actualDeliveryDate: order.actualDeliveryDate ? order.actualDeliveryDate.toISOString() : null,
    items: items.map(transformOrderItem)
  };
}

type OrderUpdateField = string | number | Date | null | undefined;

function setFieldIfDefined(
  updateData: Record<string, OrderUpdateField>, 
  key: string, 
  value: unknown, 
  transformer?: (v: unknown) => OrderUpdateField
): void {
  if (value !== undefined) {
    updateData[key] = transformer ? transformer(value) : value as OrderUpdateField;
  }
}

function buildOrderUpdateData(data: UpdateOrderData): Record<string, OrderUpdateField> {
  const updateData: Record<string, OrderUpdateField> = {};
  
  setFieldIfDefined(updateData, 'orderFrom', data.orderFrom);
  setFieldIfDefined(updateData, 'customerName', data.customerName, v => (v as string).trim());
  setFieldIfDefined(updateData, 'customerId', data.customerId, v => (v as string).trim());
  setFieldIfDefined(updateData, 'address', data.address, v => (v as string | null)?.trim() ?? null);
  setFieldIfDefined(updateData, 'totalPrice', data.totalPrice, v => String(v));
  setFieldIfDefined(updateData, 'orderDate', data.orderDate, v => v ? new Date(v as string | Date) : null);
  setFieldIfDefined(updateData, 'expectedDeliveryDate', data.expectedDeliveryDate, v => v ? new Date(v as string | Date) : null);
  setFieldIfDefined(updateData, 'status', data.status);
  setFieldIfDefined(updateData, 'paymentStatus', data.paymentStatus);
  setFieldIfDefined(updateData, 'paidAmount', data.paidAmount, v => String(v));
  setFieldIfDefined(updateData, 'confirmationStatus', data.confirmationStatus);
  setFieldIfDefined(updateData, 'customerNotes', data.customerNotes, v => (v as string | null)?.trim() ?? null);
  setFieldIfDefined(updateData, 'priority', data.priority);
  setFieldIfDefined(updateData, 'deliveryStatus', data.deliveryStatus);
  setFieldIfDefined(updateData, 'trackingId', data.trackingId, v => (v as string | null)?.trim() ?? null);
  setFieldIfDefined(updateData, 'deliveryPartner', data.deliveryPartner, v => (v as string | null)?.trim() ?? null);
  setFieldIfDefined(updateData, 'actualDeliveryDate', data.actualDeliveryDate, v => v ? new Date(v as string | Date) : null);
  
  return updateData;
}

type DrizzleDb = ReturnType<typeof getDatabase>;

async function updateOrderItems(
  db: DrizzleDb, 
  orderId: OrderId | number, 
  items: CreateOrderItemData[]
): Promise<void> {
  const numericOrderId = typeof orderId === 'number' ? orderId : Number(orderId);
  await db.delete(orderItems).where(eq(orderItems.orderId, numericOrderId));
  
  if (items.length > 0) {
    const orderItemsData = items.map(item => ({
      orderId: numericOrderId,
      itemId: Number(item.item),
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() ?? null
    }));
    
    await db.insert(orderItems).values(orderItemsData);
  }
}

const Order = {
  async find(): Promise<Order[]> {
    const db = getDatabase();
    const ordersResult = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order as OrderRow, itemsResult as OrderItemRow[]);
      })
    );
    
    return ordersWithItems;
  },

  async findPaginated({ page = 1, limit = 10 }: PaginationParams): Promise<PaginatedOrdersResult> {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const countResult = await db.select({ count: sql`count(*)` }).from(orders);
    const total = Number.parseInt(String(countResult[0]?.count ?? 0), 10);
    
    const ordersResult = await db.select()
      .from(orders)
      .orderBy(
        sql`${orders.expectedDeliveryDate} IS NULL`,
        asc(orders.expectedDeliveryDate),
        desc(orders.createdAt)
      )
      .limit(limit)
      .offset(offset);
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order as OrderRow, itemsResult as OrderItemRow[]);
      })
    );
    
    const pagination: PaginationInfo = { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit) 
    };
    
    return {
      orders: ordersWithItems,
      pagination
    };
  },

  async findById(id: OrderId | string | number): Promise<Order | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const ordersResult = await db.select().from(orders).where(eq(orders.id, numericId));
    if (ordersResult.length === 0) return null;
    
    const order = ordersResult[0] as OrderRow;
    const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    return transformOrder(order, itemsResult as OrderItemRow[]);
  },

  async findPriorityOrders(): Promise<Order[]> {
    const db = getDatabase();
    const now = new Date();
    
    // Get orders that need attention:
    // 1. High priority (priority >= 5) AND not completed/cancelled
    // 2. Delivery date within next 3 days AND not completed/cancelled
    // 3. Overdue (delivery date in the past) AND not completed/cancelled
    const ordersResult = await db.select()
      .from(orders)
      .where(
        sql`(
          (${orders.priority} >= 5 OR
          (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)}) OR
          (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now}))
          AND ${orders.status} NOT IN ('completed', 'cancelled')
        )`
      )
      .orderBy(
        sql`CASE 
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now} THEN 1
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 24 * 60 * 60 * 1000)} THEN 2
          WHEN ${orders.priority} >= 8 THEN 3
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)} THEN 4
          WHEN ${orders.priority} >= 5 THEN 5
          ELSE 6
        END`,
        asc(orders.expectedDeliveryDate),
        desc(orders.priority)
      );
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order as OrderRow, itemsResult as OrderItemRow[]);
      })
    );
    
    return ordersWithItems;
  },

  async create(data: CreateOrderData): Promise<Order> {
    const db = getDatabase();
    const generatedOrderId = generateOrderId();
    
    const orderResult = await db.insert(orders).values({
      orderId: generatedOrderId,
      orderFrom: data.orderFrom,
      customerName: data.customerName.trim(),
      customerId: data.customerId.trim(),
      address: data.address?.trim() ?? null,
      totalPrice: data.totalPrice.toString(),
      paidAmount: (data.paidAmount ?? 0).toString(),
      paymentStatus: data.paymentStatus ?? 'unpaid',
      confirmationStatus: data.confirmationStatus ?? 'unconfirmed',
      customerNotes: data.customerNotes?.trim() ?? null,
      priority: data.priority ?? 0,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      deliveryStatus: data.deliveryStatus ?? 'not_shipped',
      trackingId: data.trackingId?.trim() ?? null,
      deliveryPartner: data.deliveryPartner?.trim() ?? null,
      actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : null
    }).returning();
    
    const newOrder = orderResult[0] as OrderRow;
    
    const orderItemsData = data.items.map(item => ({
      orderId: newOrder.id,
      itemId: Number(item.item),
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() ?? null
    }));
    
    const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();
    
    return transformOrder(newOrder, itemsResult as OrderItemRow[]);
  },

  async findByIdAndUpdate(id: OrderId | string | number, data: UpdateOrderData): Promise<Order | null> {
    const db = getDatabase();
    const numericId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isNaN(numericId)) return null;
    
    const existingOrder = await db.select().from(orders).where(eq(orders.id, numericId));
    if (existingOrder.length === 0) return null;
    
    const updateData = buildOrderUpdateData(data);
    
    if (Object.keys(updateData).length > 0) {
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, numericId));
    }
    
    if (data.items && Array.isArray(data.items)) {
      await updateOrderItems(db, numericId, data.items);
    }
    
    return this.findById(numericId);
  }
};

export default Order;
