import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { getOrder, updateOrder } from '../services/api';
import { getPriorityStatus } from '../utils/priorityUtils';
import {
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
  PRIORITY_LEVELS,
} from '../constants/orderConstants';

/**
 * Gets the color for order status chips
 */
const getOrderStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets the color for priority chips based on priority data
 */
const getOrderPriorityColor = (priorityData) => {
  if (!priorityData) return 'default';
  if (priorityData.className.includes('overdue')) return 'error';
  if (priorityData.className.includes('due-today')) return 'warning';
  if (priorityData.className.includes('urgent')) return 'warning';
  return 'success';
};

/**
 * Formats date for display in order details
 */
const formatOrderDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats delivery date for display
 */
const formatOrderDeliveryDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Creates initial edit form state from order data
 */
const createEditFormFromOrder = (data) => ({
  customerName: data.customerName || '',
  customerId: data.customerId || '',
  orderFrom: data.orderFrom || '',
  expectedDeliveryDate: data.expectedDeliveryDate ? data.expectedDeliveryDate.split('T')[0] : '',
  status: data.status || 'pending',
  paymentStatus: data.paymentStatus || 'unpaid',
  paidAmount: data.paidAmount || 0,
  confirmationStatus: data.confirmationStatus || 'unconfirmed',
  customerNotes: data.customerNotes || '',
  priority: data.priority || 0
});

function OrderDetails({ orderId, onClose, onOrderUpdated, onDuplicateOrder }) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerId: '',
    orderFrom: '',
    expectedDeliveryDate: '',
    status: '',
    paymentStatus: '',
    paidAmount: '',
    confirmationStatus: '',
    customerNotes: '',
    priority: 0
  });

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOrder(orderId);
        setOrder(data);
        setEditForm(createEditFormFromOrder(data));
      } catch (err) {
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const validateFormData = () => {
    if (!editForm.customerName.trim() || !editForm.customerId.trim()) {
      return { valid: false, error: 'Customer name and ID are required' };
    }

    const parsedPaidAmount = Number.parseFloat(editForm.paidAmount);
    if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
      return { valid: false, error: 'Paid amount must be a valid non-negative number' };
    }

    if (parsedPaidAmount > order.totalPrice) {
      return { valid: false, error: 'Paid amount cannot exceed total price' };
    }

    if (
      editForm.paymentStatus === 'partially_paid' &&
      (parsedPaidAmount <= 0 || parsedPaidAmount >= order.totalPrice)
    ) {
      return { valid: false, error: 'For partially paid orders, paid amount must be greater than 0 and less than total price' };
    }

    return { valid: true, parsedPaidAmount };
  };

  const handleSave = async () => {
    const validation = validateFormData();
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updateData = {
        customerName: editForm.customerName.trim(),
        customerId: editForm.customerId.trim(),
        orderFrom: editForm.orderFrom,
        status: editForm.status,
        expectedDeliveryDate: editForm.expectedDeliveryDate || null,
        paymentStatus: editForm.paymentStatus,
        paidAmount: validation.parsedPaidAmount,
        confirmationStatus: editForm.confirmationStatus,
        customerNotes: editForm.customerNotes,
        priority: Number.parseInt(editForm.priority, 10)
      };

      const updatedOrder = await updateOrder(orderId, updateData);
      setOrder(updatedOrder);
      setIsEditing(false);
      if (onOrderUpdated) onOrderUpdated();
      showSuccess(`Order ${updatedOrder.orderId} updated successfully!`);
    } catch (err) {
      setError(err.message || 'Failed to update order');
      showError(err.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
    // Reset form to current order values
    if (order) {
      setEditForm(createEditFormFromOrder(order));
    }
  };

  const priority = order ? getPriorityStatus(order.expectedDeliveryDate) : null;

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="order-details-dialog-title"
    >
      <DialogTitle 
        id="order-details-dialog-title"
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 1,
          pb: 1,
        }}
      >
        {loading ? (
          <Typography variant="h6">Loading...</Typography>
        ) : error && !order ? (
          <Typography variant="h6">Error</Typography>
        ) : order ? (
          <Box>
            <Typography variant="h6" component="span">
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
        ) : null}
        <Box display="flex" alignItems="center" gap={1}>
          {order && !isEditing && (
            <>
              <Button 
                size="small" 
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              {onDuplicateOrder && (
                <Button 
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    onDuplicateOrder(orderId);
                    onClose();
                  }}
                >
                  Duplicate
                </Button>
              )}
            </>
          )}
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error && !order ? (
          <Alert severity="error">{error}</Alert>
        ) : order ? (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {isEditing ? (
              <Box component="form" id="order-edit-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Customer Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Customer Name"
                          value={editForm.customerName}
                          onChange={(e) => handleEditChange('customerName', e.target.value)}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Customer ID"
                          value={editForm.customerId}
                          onChange={(e) => handleEditChange('customerId', e.target.value)}
                          fullWidth
                          required
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Order Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Order Source</InputLabel>
                          <Select
                            value={editForm.orderFrom}
                            label="Order Source"
                            onChange={(e) => handleEditChange('orderFrom', e.target.value)}
                          >
                            {ORDER_SOURCES.map(source => (
                              <MenuItem key={source.value} value={source.value}>
                                {source.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={editForm.status}
                            label="Status"
                            onChange={(e) => handleEditChange('status', e.target.value)}
                          >
                            {ORDER_STATUSES.map(status => (
                              <MenuItem key={status.value} value={status.value}>
                                {status.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Confirmation Status</InputLabel>
                          <Select
                            value={editForm.confirmationStatus}
                            label="Confirmation Status"
                            onChange={(e) => handleEditChange('confirmationStatus', e.target.value)}
                          >
                            {CONFIRMATION_STATUSES.map(status => (
                              <MenuItem key={status.value} value={status.value}>
                                {status.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Expected Delivery Date"
                          type="date"
                          value={editForm.expectedDeliveryDate}
                          onChange={(e) => handleEditChange('expectedDeliveryDate', e.target.value)}
                          slotProps={{ inputLabel: { shrink: true } }}
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Priority Level</InputLabel>
                          <Select
                            value={editForm.priority}
                            label="Priority Level"
                            onChange={(e) => handleEditChange('priority', Number.parseInt(e.target.value, 10))}
                          >
                            {PRIORITY_LEVELS.map(level => (
                              <MenuItem key={level.value} value={level.value}>
                                {level.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Payment Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Payment Status</InputLabel>
                          <Select
                            value={editForm.paymentStatus}
                            label="Payment Status"
                            onChange={(e) => handleEditChange('paymentStatus', e.target.value)}
                          >
                            {PAYMENT_STATUSES.map(status => (
                              <MenuItem key={status.value} value={status.value}>
                                {status.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {editForm.paymentStatus === 'partially_paid' && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="Amount Paid"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={editForm.paidAmount}
                            onChange={(e) => handleEditChange('paidAmount', e.target.value)}
                            fullWidth
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Customer Notes
                    </Typography>
                    <TextField
                      value={editForm.customerNotes}
                      onChange={(e) => handleEditChange('customerNotes', e.target.value)}
                      placeholder="Enter any notes about this customer or order"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Customer Information
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Name:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">{order.customerName}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Customer ID:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">{order.customerId}</Typography></Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Order Information
                  </Typography>
                  <Grid container spacing={1} alignItems="center">
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Source:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Chip label={order.orderFrom} size="small" color="primary" /></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Status:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Chip label={order.status || 'Pending'} size="small" color={getOrderStatusColor(order.status)} /></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Confirmation:</Typography></Grid>
                    <Grid size={{ xs: 6 }}>
                      <Chip 
                        label={CONFIRMATION_STATUSES.find(s => s.value === order.confirmationStatus)?.label || 'Unconfirmed'} 
                        size="small" 
                        variant="outlined"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Priority:</Typography></Grid>
                    <Grid size={{ xs: 6 }}>
                      <Chip 
                        label={PRIORITY_LEVELS.find(l => l.value === (order.priority || 0))?.label || 'Normal'} 
                        size="small" 
                        variant="outlined"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Created:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">{formatOrderDate(order.createdAt)}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Expected Delivery:</Typography></Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">
                        {formatOrderDeliveryDate(order.expectedDeliveryDate)}
                        {priority && (
                          <Chip 
                            label={priority.label} 
                            size="small" 
                            color={getOrderPriorityColor(priority)}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Payment Information
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Payment Status:</Typography></Grid>
                    <Grid size={{ xs: 6 }}>
                      <Chip 
                        label={PAYMENT_STATUSES.find(s => s.value === order.paymentStatus)?.label || 'Unpaid'} 
                        size="small"
                        color={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'partially_paid' ? 'warning' : 'default'}
                      />
                    </Grid>
                    {order.paymentStatus === 'partially_paid' && (
                      <>
                        <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Amount Paid:</Typography></Grid>
                        <Grid size={{ xs: 6 }}><Typography variant="body2">{formatPrice(order.paidAmount || 0)}</Typography></Grid>
                      </>
                    )}
                    {(order.paymentStatus === 'unpaid' || order.paymentStatus === 'partially_paid') && (
                      <>
                        <Grid size={{ xs: 6 }}><Typography variant="body2" color="text.secondary">Balance Due:</Typography></Grid>
                        <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight={600} color="error.main">{formatPrice(order.totalPrice - (order.paidAmount || 0))}</Typography></Grid>
                      </>
                    )}
                  </Grid>
                </Box>

                {order.customerNotes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Customer Notes
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">{order.customerNotes}</Typography>
                      </Paper>
                    </Box>
                  </>
                )}

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Order Items
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {order.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2">{item.name}</Typography>
                              {item.customizationRequest && (
                                <Typography variant="caption" color="info.main" fontStyle="italic">
                                  Customization: {item.customizationRequest}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">{formatPrice(item.price)}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatPrice(item.price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right">
                            <Typography variant="subtitle2">Total:</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                              {formatPrice(order.totalPrice)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            )}
          </>
        ) : null}
      </DialogContent>

      {order && isEditing && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelEdit} color="inherit">
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default OrderDetails;
