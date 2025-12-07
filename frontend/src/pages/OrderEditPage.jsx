import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOrderDetails } from '../hooks/useOrderDetails';
import OrderDetailsEditForm from '../components/common/OrderDetailsEditForm';

function OrderEditPage({ orderId, items, onBack, onSaved }) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  
  const {
    order,
    loading,
    saving,
    error,
    editForm,
    handleEditChange,
    handleSave: saveOrder,
  } = useOrderDetails(orderId, showSuccess, showError, () => onSaved(orderId));

  const handleSave = async () => {
    await saveOrder();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !order) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
      </Paper>
    );
  }

  if (!order) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Order not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mt: 2 }}>
          Back
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" fontWeight={600} sx={{ flex: 1 }}>
          Edit Order {order.orderId}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onBack}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Error display */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Edit form */}
      <OrderDetailsEditForm
        editForm={editForm}
        formatPrice={formatPrice}
        onEditChange={handleEditChange}
        onSubmit={handleSave}
      />
    </Paper>
  );
}

export default OrderEditPage;
