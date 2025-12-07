import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import {
  ORDER_SOURCES,
  ORDER_STATUSES,
  CONFIRMATION_STATUSES,
  PRIORITY_LEVELS,
} from '../../constants/orderConstants';
import {
  formatOrderDate,
  formatOrderDeliveryDate,
  getOrderStatusColor,
  getOrderPriorityColor,
} from '../../utils/orderUtils';

/**
 * Reusable order information section
 * Can display or edit order data based on mode
 */
function OrderInfoSection({ 
  isEditing, 
  data, 
  priority,
  onDataChange 
}) {
  if (isEditing) {
    return (
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Order Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Order Source</InputLabel>
              <Select
                value={data.orderFrom}
                label="Order Source"
                onChange={(e) => onDataChange('orderFrom', e.target.value)}
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
                value={data.status}
                label="Status"
                onChange={(e) => onDataChange('status', e.target.value)}
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
                value={data.confirmationStatus}
                label="Confirmation Status"
                onChange={(e) => onDataChange('confirmationStatus', e.target.value)}
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
              value={data.expectedDeliveryDate}
              onChange={(e) => onDataChange('expectedDeliveryDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Priority Level</InputLabel>
              <Select
                value={data.priority}
                label="Priority Level"
                onChange={(e) => onDataChange('priority', Number.parseInt(e.target.value, 10))}
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
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Order Information
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Source:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip label={data.orderFrom} size="small" color="primary" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Status:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip label={data.status || 'Pending'} size="small" color={getOrderStatusColor(data.status)} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Confirmation:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={CONFIRMATION_STATUSES.find(s => s.value === data.confirmationStatus)?.label || 'Unconfirmed'} 
            size="small" 
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Priority:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={PRIORITY_LEVELS.find(l => l.value === (data.priority || 0))?.label || 'Normal'} 
            size="small" 
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Created:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">{formatOrderDate(data.createdAt)}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Expected Delivery:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">
            {formatOrderDeliveryDate(data.expectedDeliveryDate)}
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
  );
}

export default OrderInfoSection;
