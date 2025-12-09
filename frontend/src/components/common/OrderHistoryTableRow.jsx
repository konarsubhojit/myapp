import PropTypes from 'prop-types';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { getPriorityStatus } from '../../utils/priorityUtils';
import { getOrderPriorityColor } from '../../utils/orderUtils';
import {
  getPaymentStatusLabel,
  getConfirmationStatusLabel,
  getDeliveryStatusLabel,
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

/**
 * Gets color for delivery status
 */
const getHistoryDeliveryColor = (status) => {
  switch (status) {
    case 'delivered': return 'success';
    case 'out_for_delivery': return 'info';
    case 'in_transit': return 'info';
    case 'shipped': return 'primary';
    case 'returned': return 'error';
    case 'not_shipped': return 'default';
    default: return 'default';
  }
};

function OrderHistoryTableRow({ order, formatPrice, onClick }) {
  const priority = getPriorityStatus(order.expectedDeliveryDate, { shortLabels: true });
  
  return (
    <TableRow 
      onClick={() => onClick(order._id)}
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
      <TableCell>
        <Chip 
          label={getDeliveryStatusLabel(order.deliveryStatus)} 
          size="small" 
          color={getHistoryDeliveryColor(order.deliveryStatus)}
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
            color={getOrderPriorityColor(priority)}
            sx={{ mt: 0.5 }}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

OrderHistoryTableRow.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    orderId: PropTypes.string.isRequired,
    customerName: PropTypes.string.isRequired,
    orderFrom: PropTypes.string,
    confirmationStatus: PropTypes.string,
    status: PropTypes.string,
    paymentStatus: PropTypes.string,
    deliveryStatus: PropTypes.string,
    totalPrice: PropTypes.number.isRequired,
    expectedDeliveryDate: PropTypes.string,
  }).isRequired,
  formatPrice: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default OrderHistoryTableRow;
