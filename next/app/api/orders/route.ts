import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
// @ts-ignore
import Order from '@/lib/models/Order';
// @ts-ignore
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { withCache } from '@/lib/middleware/nextCache';
// @ts-ignore
import { invalidateOrderCache } from '@/lib/middleware/cache';
// @ts-ignore
import { PAGINATION } from '@/lib/constants/paginationConstants';
// @ts-ignore
import {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  VALID_DELIVERY_STATUSES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
} from '@/lib/constants/orderConstants';

const logger = createLogger('OrdersAPI');

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

/**
 * Parse and validate cursor pagination parameters from query string
 */
function parseCursorParams(searchParams: URLSearchParams) {
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  
  return {
    limit: ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT,
    cursor: searchParams.get('cursor') || null as string | null
  };
}

function validateRequiredFields(orderFrom: any, customerName: any, customerId: any, items: any) {
  if (!orderFrom || !customerName || !customerId) {
    return { valid: false, error: 'Order source, customer name, and customer ID are required' };
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  return { valid: true };
}

function validateDeliveryDate(expectedDeliveryDate: any) {
  if (!expectedDeliveryDate) {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDeliveryDate = new Date(expectedDeliveryDate);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    return { valid: false, error: 'Invalid expected delivery date' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(parsedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  if (deliveryDate < today) {
    return { valid: false, error: 'Expected delivery date cannot be in the past' };
  }
  
  return { valid: true, parsedDate: parsedDeliveryDate };
}

/**
 * GET /api/orders - List orders with cursor pagination
 * Wrapped with Redis caching (5 minutes TTL)
 */
async function getOrdersHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, cursor } = parseCursorParams(searchParams);
    
    logger.debug('GET /api/orders request', { 
      hasCursorParam: !!searchParams.get('cursor'),
      hasLimitParam: searchParams.has('limit'),
      limitValue: searchParams.get('limit')
    });
    
    // Use cursor-based pagination for stable infinite scroll
    // @ts-ignore - cursor type mismatch between URLSearchParams and model
    const result = await Order.findCursorPaginated({ limit, cursor });
    
    logger.debug('Returning cursor-paginated orders', {
      orderCount: result.orders.length,
      hasMore: result.pagination.hasMore,
      nextCursor: result.pagination.nextCursor ? 'present' : 'null'
    });
    
    // Transform to match frontend expectations: {items: [], page: {}}
    return NextResponse.json({
      items: result.orders,
      page: result.pagination
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error: any) {
    logger.error('GET /api/orders error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch orders' },
      { status: error.statusCode || 500 }
    );
  }
}

// Export GET handler with caching (5 minutes TTL)
export const GET = withCache(getOrdersHandler, 300);

/**
 * POST /api/orders - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderFrom,
      customerName,
      customerId,
      address,
      items,
      status,
      paymentStatus,
      paidAmount,
      confirmationStatus,
      customerNotes,
      priority,
      orderDate,
      expectedDeliveryDate,
      deliveryStatus,
      trackingId,
      deliveryPartner,
      actualDeliveryDate
    } = body;

    // Validate required fields
    const requiredValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
    if (!requiredValidation.valid) {
      return NextResponse.json(
        { message: requiredValidation.error },
        { status: 400 }
      );
    }

    // Validate delivery date
    const deliveryDateValidation = validateDeliveryDate(expectedDeliveryDate);
    if (!deliveryDateValidation.valid) {
      return NextResponse.json(
        { message: deliveryDateValidation.error },
        { status: 400 }
      );
    }

    // Validate items and calculate total
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.itemId || !item.name || item.quantity === undefined || item.price === undefined) {
        return NextResponse.json(
          { message: 'Each item must have itemId, name, quantity, and price' },
          { status: 400 }
        );
      }

      const itemPrice = Number.parseFloat(item.price);
      const quantity = Number.parseInt(item.quantity, 10);

      if (Number.isNaN(itemPrice) || itemPrice < 0) {
        return NextResponse.json(
          { message: 'Item price must be a valid non-negative number' },
          { status: 400 }
        );
      }

      if (Number.isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { message: 'Item quantity must be a positive integer' },
          { status: 400 }
        );
      }

      totalPrice += itemPrice * quantity;
      validatedItems.push({
        itemId: Number.parseInt(item.itemId, 10),
        name: item.name,
        price: itemPrice,
        quantity: quantity,
        customizationRequest: item.customizationRequest || ''
      });
    }

    const orderData: any = {
      orderFrom,
      customerName: customerName.trim(),
      customerId: customerId.trim(),
      address: address?.trim() || '',
      totalPrice,
      items: validatedItems,
      status: status || 'pending',
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: paidAmount ? Number.parseFloat(paidAmount) : 0,
      confirmationStatus: confirmationStatus || 'unconfirmed',
      customerNotes: customerNotes || '',
      priority: priority !== undefined ? Number.parseInt(priority, 10) : 0,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDeliveryDate: deliveryDateValidation.parsedDate,
      deliveryStatus: deliveryStatus || 'not_shipped',
      trackingId: trackingId || '',
      deliveryPartner: deliveryPartner || '',
      actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : null
    };

    const newOrder = await Order.create(orderData);
    
    // Invalidate order cache after creation
    await invalidateOrderCache();
    
    // Revalidate Next.js cache for orders pages
    revalidatePath('/api/orders');
    revalidatePath('/orders');
    
    logger.info('Order created', { orderId: newOrder._id, orderIdStr: newOrder.orderId });
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    logger.error('POST /api/orders error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create order' },
      { status: error.statusCode || 500 }
    );
  }
}
