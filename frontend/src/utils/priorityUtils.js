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
  }
  if (diffDays === 0) {
    return { status: 'due-today', label: 'Due Today', className: 'priority-due-today' };
  }
  if (diffDays <= 3) {
    const daysText = diffDays > 1 ? 's' : '';
    const label = shortLabels ? `${diffDays}d` : `Due in ${diffDays} day${daysText}`;
    return { status: 'urgent', label, className: 'priority-urgent' };
  }
  
  if (!shortLabels) {
    return { status: 'normal', label: `Due in ${diffDays} days`, className: 'priority-normal' };
  }
  
  return null;
}
