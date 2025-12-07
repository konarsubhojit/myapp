import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { getPriorityStatus } from '../../utils/priorityUtils';
import {
  getPaymentStatusLabel,
  getConfirmationStatusLabel,
} from '../../constants/orderConstants';

/**
 * Formats delivery date for order history display
 */
const formatHistoryDeliveryDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Gets color for order status in history
 */
const getHistoryStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets color for priority indicators
 */
const getHistoryPriorityColor = (priorityData) => {
  if (!priorityData) return 'default';
  if (priorityData.className.includes('overdue')) return 'error';
  if (priorityData.className.includes('due-today')) return 'warning';
  if (priorityData.className.includes('urgent')) return 'warning';
  return 'success';
};

/**
 * Gets color for payment status
 */
const getHistoryPaymentColor = (status) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially_paid': return 'warning';
    case 'unpaid': return 'default';
    default: return 'default';
  }
};

function OrderHistoryTable({ orders, sortConfig, formatPrice, onSort, onOrderClick }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small" aria-label="Orders table">
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'orderId'}
                direction={sortConfig.key === 'orderId' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('orderId')}
              >
                Order ID
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'customerName'}
                direction={sortConfig.key === 'customerName' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('customerName')}
              >
                Customer
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'orderFrom'}
                direction={sortConfig.key === 'orderFrom' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('orderFrom')}
              >
                Source
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'confirmationStatus'}
                direction={sortConfig.key === 'confirmationStatus' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('confirmationStatus')}
              >
                Confirmation
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'status'}
                direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('status')}
              >
                Status
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'paymentStatus'}
                direction={sortConfig.key === 'paymentStatus' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('paymentStatus')}
              >
                Payment
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortConfig.key === 'totalPrice'}
                direction={sortConfig.key === 'totalPrice' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('totalPrice')}
              >
                Total
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortConfig.key === 'expectedDeliveryDate'}
                direction={sortConfig.key === 'expectedDeliveryDate' ? sortConfig.direction : 'asc'}
                onClick={() => onSort('expectedDeliveryDate')}
              >
                Delivery
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map(order => {
            const priority = getPriorityStatus(order.expectedDeliveryDate, { shortLabels: true });
            return (
              <TableRow 
                key={order._id} 
                onClick={() => onOrderClick(order._id)}
                hover
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {order.orderId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{order.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">{order.customerId}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={order.orderFrom} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getConfirmationStatusLabel(order.confirmationStatus)} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={order.status || 'pending'} 
                    size="small" 
                    color={getHistoryStatusColor(order.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getPaymentStatusLabel(order.paymentStatus)} 
                    size="small" 
                    color={getHistoryPaymentColor(order.paymentStatus)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>
                    {formatPrice(order.totalPrice)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatHistoryDeliveryDate(order.expectedDeliveryDate)}
                  </Typography>
                  {priority && (
                    <Chip 
                      label={priority.label} 
                      size="small" 
                      color={getHistoryPriorityColor(priority)}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default OrderHistoryTable;
