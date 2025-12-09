import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getOrderStatusColor, getOrderPriorityColor } from '../../utils/orderUtils';

function OrderDialogTitle({ 
  order, 
  priority, 
  loading, 
  error, 
  isEditing, 
  onEdit, 
  onDuplicate, 
  onClose 
}) {
  if (loading) {
    return (
      <DialogTitle id="order-details-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Loading...</Typography>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
    );
  }

  if (error && !order) {
    return (
      <DialogTitle id="order-details-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Error</Typography>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
    );
  }

  if (!order) {
    return null;
  }

  return (
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
      <Box display="flex" alignItems="center" gap={1}>
        {!isEditing && (
          <>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={onEdit}
            >
              Edit
            </Button>
            {onDuplicate && (
              <Button 
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={onDuplicate}
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
  );
}

OrderDialogTitle.propTypes = {
  order: PropTypes.object,
  priority: PropTypes.number,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  isEditing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default OrderDialogTitle;
