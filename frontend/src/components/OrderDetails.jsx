import PropTypes from 'prop-types';
import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDialogTitle from './common/OrderDialogTitle';
import OrderDialogContent from './common/OrderDialogContent';
import FeedbackDialog from './FeedbackDialog';

function OrderDetails({ orderId, onClose, onOrderUpdated, onDuplicateOrder }) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  
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

  const handleFeedbackClick = () => {
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackClose = () => {
    setFeedbackDialogOpen(false);
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
                onClick={handleFeedbackClick}
                startIcon={<FeedbackIcon />}
                color="primary"
              >
                Give Feedback
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

      {order && (
        <FeedbackDialog
          open={feedbackDialogOpen}
          onClose={handleFeedbackClose}
          order={order}
          onFeedbackSubmitted={() => {
            handleFeedbackClose();
            showSuccess('Thank you for your feedback!');
          }}
        />
      )}
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
