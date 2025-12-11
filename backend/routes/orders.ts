import express, { Request, Response } from 'express';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { createLogger } from '../utils/logger.js';
import {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  VALID_DELIVERY_STATUSES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
  isValidOrderStatus,
  isValidPaymentStatus,
  isValidConfirmationStatus,
  isValidDeliveryStatus
} from '../constants/orderConstants.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { isAllowedLimit } from '../constants/paginationConstants.js';
import type { 
  ValidationResult, 
  ItemsValidationResult,
  CreateOrderItemData,
  OrderSource,
  PaymentStatus,
  ConfirmationStatus,
  DeliveryStatus,
  OrderStatus
} from '../types/index.js';

const router = express.Router();
const logger = createLogger('OrdersRoute');

function validateCustomerNotes(customerNotes: string | undefined): ValidationResult {
  if (customerNotes && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
    return { valid: false, error: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` };
  }
  return { valid: true };
}

interface OrderItemInput {
  itemId: string | number;
  quantity: string | number;
  customizationRequest?: string;
}

function validateRequiredFields(
  orderFrom: string | undefined, 
  customerName: string | undefined, 
  customerId: string | undefined, 
  items: unknown
): ValidationResult {
  if (!orderFrom || !customerName || !customerId) {
    return { valid: false, error: 'Order source, customer name, and customer ID are required' };
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  return { valid: true };
}

function validateDeliveryDate(expectedDeliveryDate: string | undefined): ValidationResult & { parsedDate?: Date | null } {
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

function validatePaymentData(
  paymentStatus: string | undefined, 
  paidAmount: string | number | undefined, 
  totalPrice: number
): ValidationResult & { parsedAmount?: number } {
  if (paymentStatus && !isValidPaymentStatus(paymentStatus)) {
    return { valid: false, error: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` };
  }

  let parsedPaidAmount = 0;
  if (paidAmount !== undefined && paidAmount !== null) {
    parsedPaidAmount = Number.parseFloat(String(paidAmount));
    if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
      return { valid: false, error: 'Paid amount must be a valid non-negative number' };
    }
  }

  if (parsedPaidAmount > totalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }
  
  if (paymentStatus === 'partially_paid' && (parsedPaidAmount === 0 || parsedPaidAmount >= totalPrice)) {
    return { 
      valid: false, 
      error: 'Partially paid orders must have a paid amount greater than 0 and less than the total price' 
    };
  }

  return { valid: true, parsedAmount: parsedPaidAmount };
}

function validatePriority(priority: string | number | undefined): ValidationResult & { parsedPriority?: number } {
  if (priority === undefined || priority === null) {
    return { valid: true, parsedPriority: 0 };
  }
  
  const parsedPriority = Number.parseInt(String(priority), 10);
  if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
    return { valid: false, error: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` };
  }
  
  return { valid: true, parsedPriority };
}

function validateConfirmationStatus(confirmationStatus: string | undefined): ValidationResult {
  if (confirmationStatus && !isValidConfirmationStatus(confirmationStatus)) {
    return { valid: false, error: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateDeliveryStatus(deliveryStatus: string | undefined): ValidationResult {
  if (deliveryStatus && !isValidDeliveryStatus(deliveryStatus)) {
    return { valid: false, error: `Invalid delivery status. Must be one of: ${VALID_DELIVERY_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdateDeliveryStatus(deliveryStatus: string | undefined): ValidationResult {
  if (deliveryStatus !== undefined && !isValidDeliveryStatus(deliveryStatus)) {
    return { valid: false, error: `Invalid delivery status. Must be one of: ${VALID_DELIVERY_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateActualDeliveryDate(actualDeliveryDate: string | undefined): ValidationResult & { parsedDate?: Date | null } {
  if (!actualDeliveryDate) {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDate = new Date(actualDeliveryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Invalid actual delivery date' };
  }
  
  return { valid: true, parsedDate };
}

function parseUpdateActualDeliveryDate(actualDeliveryDate: string | null | undefined): ValidationResult & { parsedDate?: Date | null } {
  if (actualDeliveryDate === undefined) {
    return { valid: true, parsedDate: undefined };
  }
  
  if (actualDeliveryDate === null || actualDeliveryDate === '') {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDate = new Date(actualDeliveryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Invalid actual delivery date' };
  }
  
  return { valid: true, parsedDate };
}

function validateUpdateCustomerNotes(customerNotes: string | undefined): ValidationResult {
  if (customerNotes !== undefined && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
    return { valid: false, error: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` };
  }
  return { valid: true };
}

function validateUpdateFields(customerName: string | undefined, customerId: string | undefined): ValidationResult {
  if (customerName !== undefined && !customerName?.trim()) {
    return { valid: false, error: 'Customer name cannot be empty' };
  }
  if (customerId !== undefined && !customerId?.trim()) {
    return { valid: false, error: 'Customer ID cannot be empty' };
  }
  return { valid: true };
}

function validateOrderStatus(status: string | undefined): ValidationResult {
  if (status !== undefined && !isValidOrderStatus(status)) {
    return { valid: false, error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdatePaymentStatus(paymentStatus: string | undefined): ValidationResult {
  if (paymentStatus !== undefined && !isValidPaymentStatus(paymentStatus)) {
    return { valid: false, error: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdateConfirmationStatus(confirmationStatus: string | undefined): ValidationResult {
  if (confirmationStatus !== undefined && !isValidConfirmationStatus(confirmationStatus)) {
    return { valid: false, error: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function parseUpdatePaidAmount(paidAmount: string | number | undefined): ValidationResult & { parsedAmount?: number } {
  if (paidAmount === undefined) {
    return { valid: true, parsedAmount: undefined };
  }
  
  const parsedPaidAmount = Number.parseFloat(String(paidAmount));
  if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
    return { valid: false, error: 'Paid amount must be a valid non-negative number' };
  }
  
  return { valid: true, parsedAmount: parsedPaidAmount };
}

function parseUpdatePriority(priority: string | number | undefined): ValidationResult & { parsedPriority?: number } {
  if (priority === undefined) {
    return { valid: true, parsedPriority: undefined };
  }
  
  const parsedPriority = Number.parseInt(String(priority), 10);
  if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
    return { valid: false, error: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` };
  }
  
  return { valid: true, parsedPriority };
}

function parseUpdateDeliveryDate(expectedDeliveryDate: string | null | undefined): ValidationResult & { parsedDate?: Date | null } {
  if (expectedDeliveryDate === undefined) {
    return { valid: true, parsedDate: undefined };
  }
  
  if (expectedDeliveryDate === null || expectedDeliveryDate === '') {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDeliveryDate = new Date(expectedDeliveryDate);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    return { valid: false, error: 'Invalid expected delivery date' };
  }
  
  return { valid: true, parsedDate: parsedDeliveryDate };
}

function validateUpdatePaymentAmount(
  parsedPaidAmount: number | undefined, 
  totalPrice: number | undefined, 
  existingTotalPrice: number, 
  paymentStatus: string | undefined
): ValidationResult {
  if (parsedPaidAmount === undefined) {
    return { valid: true };
  }
  
  const effectiveTotalPrice = totalPrice !== undefined ? totalPrice : existingTotalPrice;
  
  if (parsedPaidAmount > effectiveTotalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }
  
  if (paymentStatus === 'partially_paid' && (parsedPaidAmount <= 0 || parsedPaidAmount >= effectiveTotalPrice)) {
    return { 
      valid: false, 
      error: "For 'partially_paid' status, paid amount must be greater than 0 and less than total price" 
    };
  }
  
  return { valid: true };
}

async function buildOrderItemsList(items: OrderItemInput[]): Promise<ItemsValidationResult> {
  const orderItems: CreateOrderItemData[] = [];
  let totalPrice = 0;

  for (const orderItem of items) {
    const item = await Item.findById(orderItem.itemId);
    if (!item) {
      return { valid: false, error: `Item with id ${orderItem.itemId} not found` };
    }
    
    const quantity = Number.parseInt(String(orderItem.quantity), 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { valid: false, error: 'Quantity must be a positive integer' };
    }

    orderItems.push({
      item: item._id,
      name: item.name,
      price: item.price,
      quantity: quantity,
      customizationRequest: orderItem.customizationRequest || ''
    });

    totalPrice += item.price * quantity;
  }

  return { valid: true, orderItems, totalPrice };
}

async function processOrderItems(items: OrderItemInput[]): Promise<ItemsValidationResult> {
  return buildOrderItemsList(items);
}

async function processUpdateOrderItems(items: OrderItemInput[] | undefined): Promise<ItemsValidationResult> {
  if (items === undefined) {
    return { valid: true, orderItems: undefined, totalPrice: undefined };
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }

  return buildOrderItemsList(items);
}

interface CreateOrderRequestBody {
  orderFrom?: string;
  customerName?: string;
  customerId?: string;
  address?: string;
  orderDate?: string;
  items?: OrderItemInput[];
  expectedDeliveryDate?: string;
  paymentStatus?: string;
  paidAmount?: string | number;
  confirmationStatus?: string;
  customerNotes?: string;
  priority?: string | number;
  deliveryStatus?: string;
  trackingId?: string;
  deliveryPartner?: string;
  actualDeliveryDate?: string;
}

interface UpdateOrderRequestBody extends CreateOrderRequestBody {
  status?: string;
}

router.get('/priority', async (_req: Request, res: Response) => {
  try {
    const priorityOrders = await Order.findPriorityOrders();
    res.json(priorityOrders);
  } catch (error) {
    logger.error('Failed to fetch priority orders', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch priority orders' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsedPage = Number.parseInt(req.query.page as string, 10);
    const parsedLimit = Number.parseInt(req.query.limit as string, 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isAllowedLimit(parsedLimit) ? parsedLimit : 10;
    
    if (req.query.page || req.query.limit) {
      const result = await Order.findPaginated({ page, limit });
      res.json(result);
    } else {
      const orders = await Order.find();
      res.json(orders);
    }
  } catch (error) {
    logger.error('Failed to fetch orders', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch orders' });
  }
});

router.post('/', async (req: Request<object, object, CreateOrderRequestBody>, res: Response) => {
  try {
    const { 
      orderFrom, customerName, customerId, address, orderDate, items, 
      expectedDeliveryDate, paymentStatus, paidAmount, confirmationStatus, 
      customerNotes, priority, deliveryStatus, trackingId, deliveryPartner, 
      actualDeliveryDate 
    } = req.body;

    // Validate customer notes
    const notesValidation = validateCustomerNotes(customerNotes);
    if (!notesValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: notesValidation.error });
    }

    // Validate required fields
    const fieldsValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
    if (!fieldsValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: fieldsValidation.error });
    }

    // Validate delivery date
    const dateValidation = validateDeliveryDate(expectedDeliveryDate);
    if (!dateValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: dateValidation.error });
    }

    // Validate confirmation status
    const confirmationValidation = validateConfirmationStatus(confirmationStatus);
    if (!confirmationValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: confirmationValidation.error });
    }

    // Validate priority
    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: priorityValidation.error });
    }

    // Validate delivery status
    const deliveryStatusValidation = validateDeliveryStatus(deliveryStatus);
    if (!deliveryStatusValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: deliveryStatusValidation.error });
    }

    // Validate actual delivery date
    const actualDeliveryDateValidation = validateActualDeliveryDate(actualDeliveryDate);
    if (!actualDeliveryDateValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: actualDeliveryDateValidation.error });
    }

    // Process order items
    const itemsResult = await processOrderItems(items as OrderItemInput[]);
    if (!itemsResult.valid || !itemsResult.orderItems || itemsResult.totalPrice === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: itemsResult.error });
    }

    // Validate payment data
    const paymentValidation = validatePaymentData(paymentStatus, paidAmount, itemsResult.totalPrice);
    if (!paymentValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: paymentValidation.error });
    }

    const newOrder = await Order.create({
      orderFrom: orderFrom as OrderSource,
      customerName: customerName!,
      customerId: customerId!,
      address,
      orderDate,
      items: itemsResult.orderItems,
      totalPrice: itemsResult.totalPrice,
      expectedDeliveryDate: dateValidation.parsedDate ?? undefined,
      paymentStatus: (paymentStatus || 'unpaid') as PaymentStatus,
      paidAmount: paymentValidation.parsedAmount,
      confirmationStatus: (confirmationStatus || 'unconfirmed') as ConfirmationStatus,
      customerNotes: customerNotes || '',
      priority: priorityValidation.parsedPriority,
      deliveryStatus: (deliveryStatus || 'not_shipped') as DeliveryStatus,
      trackingId: trackingId || '',
      deliveryPartner: deliveryPartner || '',
      actualDeliveryDate: actualDeliveryDateValidation.parsedDate ?? undefined
    });

    logger.info('Order created', { orderId: newOrder.orderId, totalPrice: newOrder.totalPrice });
    res.status(201).json(newOrder);
  } catch (error) {
    logger.error('Failed to create order', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create order' });
  }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    logger.error('Failed to fetch order', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch order' });
  }
});

interface ValidationData {
  paidAmountResult: ValidationResult & { parsedAmount?: number };
  priorityResult: ValidationResult & { parsedPriority?: number };
  dateResult: ValidationResult & { parsedDate?: Date | null };
  actualDeliveryDateResult: ValidationResult & { parsedDate?: Date | null };
  itemsResult: ItemsValidationResult;
  paymentStatus: string | undefined;
}

async function validateUpdateRequest(requestBody: UpdateOrderRequestBody): Promise<{ valid: boolean; error?: string; data?: ValidationData }> {
  const { 
    customerName, customerId, items, expectedDeliveryDate, status, 
    paymentStatus, paidAmount, confirmationStatus, customerNotes, 
    priority, deliveryStatus, actualDeliveryDate 
  } = requestBody;

  const notesValidation = validateUpdateCustomerNotes(customerNotes);
  if (!notesValidation.valid) return notesValidation;

  const fieldsValidation = validateUpdateFields(customerName, customerId);
  if (!fieldsValidation.valid) return fieldsValidation;

  const statusValidation = validateOrderStatus(status);
  if (!statusValidation.valid) return statusValidation;

  const paymentStatusValidation = validateUpdatePaymentStatus(paymentStatus);
  if (!paymentStatusValidation.valid) return paymentStatusValidation;

  const confirmationValidation = validateUpdateConfirmationStatus(confirmationStatus);
  if (!confirmationValidation.valid) return confirmationValidation;

  const deliveryStatusValidation = validateUpdateDeliveryStatus(deliveryStatus);
  if (!deliveryStatusValidation.valid) return deliveryStatusValidation;

  const paidAmountResult = parseUpdatePaidAmount(paidAmount);
  if (!paidAmountResult.valid) return paidAmountResult;

  const priorityResult = parseUpdatePriority(priority);
  if (!priorityResult.valid) return priorityResult;

  const dateResult = parseUpdateDeliveryDate(expectedDeliveryDate);
  if (!dateResult.valid) return dateResult;

  const actualDeliveryDateResult = parseUpdateActualDeliveryDate(actualDeliveryDate);
  if (!actualDeliveryDateResult.valid) return actualDeliveryDateResult;

  const itemsResult = await processUpdateOrderItems(items);
  if (!itemsResult.valid) return itemsResult;

  return { 
    valid: true, 
    data: { 
      paidAmountResult, 
      priorityResult, 
      dateResult, 
      actualDeliveryDateResult,
      itemsResult, 
      paymentStatus
    } 
  };
}

interface UpdateData {
  orderFrom?: OrderSource;
  customerName?: string;
  customerId?: string;
  address?: string;
  orderDate?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  confirmationStatus?: ConfirmationStatus;
  customerNotes?: string;
  deliveryStatus?: DeliveryStatus;
  trackingId?: string;
  deliveryPartner?: string;
  expectedDeliveryDate?: Date | null;
  paidAmount?: number;
  priority?: number;
  actualDeliveryDate?: Date | null;
  items?: CreateOrderItemData[];
  totalPrice?: number;
}

function addIfDefined<K extends keyof UpdateData>(target: UpdateData, key: K, value: UpdateData[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function buildUpdateData(validationData: ValidationData, requestBody: UpdateOrderRequestBody): UpdateData {
  const { 
    orderFrom, customerName, customerId, address, orderDate, status, 
    paymentStatus, confirmationStatus, customerNotes, deliveryStatus, 
    trackingId, deliveryPartner 
  } = requestBody;
  const { paidAmountResult, priorityResult, dateResult, actualDeliveryDateResult, itemsResult } = validationData;
  
  const updateData: UpdateData = {};
  
  // Direct fields from request body
  addIfDefined(updateData, 'orderFrom', orderFrom as OrderSource | undefined);
  addIfDefined(updateData, 'customerName', customerName);
  addIfDefined(updateData, 'customerId', customerId);
  addIfDefined(updateData, 'address', address);
  addIfDefined(updateData, 'orderDate', orderDate);
  addIfDefined(updateData, 'status', status as OrderStatus | undefined);
  addIfDefined(updateData, 'paymentStatus', paymentStatus as PaymentStatus | undefined);
  addIfDefined(updateData, 'confirmationStatus', confirmationStatus as ConfirmationStatus | undefined);
  addIfDefined(updateData, 'customerNotes', customerNotes);
  addIfDefined(updateData, 'deliveryStatus', deliveryStatus as DeliveryStatus | undefined);
  addIfDefined(updateData, 'trackingId', trackingId);
  addIfDefined(updateData, 'deliveryPartner', deliveryPartner);
  
  // Parsed fields from validation results
  addIfDefined(updateData, 'expectedDeliveryDate', dateResult.parsedDate);
  addIfDefined(updateData, 'paidAmount', paidAmountResult.parsedAmount);
  addIfDefined(updateData, 'priority', priorityResult.parsedPriority);
  addIfDefined(updateData, 'actualDeliveryDate', actualDeliveryDateResult.parsedDate);
  addIfDefined(updateData, 'items', itemsResult.orderItems);
  addIfDefined(updateData, 'totalPrice', itemsResult.totalPrice);
  
  return updateData;
}

router.put('/:id', async (req: Request<{ id: string }, object, UpdateOrderRequestBody>, res: Response) => {
  try {
    const validation = await validateUpdateRequest(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: validation.error });
    }

    const { paidAmountResult, itemsResult, paymentStatus } = validation.data;
    
    // Validate payment amount against total price if needed
    if (paidAmountResult.parsedAmount !== undefined) {
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
      }
      
      const paymentValidation = validateUpdatePaymentAmount(
        paidAmountResult.parsedAmount, 
        itemsResult.totalPrice, 
        existingOrder.totalPrice, 
        paymentStatus
      );
      if (!paymentValidation.valid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: paymentValidation.error });
      }
    }

    const updateData = buildUpdateData(validation.data, req.body);
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }

    logger.info('Order updated', { orderId: updatedOrder.orderId, id: req.params.id });
    res.json(updatedOrder);
  } catch (error) {
    logger.error('Failed to update order', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update order' });
  }
});

export default router;
