import { useState, ReactElement } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import WarningIcon from '@mui/icons-material/Warning';
import TodayIcon from '@mui/icons-material/Today';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useCurrency } from '../contexts/CurrencyContext';
import { usePriorityOrders, OrderWithPriority, getDaysUntilDelivery } from '../hooks';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDetails from './OrderDetails';
import StatCard from './common/StatCard';
import type { OrderId } from '../types';

interface PriorityDashboardProps {
  onRefresh?: () => void;
  onDuplicateOrder?: (orderId: string) => void;
}

interface UrgencyDisplay {
  color: 'error' | 'warning' | 'info' | 'success';
  icon: ReactElement;
  label: string;
}

/**
 * Get color and icon based on urgency level
 */
function getUrgencyDisplay(urgency: 'critical' | 'high' | 'medium' | 'normal'): UrgencyDisplay {
  switch (urgency) {
    case 'critical':
      return { color: 'error', icon: <WarningIcon />, label: 'Critical' };
    case 'high':
      return { color: 'warning', icon: <PriorityHighIcon />, label: 'High Priority' };
    case 'medium':
      return { color: 'info', icon: <TodayIcon />, label: 'Medium Priority' };
    default:
      return { color: 'success', icon: <CheckCircleIcon />, label: 'Normal' };
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Sub-component: Priority Order Card
interface PriorityOrderCardProps {
  order: OrderWithPriority;
  formatPrice: (price: number) => string;
  onClick: (orderId: OrderId) => void;
}

function PriorityOrderCard({ order, formatPrice, onClick }: PriorityOrderCardProps) {
  const urgencyDisplay = getUrgencyDisplay(order.urgency);
  const priorityStatus = getPriorityStatus(order.expectedDeliveryDate, { orderStatus: order.status });
  
  const getPriorityChipColor = (status: string): 'error' | 'warning' | 'info' | 'success' => {
    if (status === 'overdue') return 'error';
    if (status === 'critical') return 'error';
    if (status === 'urgent') return 'warning';
    if (status === 'medium') return 'info';
    return 'success';
  };

  return (
    <Card 
      variant="outlined"
      sx={{ 
        borderLeft: 4, 
        borderLeftColor: `${urgencyDisplay.color}.main`,
        '&:hover': { 
          boxShadow: 2,
          bgcolor: 'action.hover'
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="primary">
              {order.orderId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customerName} • {order.customerId}
            </Typography>
          </Box>
          <Chip 
            icon={urgencyDisplay.icon}
            label={urgencyDisplay.label}
            color={urgencyDisplay.color}
            size="small"
          />
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Order Date
            </Typography>
            <Typography variant="body2">
              {formatDate(order.orderDate)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Delivery Date
            </Typography>
            <Typography variant="body2">
              {formatDate(order.expectedDeliveryDate)}
            </Typography>
            {priorityStatus && (
              <Chip 
                label={priorityStatus.label} 
                size="small" 
                sx={{ mt: 0.5 }}
                color={getPriorityChipColor(priorityStatus.status)}
                variant="outlined"
              />
            )}
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Priority Level
            </Typography>
            <Typography variant="body2">
              {order.priority}/10
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatPrice(order.totalPrice)}
            </Typography>
          </Grid>
        </Grid>

        {order.items && order.items.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Items ({order.items.length})
            </Typography>
            <Typography variant="body2">
              {order.items.map(item => `${item.name} (×${item.quantity})`).join(', ')}
            </Typography>
          </Box>
        )}

        {order.customerNotes && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Notes
            </Typography>
            <Typography variant="body2">
              {order.customerNotes}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <Button 
          size="small" 
          startIcon={<LocalShippingIcon />}
          onClick={() => onClick(order._id)}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}

function PriorityDashboard({ onRefresh, onDuplicateOrder }: PriorityDashboardProps) {
  const { formatPrice } = useCurrency();
  const [selectedOrderId, setSelectedOrderId] = useState<OrderId | null>(null);

  const {
    orders,
    criticalOrders,
    highPriorityOrders,
    mediumPriorityOrders,
    loading,
    error,
    fetchPriorityOrders,
  } = usePriorityOrders();

  const handleOrderClick = (orderId: OrderId) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = () => {
    setSelectedOrderId(null);
  };

  const handleOrderUpdated = () => {
    fetchPriorityOrders();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
          Priority Dashboard
        </Typography>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Priority Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchPriorityOrders}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            value={criticalOrders.length}
            label="Critical Orders"
            icon={<WarningIcon sx={{ fontSize: 40 }} />}
            color="error"
            bgcolor="error.50"
            borderColor="error.200"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            value={highPriorityOrders.length}
            label="High Priority"
            icon={<PriorityHighIcon sx={{ fontSize: 40 }} />}
            color="warning"
            bgcolor="warning.50"
            borderColor="warning.200"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            value={mediumPriorityOrders.length}
            label="Medium Priority"
            icon={<TodayIcon sx={{ fontSize: 40 }} />}
            color="info"
            bgcolor="info.50"
            borderColor="info.200"
          />
        </Grid>
      </Grid>

      {orders.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          <Typography variant="body1" fontWeight={500}>
            🎉 Great job! No urgent orders requiring immediate attention.
          </Typography>
        </Alert>
      ) : (
        <Stack spacing={2}>
          {orders.map(order => (
            <PriorityOrderCard
              key={order._id}
              order={order}
              formatPrice={formatPrice}
              onClick={handleOrderClick}
            />
          ))}
        </Stack>
      )}

      {selectedOrderId && (
        <OrderDetails 
          orderId={selectedOrderId} 
          onClose={handleCloseDetails}
          onOrderUpdated={handleOrderUpdated}
          onDuplicateOrder={onDuplicateOrder}
        />
      )}
    </Paper>
  );
}

export default PriorityDashboard;
