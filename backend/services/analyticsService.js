import { createLogger } from '../utils/logger.js';

const logger = createLogger('AnalyticsService');

// Time ranges configuration
const TIME_RANGES = [
  { key: 'week', label: 'Last Week', days: 7 },
  { key: 'month', label: 'Last Month', days: 30 },
  { key: 'quarter', label: 'Last Quarter', days: 90 },
  { key: 'halfYear', label: 'Last 6 Months', days: 180 },
  { key: 'year', label: 'Last Year', days: 365 },
];

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Aggregates item counts and revenue from filtered orders
 */
function aggregateItemCounts(filteredOrders) {
  const itemCounts = {};
  
  filteredOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { quantity: 0, revenue: 0 };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      });
    }
  });
  
  return itemCounts;
}

/**
 * Aggregates customer order data including total spent and items purchased
 */
function aggregateCustomerData(filteredOrders) {
  const customerCounts = {};
  
  filteredOrders.forEach(order => {
    const customerId = order.customerId;
    const customerName = order.customerName;
    const key = `${customerId}_${customerName}`;
    
    if (!customerCounts[key]) {
      customerCounts[key] = { 
        customerId, 
        customerName, 
        orderCount: 0, 
        totalSpent: 0,
        items: {}
      };
    }
    customerCounts[key].orderCount += 1;
    customerCounts[key].totalSpent += order.totalPrice;
    
    // Track items purchased by each customer
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const itemName = item.name;
        if (!customerCounts[key].items[itemName]) {
          customerCounts[key].items[itemName] = 0;
        }
        customerCounts[key].items[itemName] += item.quantity;
      });
    }
  });
  
  return customerCounts;
}

/**
 * Aggregates order count and revenue by source
 */
function aggregateSourceBreakdown(filteredOrders) {
  const sourceBreakdown = {};
  
  filteredOrders.forEach(order => {
    const orderSource = order.orderFrom || 'unknown';
    if (!sourceBreakdown[orderSource]) {
      sourceBreakdown[orderSource] = { count: 0, revenue: 0 };
    }
    sourceBreakdown[orderSource].count += 1;
    sourceBreakdown[orderSource].revenue += order.totalPrice;
  });
  
  return sourceBreakdown;
}

/**
 * Compute analytics for a specific time range and status filter
 */
function computeRangeAnalytics(orders, rangeDays, statusFilter, now) {
  const cutoffDate = new Date(now.getTime() - rangeDays * MILLISECONDS_PER_DAY);
  
  // Filter orders by time range and status
  const filteredOrders = orders.filter(order => {
    // Use orderDate if available, otherwise fall back to createdAt
    const dateToUse = order.orderDate || order.createdAt;
    const orderDate = new Date(dateToUse);
    const isInTimeRange = orderDate >= cutoffDate;
    
    // Apply status filter
    // Note: Orders with null/undefined status are treated as 'completed' 
    // for backward compatibility with existing data
    const matchesStatusFilter = statusFilter === 'all' || 
      order.status === 'completed' || 
      order.status === null || 
      order.status === undefined;
    
    return isInTimeRange && matchesStatusFilter;
  });

  // Calculate total sales and order count
  const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const orderCount = filteredOrders.length;

  // Aggregate items data
  const itemCounts = aggregateItemCounts(filteredOrders);
  const itemsArray = Object.entries(itemCounts).map(([name, data]) => ({
    name,
    quantity: data.quantity,
    revenue: data.revenue
  }));

  // Sort by quantity for top items
  itemsArray.sort((a, b) => b.quantity - a.quantity);
  const topItems = itemsArray.slice(0, 5);
  
  // Sort by revenue for top items by revenue
  const topItemsByRevenue = [...itemsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Aggregate source breakdown
  const sourceBreakdown = aggregateSourceBreakdown(filteredOrders);
  
  // Aggregate customer data
  const customerCounts = aggregateCustomerData(filteredOrders);
  const customersArray = Object.values(customerCounts);
  
  // Sort by order count for top customers
  customersArray.sort((a, b) => b.orderCount - a.orderCount);
  const topCustomersByOrders = customersArray.slice(0, 5);
  
  // Sort by revenue for top customers by revenue
  const topCustomersByRevenue = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const highestOrderingCustomer = customersArray.length > 0 ? customersArray[0] : null;

  return {
    totalSales,
    orderCount,
    topItems,
    topItemsByRevenue,
    sourceBreakdown,
    topCustomersByOrders,
    topCustomersByRevenue,
    highestOrderingCustomer,
    averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
    uniqueCustomers: customersArray.length
  };
}

/**
 * Calculate sales analytics for all time ranges
 * @param {Array} orders - Array of order objects
 * @param {string} statusFilter - Filter by order status ('completed' or 'all')
 * @returns {Object} Analytics data for all time ranges
 */
export function calculateSalesAnalytics(orders, statusFilter = 'completed') {
  const now = new Date();
  const analytics = {};

  logger.info('Calculating sales analytics', { 
    totalOrders: orders.length, 
    statusFilter,
    timeRanges: TIME_RANGES.length 
  });

  TIME_RANGES.forEach(range => {
    analytics[range.key] = computeRangeAnalytics(orders, range.days, statusFilter, now);
  });

  logger.info('Sales analytics calculated', { 
    ranges: Object.keys(analytics).length,
    sampleRange: analytics.month ? {
      totalSales: analytics.month.totalSales,
      orderCount: analytics.month.orderCount
    } : null
  });

  return {
    analytics,
    timeRanges: TIME_RANGES,
    generatedAt: now.toISOString()
  };
}
