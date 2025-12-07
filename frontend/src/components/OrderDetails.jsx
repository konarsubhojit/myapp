import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import { getPriorityStatus } from '../utils/priorityUtils';
import { getOrderStatusColor, getOrderPriorityColor } from '../utils/orderUtils';
import CustomerInfoSection from './common/CustomerInfoSection';
import OrderInfoSection from './common/OrderInfoSection';
import PaymentInfoSection from './common/PaymentInfoSection';
import OrderItemsTable from './common/OrderItemsTable';

function OrderDetails({ orderId, onClose, onOrderUpdated, onDuplicateOrder }) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  
  const {
    order,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  } = useOrderDetails(orderId, showSuccess, showError, onOrderUpdated);

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
                onClick={startEditing}
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
                  <CustomerInfoSection
                    isEditing={true}
                    data={editForm}
                    onDataChange={handleEditChange}
                  />

                  <OrderInfoSection
                    isEditing={true}
                    data={editForm}
                    onDataChange={handleEditChange}
                  />

                  <PaymentInfoSection
                    isEditing={true}
                    data={editForm}
                    formatPrice={formatPrice}
                    onDataChange={handleEditChange}
                  />

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
                <CustomerInfoSection
                  isEditing={false}
                  data={order}
                />

                <Divider />

                <OrderInfoSection
                  isEditing={false}
                  data={order}
                  priority={priority}
                />

                <Divider />

                <PaymentInfoSection
                  isEditing={false}
                  data={order}
                  formatPrice={formatPrice}
                />

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

                <OrderItemsTable
                  items={order.items}
                  formatPrice={formatPrice}
                />
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
