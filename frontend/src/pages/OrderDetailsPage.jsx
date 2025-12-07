import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import { getPriorityStatus } from '../utils/priorityUtils';
import { getOrderStatusColor, getOrderPriorityColor } from '../utils/orderUtils';
import OrderDetailsViewMode from '../components/common/OrderDetailsViewMode';

function OrderDetailsPage({ orderId, onBack, onEdit, onDuplicate }) {
  const { formatPrice } = useCurrency();
  
  const {
    order,
    loading,
    error,
  } = useOrderDetails(orderId);

  const priority = order ? getPriorityStatus(order.expectedDeliveryDate) : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !order) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back to Orders
        </Button>
      </Paper>
    );
  }

  if (!order) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Order not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header with back button and actions */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <IconButton onClick={onBack} aria-label="Back to orders">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" component="h1" fontWeight={600}>
              Order {order.orderId}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {priority && (
                <Chip 
                  label={priority.label} 
                  color={getOrderPriorityColor(priority)} 
                  size="small"
                />
              )}
              <Chip 
                label={order.status || 'Pending'} 
                color={getOrderStatusColor(order.status)} 
                size="small"
              />
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEdit(orderId)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => onDuplicate(orderId)}
            >
              Duplicate
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Order details content */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <OrderDetailsViewMode
        order={order}
        priority={priority}
        formatPrice={formatPrice}
      />
    </Paper>
  );
}

export default OrderDetailsPage;
