import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getOrderStatusColor, getOrderPriorityColor } from '../../utils/orderUtils';

function OrderDetailsHeader({ 
  loading, 
  error, 
  order, 
  priority,
  isEditing, 
  onEdit, 
  onDuplicate,
  onClose 
}) {
  if (loading) {
    return <Typography variant="h6">Loading...</Typography>;
  }

  if (error && !order) {
    return <Typography variant="h6">Error</Typography>;
  }

  if (!order) {
    return null;
  }

  return (
    <>
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
    </>
  );
}

export default OrderDetailsHeader;
