import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import CustomerInfoSection from './CustomerInfoSection';
import OrderInfoSection from './OrderInfoSection';
import PaymentInfoSection from './PaymentInfoSection';

function OrderDetailsEditForm({ editForm, formatPrice, onEditChange, onSubmit }) {
  return (
    <Box component="form" id="order-edit-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Stack spacing={3}>
        <CustomerInfoSection
          isEditing={true}
          data={editForm}
          onDataChange={onEditChange}
        />

        <OrderInfoSection
          isEditing={true}
          data={editForm}
          onDataChange={onEditChange}
        />

        <PaymentInfoSection
          isEditing={true}
          data={editForm}
          formatPrice={formatPrice}
          onDataChange={onEditChange}
        />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Customer Notes
          </Typography>
          <TextField
            value={editForm.customerNotes}
            onChange={(e) => onEditChange('customerNotes', e.target.value)}
            placeholder="Enter any notes about this customer or order"
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </Stack>
    </Box>
  );
}

export default OrderDetailsEditForm;
