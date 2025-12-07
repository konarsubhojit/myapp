import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import CustomerInfoSection from './CustomerInfoSection';
import OrderInfoSection from './OrderInfoSection';
import PaymentInfoSection from './PaymentInfoSection';
import OrderItemsTable from './OrderItemsTable';

function OrderDetailsViewMode({ order, priority, formatPrice }) {
  return (
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
  );
}

export default OrderDetailsViewMode;
