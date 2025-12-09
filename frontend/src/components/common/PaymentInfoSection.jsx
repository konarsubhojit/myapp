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
import { PAYMENT_STATUSES } from '../../constants/orderConstants';

/**
 * Helper function to get chip color for payment status
 */
const getPaymentStatusColor = (paymentStatus) => {
  if (paymentStatus === 'paid') return 'success';
  if (paymentStatus === 'partially_paid') return 'warning';
  return 'default';
};

/**
 * Reusable payment information section
 * Can display or edit payment data based on mode
 */
function PaymentInfoSection({ 
  isEditing, 
  data, 
  formatPrice,
  onDataChange 
}) {
  if (isEditing) {
    return (
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Payment Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={data.paymentStatus}
                label="Payment Status"
                onChange={(e) => onDataChange('paymentStatus', e.target.value)}
              >
                {PAYMENT_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {data.paymentStatus === 'partially_paid' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Amount Paid"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={data.paidAmount}
                onChange={(e) => onDataChange('paidAmount', e.target.value)}
                fullWidth
              />
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Payment Information
      </Typography>
      <Grid container spacing={1}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Payment Status:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={PAYMENT_STATUSES.find(s => s.value === data.paymentStatus)?.label || 'Unpaid'} 
            size="small"
            color={getPaymentStatusColor(data.paymentStatus)}
          />
        </Grid>
        {data.paymentStatus === 'partially_paid' && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Amount Paid:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{formatPrice(data.paidAmount || 0)}</Typography>
            </Grid>
          </>
        )}
        {(data.paymentStatus === 'unpaid' || data.paymentStatus === 'partially_paid') && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Balance Due:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" fontWeight={600} color="error.main">
                {formatPrice(data.totalPrice - (data.paidAmount || 0))}
              </Typography>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}

PaymentInfoSection.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  data: PropTypes.shape({
    paymentStatus: PropTypes.string.isRequired,
    paidAmount: PropTypes.number,
    totalPrice: PropTypes.number.isRequired,
  }).isRequired,
  formatPrice: PropTypes.func.isRequired,
  onDataChange: PropTypes.func,
};

export default PaymentInfoSection;
