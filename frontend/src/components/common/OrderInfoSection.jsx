import PropTypes from 'prop-types';
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
  DELIVERY_STATUSES,
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
              label="Order Date"
              type="date"
              value={data.orderDate || ''}
              onChange={(e) => onDataChange('orderDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              helperText="Leave blank to use current date"
            />
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

        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
          Delivery Tracking
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Delivery Status</InputLabel>
              <Select
                value={data.deliveryStatus || 'not_shipped'}
                label="Delivery Status"
                onChange={(e) => onDataChange('deliveryStatus', e.target.value)}
              >
                {DELIVERY_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tracking ID / AWB Number"
              value={data.trackingId || ''}
              onChange={(e) => onDataChange('trackingId', e.target.value)}
              fullWidth
              placeholder="Enter tracking/AWB number"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Delivery Partner"
              value={data.deliveryPartner || ''}
              onChange={(e) => onDataChange('deliveryPartner', e.target.value)}
              fullWidth
              placeholder="e.g. Delhivery, DTDC, Blue Dart"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Actual Delivery Date"
              type="date"
              value={data.actualDeliveryDate || ''}
              onChange={(e) => onDataChange('actualDeliveryDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
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
        {data.orderDate && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Order Date:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{formatOrderDate(data.orderDate)}</Typography>
            </Grid>
          </>
        )}
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

      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
        Delivery Tracking
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Delivery Status:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={DELIVERY_STATUSES.find(s => s.value === (data.deliveryStatus || 'not_shipped'))?.label || 'Not Shipped'} 
            size="small" 
            color={data.deliveryStatus === 'delivered' ? 'success' : 'default'}
          />
        </Grid>
        {data.trackingId && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Tracking ID:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" fontFamily="monospace">{data.trackingId}</Typography>
            </Grid>
          </>
        )}
        {data.deliveryPartner && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Delivery Partner:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{data.deliveryPartner}</Typography>
            </Grid>
          </>
        )}
        {data.actualDeliveryDate && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Actual Delivery:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{formatOrderDate(data.actualDeliveryDate)}</Typography>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}

OrderInfoSection.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired,
  priority: PropTypes.number,
  onDataChange: PropTypes.func,
};

export default OrderInfoSection;
