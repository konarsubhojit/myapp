/**
 * Gets the color for order status chips
 */
export const getOrderStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets the color for priority chips based on priority data
 */
export const getOrderPriorityColor = (priorityData) => {
  if (!priorityData) return 'default';
  if (priorityData.className.includes('overdue')) return 'error';
  if (priorityData.className.includes('due-today')) return 'warning';
  if (priorityData.className.includes('urgent')) return 'warning';
  return 'success';
};

/**
 * Formats date for display in order details
 */
export const formatOrderDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats delivery date for display
 */
export const formatOrderDeliveryDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
