/**
 * Standard production timeline constants
 * Standard production time: 1-2 weeks (7-14 days)
 * Orders needed before 7 days are URGENT
 */
const PRODUCTION_TIME = {
  MIN_STANDARD: 7,   // Minimum standard production time (1 week)
  MAX_STANDARD: 14,  // Maximum standard production time (2 weeks)
  CRITICAL: 3,       // Orders due in 3 days or less are CRITICAL
  URGENT: 7,         // Orders due in 7 days or less are URGENT
};

/**
 * Calculate priority status based on expected delivery date
 * 
 * Priority Levels:
 * - OVERDUE: Delivery date has passed
 * - CRITICAL: Due today, tomorrow, or within 3 days (immediate attention needed)
 * - URGENT: Due within 4-7 days (less than minimum production time)
 * - MEDIUM: Due within 8-14 days (within standard production time)
 * - NORMAL: Due after 14 days (comfortable timeline)
 * 
 * @param {string} expectedDeliveryDate - ISO date string
 * @param {Object} options - Configuration options
 * @param {boolean} options.shortLabels - Use short label format
 * @returns {Object|null} Priority status object with label, class, and urgency level
 */
export function getPriorityStatus(expectedDeliveryDate, options = {}) {
  if (!expectedDeliveryDate) return null;
  
  const { shortLabels = false } = options;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(expectedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
  
  // OVERDUE - Past the delivery date
  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    const label = shortLabels 
      ? `${daysOverdue}d over` 
      : `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`;
    return { 
      status: 'overdue', 
      label, 
      className: 'priority-overdue',
      urgency: 'critical',
      daysRemaining: diffDays
    };
  }
  
  // DUE TODAY - Critical attention needed
  if (diffDays === 0) {
    return { 
      status: 'due-today', 
      label: 'Due Today', 
      className: 'priority-due-today',
      urgency: 'critical',
      daysRemaining: 0
    };
  }
  
  // CRITICAL - Due in 1-3 days (impossible to complete in time without rush)
  if (diffDays <= PRODUCTION_TIME.CRITICAL) {
    const label = shortLabels 
      ? `${diffDays}d` 
      : `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return { 
      status: 'critical', 
      label, 
      className: 'priority-critical',
      urgency: 'critical',
      daysRemaining: diffDays
    };
  }
  
  // URGENT - Due in 4-7 days (less than minimum production time)
  if (diffDays <= PRODUCTION_TIME.URGENT) {
    const label = shortLabels 
      ? `${diffDays}d` 
      : `Due in ${diffDays} days`;
    return { 
      status: 'urgent', 
      label, 
      className: 'priority-urgent',
      urgency: 'high',
      daysRemaining: diffDays
    };
  }
  
  // MEDIUM - Due in 8-14 days (within standard production time, but tight)
  if (diffDays <= PRODUCTION_TIME.MAX_STANDARD) {
    const label = shortLabels 
      ? `${diffDays}d` 
      : `Due in ${diffDays} days`;
    return { 
      status: 'medium', 
      label, 
      className: 'priority-medium',
      urgency: 'medium',
      daysRemaining: diffDays
    };
  }
  
  // NORMAL - Due after 14 days (comfortable timeline)
  if (!shortLabels) {
    return { 
      status: 'normal', 
      label: `Due in ${diffDays} days`, 
      className: 'priority-normal',
      urgency: 'low',
      daysRemaining: diffDays
    };
  }
  
  // For short labels on normal priority, return null (no chip needed)
  return null;
}

/**
 * Get color mapping for Material-UI Chip component based on priority
 * @param {Object} priority - Priority status object from getPriorityStatus
 * @returns {string} Material-UI color name
 */
export function getPriorityColor(priority) {
  if (!priority) return 'default';
  
  switch (priority.urgency) {
    case 'critical':
      return 'error';    // Red - immediate attention
    case 'high':
      return 'warning';  // Orange - urgent
    case 'medium':
      return 'info';     // Blue - moderate
    case 'low':
      return 'success';  // Green - comfortable
    default:
      return 'default';
  }
}

/**
 * Get textual description of priority level for accessibility
 * @param {Object} priority - Priority status object
 * @returns {string} Human-readable description
 */
export function getPriorityDescription(priority) {
  if (!priority) return 'No delivery date set';
  
  const { daysRemaining, urgency } = priority;
  
  if (daysRemaining < 0) {
    return `Critical: Order is ${Math.abs(daysRemaining)} days overdue`;
  }
  if (daysRemaining === 0) {
    return 'Critical: Order is due today';
  }
  if (urgency === 'critical') {
    return `Critical: Only ${daysRemaining} days remaining (rush order needed)`;
  }
  if (urgency === 'high') {
    return `Urgent: ${daysRemaining} days remaining (less than standard 1-week production time)`;
  }
  if (urgency === 'medium') {
    return `Medium: ${daysRemaining} days remaining (within standard 1-2 week timeline)`;
  }
  return `Normal: ${daysRemaining} days remaining (comfortable timeline)`;
}
