import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import LinkIcon from '@mui/icons-material/Link';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDialogTitle from './common/OrderDialogTitle';
import OrderDialogContent from './common/OrderDialogContent';

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
    onDuplicateOrder(orderId);
    onClose();
  };

  const handleGenerateFeedbackLink = () => {
    // Generate feedback link for customer
    const feedbackAppUrl = import.meta.env.VITE_FEEDBACK_APP_URL || 'http://localhost:3001';
    const feedbackLink = `${feedbackAppUrl}/?orderId=${order._id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(feedbackLink).then(() => {
      showSuccess('Feedback link copied to clipboard! Share this link with the customer.');
    }).catch(() => {
      // Fallback: show the link
      showSuccess(`Feedback link: ${feedbackLink}`);
    });
  };

  return (
    <>
      <Dialog 
        open={true} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="order-details-dialog-title"
      >
        <OrderDialogTitle
          order={order}
          priority={priority}
          loading={loading}
          error={error}
          isEditing={isEditing}
          onEdit={startEditing}
          onDuplicate={onDuplicateOrder ? handleDuplicate : null}
          onClose={onClose}
        />

        <OrderDialogContent
          order={order}
          loading={loading}
          error={error}
          isEditing={isEditing}
          editForm={editForm}
          formatPrice={formatPrice}
          priority={priority}
          onEditChange={handleEditChange}
        />

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Box>
            {order && order.status === 'completed' && !isEditing && (
              <Button 
                onClick={handleGenerateFeedbackLink}
                startIcon={<LinkIcon />}
                color="primary"
                variant="outlined"
              >
                Get Feedback Link
              </Button>
            )}
          </Box>
          <Box>
            {order && isEditing && (
              <>
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
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}

OrderDetails.propTypes = {
  orderId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onOrderUpdated: PropTypes.func.isRequired,
  onDuplicateOrder: PropTypes.func,
};

export default OrderDetails;
