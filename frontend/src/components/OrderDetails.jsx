import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDetailsHeader from './common/OrderDetailsHeader';
import OrderDetailsEditForm from './common/OrderDetailsEditForm';
import OrderDetailsViewMode from './common/OrderDetailsViewMode';

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

  const handleDuplicate = () => {
    if (onDuplicateOrder) {
      onDuplicateOrder(orderId);
      onClose();
    }
  };

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
        <OrderDetailsHeader
          loading={loading}
          error={error}
          order={order}
          priority={priority}
          isEditing={isEditing}
          onEdit={startEditing}
          onDuplicate={onDuplicateOrder ? handleDuplicate : null}
          onClose={onClose}
        />
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
              <OrderDetailsEditForm
                editForm={editForm}
                formatPrice={formatPrice}
                onEditChange={handleEditChange}
                onSubmit={handleSave}
              />
            ) : (
              <OrderDetailsViewMode
                order={order}
                priority={priority}
                formatPrice={formatPrice}
              />
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
