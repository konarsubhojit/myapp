import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';

/**
 * Reusable customer information section
 * Can display or edit customer data based on mode
 */
function CustomerInfoSection({ 
  isEditing, 
  data, 
  onDataChange 
}) {
  if (isEditing) {
    return (
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Customer Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Customer Name"
              value={data.customerName}
              onChange={(e) => onDataChange('customerName', e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Customer ID"
              value={data.customerId}
              onChange={(e) => onDataChange('customerId', e.target.value)}
              fullWidth
              required
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Customer Information
      </Typography>
      <Grid container spacing={1}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Name:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">{data.customerName}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Customer ID:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">{data.customerId}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CustomerInfoSection;
