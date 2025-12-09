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

/**
 * Creates a priority status object
 */
function createPriorityStatus(status, label, className, level, icon) {
  return { status, label, className, level, icon };
}

/**
 * Generates a label for a given number of days
 */
function generateLabel(diffDays, shortLabels, isDueToday = false) {
  if (shortLabels) {
    return `${diffDays}d`;
  }
  if (isDueToday) {
    return 'Due Today';
  }
  const daysText = diffDays === 1 ? 'day' : 'days';
  return `Due in ${diffDays} ${daysText}`;
}

/**
 * Handles overdue orders
 */
function getOverdueStatus(diffDays, shortLabels) {
  const overdueDays = Math.abs(diffDays);
  let label;
  if (shortLabels) {
    label = `${overdueDays}d late`;
  } else {
    const dayPlural = overdueDays > 1 ? 's' : '';
    label = `Overdue by ${overdueDays} day${dayPlural}`;
  }
  return createPriorityStatus('overdue', label, 'priority-overdue', 'critical', '🔴');
}

/**
 * Handles critical priority (≤3 days)
 */
function getCriticalStatus(diffDays, shortLabels) {
  const label = generateLabel(diffDays, shortLabels, diffDays === 0);
  return createPriorityStatus('critical', label, 'priority-critical', 'critical', '🔴');
}

/**
 * Handles urgent priority (4-7 days)
 */
function getUrgentStatus(diffDays, shortLabels) {
  const label = generateLabel(diffDays, shortLabels);
  return createPriorityStatus('urgent', label, 'priority-urgent', 'urgent', '🟠');
}

/**
 * Handles medium priority (8-14 days)
 */
function getMediumStatus(diffDays, shortLabels) {
  const label = generateLabel(diffDays, shortLabels);
  return createPriorityStatus('medium', label, 'priority-medium', 'medium', '🔵');
}

/**
 * Handles normal priority (>14 days)
 */
function getNormalStatus(diffDays, shortLabels) {
  const label = generateLabel(diffDays, shortLabels);
  return createPriorityStatus('normal', label, 'priority-normal', 'normal', '🟢');
}

export function getPriorityStatus(expectedDeliveryDate, options = {}) {
  if (!expectedDeliveryDate) return null;
  
  const { shortLabels = false } = options;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(expectedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return getOverdueStatus(diffDays, shortLabels);
  if (diffDays <= 3) return getCriticalStatus(diffDays, shortLabels);
  if (diffDays <= 7) return getUrgentStatus(diffDays, shortLabels);
  if (diffDays <= 14) return getMediumStatus(diffDays, shortLabels);
  return getNormalStatus(diffDays, shortLabels);
}
