import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getPriorityOrders } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDetails from './OrderDetails';

/**
 * Calculate effective priority score for sorting
 * Higher score = more urgent
 */
function calculateEffectivePriority(order) {
  let score = order.priority || 0;
  
  if (order.expectedDeliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(order.expectedDeliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
    
    // Overdue orders get highest priority
    if (diffDays < 0) {
      score += 100 + Math.abs(diffDays); // More overdue = higher score
    }
    // Due today
    else if (diffDays === 0) {
      score += 50;
    }
    // Due within 3 days
    else if (diffDays <= 3) {
      score += 30 - (diffDays * 5); // Closer = higher score
    }
  }
  
  return score;
}

/**
 * Get urgency level for visual styling
 */
function getUrgencyLevel(order) {
  if (!order.expectedDeliveryDate) {
    return order.priority >= 8 ? 'critical' : order.priority >= 5 ? 'high' : 'normal';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(order.expectedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'critical';
  if (diffDays === 0) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'normal';
}

/**
 * Get color and icon based on urgency level
 */
function getUrgencyDisplay(urgency) {
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
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function PriorityDashboard({ onRefresh }) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchPriorityOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPriorityOrders();
      
      // Calculate effective priority and sort
      const ordersWithPriority = data.map(order => ({
        ...order,
        effectivePriority: calculateEffectivePriority(order),
        urgency: getUrgencyLevel(order)
      }));
      
      ordersWithPriority.sort((a, b) => b.effectivePriority - a.effectivePriority);
      
      setOrders(ordersWithPriority);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorityOrders();
  }, [fetchPriorityOrders]);

  const handleOrderClick = (orderId) => {
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

  const criticalOrders = orders.filter(o => o.urgency === 'critical');
  const highPriorityOrders = orders.filter(o => o.urgency === 'high');
  const mediumPriorityOrders = orders.filter(o => o.urgency === 'medium');

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
          <Card sx={{ bgcolor: 'error.50', border: '2px solid', borderColor: 'error.200' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WarningIcon sx={{ color: 'error.main', fontSize: 40 }} />
              <Typography variant="h4" fontWeight={700} color="error.main">
                {criticalOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: 'warning.50', border: '2px solid', borderColor: 'warning.200' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PriorityHighIcon sx={{ color: 'warning.main', fontSize: 40 }} />
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {highPriorityOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: 'info.50', border: '2px solid', borderColor: 'info.200' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TodayIcon sx={{ color: 'info.main', fontSize: 40 }} />
              <Typography variant="h4" fontWeight={700} color="info.main">
                {mediumPriorityOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Medium Priority
              </Typography>
            </CardContent>
          </Card>
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
          {orders.map(order => {
            const urgencyDisplay = getUrgencyDisplay(order.urgency);
            const priorityStatus = getPriorityStatus(order.expectedDeliveryDate);
            
            return (
              <Card 
                key={order._id}
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
                          color={
                            priorityStatus.status === 'overdue' ? 'error' :
                            priorityStatus.status === 'critical' ? 'error' :
                            priorityStatus.status === 'urgent' ? 'warning' :
                            priorityStatus.status === 'medium' ? 'info' : 'success'
                          }
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
                    onClick={() => handleOrderClick(order._id)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      {selectedOrderId && (
        <OrderDetails 
          orderId={selectedOrderId} 
          onClose={handleCloseDetails}
          onOrderUpdated={handleOrderUpdated}
          onDuplicateOrder={(orderId) => navigate(`/orders/duplicate/${orderId}`)}
        />
      )}
    </Paper>
  );
}

export default PriorityDashboard;
