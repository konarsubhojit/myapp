import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { getPriorityOrders } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { MILLISECONDS, POLLING_INTERVALS } from '../constants/timeConstants';

/**
 * Calculate how many days until/since delivery date
 */
function getDaysUntilDelivery(deliveryDate) {
  if (!deliveryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((delivery - today) / MILLISECONDS.PER_DAY);
  return diffDays;
}

/**
 * Get notification message for an order
 */
function getNotificationMessage(order) {
  const days = getDaysUntilDelivery(order.expectedDeliveryDate);
  
  if (days !== null) {
    if (days < 0) {
      return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
    }
    if (days === 0) {
      return 'Due today!';
    }
    if (days <= 3) {
      return `Due in ${days} day${days > 1 ? 's' : ''}`;
    }
  }
  
  if (order.priority >= 8) {
    return 'Critical priority';
  }
  if (order.priority >= 5) {
    return 'High priority';
  }
  
  return 'Needs attention';
}

/**
 * Notification panel that shows priority orders
 * Shows a badge icon in header and floating panel when clicked
 */
function PriorityNotificationPanel({ onNavigateToPriority }) {
  const { showWarning } = useNotification();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasShownLoginNotification, setHasShownLoginNotification] = useState(false);

  const fetchPriorityOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPriorityOrders();
      
      // Ensure data is an array
      const ordersArray = Array.isArray(data) ? data : [];
      
      // Filter to show only most critical orders (top 10)
      const criticalOrders = ordersArray
        .filter(order => {
          const days = getDaysUntilDelivery(order.expectedDeliveryDate);
          return (days !== null && days <= 3) || order.priority >= 5;
        })
        .slice(0, 10);
      
      setOrders(criticalOrders);
      
      // Show notification on first load if there are critical orders
      if (!hasShownLoginNotification && criticalOrders.length > 0) {
        const criticalCount = criticalOrders.filter(o => {
          const days = getDaysUntilDelivery(o.expectedDeliveryDate);
          return (days !== null && days < 0) || o.priority >= 8;
        }).length;
        
        if (criticalCount > 0) {
          showWarning(
            `You have ${criticalCount} critical order${criticalCount > 1 ? 's' : ''} requiring immediate attention.`,
            'Important Orders'
          );
        }
        setHasShownLoginNotification(true);
      }
    } catch (err) {
      console.error('Failed to fetch priority orders:', err);
    } finally {
      setLoading(false);
    }
  }, [hasShownLoginNotification, showWarning]);

  useEffect(() => {
    fetchPriorityOrders();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchPriorityOrders, POLLING_INTERVALS.PRIORITY_ORDERS);
    
    return () => clearInterval(interval);
  }, [fetchPriorityOrders]);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleOrderClick = () => {
    setOpen(false);
    onNavigateToPriority();
  };

  const handleViewAll = () => {
    setOpen(false);
    onNavigateToPriority();
  };

  const criticalCount = orders.filter(order => {
    const days = getDaysUntilDelivery(order.expectedDeliveryDate);
    return (days !== null && days < 0) || order.priority >= 8;
  }).length;

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleToggle}
        aria-label={`${orders.length} priority notifications`}
      >
        <Badge 
          badgeContent={orders.length} 
          color="error"
          max={99}
        >
          <NotificationsActiveIcon />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { 
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Priority Orders
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {loading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        )}
        
        {!loading && orders.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No priority orders at the moment! 🎉
            </Typography>
          </Box>
        )}
        
        {!loading && orders.length > 0 && (
          <>
            {criticalCount > 0 && (
              <Paper 
                elevation={0} 
                sx={{ 
                  m: 2, 
                  p: 2, 
                  bgcolor: 'error.50',
                  border: '1px solid',
                  borderColor: 'error.200'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={600} color="error.dark">
                    Critical Alert
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {criticalCount} order{criticalCount > 1 ? 's' : ''} need{criticalCount === 1 ? 's' : ''} immediate attention
                </Typography>
              </Paper>
            )}

            <List sx={{ pt: 0 }}>
              {orders.map((order, index) => {
                const days = getDaysUntilDelivery(order.expectedDeliveryDate);
                const isCritical = (days !== null && days < 0) || order.priority >= 8;
                
                return (
                  <Box key={order._id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton onClick={handleOrderClick}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600} color="primary">
                                {order.orderId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {order.customerName}
                              </Typography>
                            </Box>
                            {isCritical ? (
                              <Chip 
                                icon={<WarningIcon />}
                                label="Critical" 
                                color="error" 
                                size="small"
                              />
                            ) : (
                              <Chip 
                                icon={<PriorityHighIcon />}
                                label="High" 
                                color="warning" 
                                size="small"
                              />
                            )}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary">
                            {getNotificationMessage(order)}
                          </Typography>
                          
                          {order.items && order.items.length > 0 && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              {order.items.length} item{order.items.length > 1 ? 's' : ''}
                            </Typography>
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  </Box>
                );
              })}
            </List>

            <Divider />

            <Box sx={{ p: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleViewAll}
              >
                View All Priority Orders
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}

PriorityNotificationPanel.propTypes = {
  onNavigateToPriority: PropTypes.func.isRequired
};

export default PriorityNotificationPanel;
