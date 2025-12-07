/**
 * Calculate priority status based on expected delivery date
 * Production timeline: 1-2 weeks standard
 * 
 * Priority Levels:
 * 🔴 OVERDUE: Past due date
 * 🔴 CRITICAL: ≤3 days (rush needed)
 * 🟠 URGENT: 4-7 days (tight, <1 week)
 * 🔵 MEDIUM: 8-14 days (standard 1-2 weeks)
 * 🟢 NORMAL: >14 days (comfortable)
 */
export function getPriorityStatus(expectedDeliveryDate, options = {}) {
  if (!expectedDeliveryDate) return null;
  
  const { shortLabels = false } = options;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(expectedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
  
  // 🔴 OVERDUE: Past due date
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const label = shortLabels ? `${overdueDays}d late` : `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
    return { 
      status: 'overdue', 
      label, 
      className: 'priority-overdue',
      level: 'critical',
      icon: '🔴'
    };
  }
  
  // 🔴 CRITICAL: ≤3 days (rush needed)
  if (diffDays <= 3) {
    const label = shortLabels 
      ? `${diffDays}d` 
      : diffDays === 0 
        ? 'Due Today' 
        : `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return { 
      status: 'critical', 
      label, 
      className: 'priority-critical',
      level: 'critical',
      icon: '🔴'
    };
  }
  
  // 🟠 URGENT: 4-7 days (tight, <1 week)
  if (diffDays <= 7) {
    const label = shortLabels ? `${diffDays}d` : `Due in ${diffDays} days`;
    return { 
      status: 'urgent', 
      label, 
      className: 'priority-urgent',
      level: 'urgent',
      icon: '🟠'
    };
  }
  
  // 🔵 MEDIUM: 8-14 days (standard 1-2 weeks)
  if (diffDays <= 14) {
    const label = shortLabels ? `${diffDays}d` : `Due in ${diffDays} days`;
    return { 
      status: 'medium', 
      label, 
      className: 'priority-medium',
      level: 'medium',
      icon: '🔵'
    };
  }
  
  // 🟢 NORMAL: >14 days (comfortable)
  const label = shortLabels ? `${diffDays}d` : `Due in ${diffDays} days`;
  return { 
    status: 'normal', 
    label, 
    className: 'priority-normal',
    level: 'normal',
    icon: '🟢'
  };
}
