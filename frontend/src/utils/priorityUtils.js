/**
 * Calculate priority status based on expected delivery date
 * @param {string|null} expectedDeliveryDate - ISO date string or null
 * @param {Object} options - Configuration options
 * @param {boolean} options.shortLabels - Use short labels (e.g., "3d" vs "Due in 3 days")
 * @returns {Object|null} Priority status object or null if no date
 */
export function getPriorityStatus(expectedDeliveryDate, options = {}) {
  if (!expectedDeliveryDate) return null;
  
  const { shortLabels = false } = options;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(expectedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: 'overdue', label: 'Overdue', className: 'priority-overdue' };
  } else if (diffDays === 0) {
    return { status: 'due-today', label: 'Due Today', className: 'priority-due-today' };
  } else if (diffDays <= 3) {
    const label = shortLabels 
      ? `${diffDays}d` 
      : `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return { status: 'urgent', label, className: 'priority-urgent' };
  }
  
  if (!shortLabels) {
    return { status: 'normal', label: `Due in ${diffDays} days`, className: 'priority-normal' };
  }
  
  return null;
}
