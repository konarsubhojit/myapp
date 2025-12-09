import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  TextField,
  Typography,
  Rating,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { createFeedback } from '../services/api';

const FeedbackForm = ({ token, order, onSuccess }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    productQuality: 0,
    deliveryExperience: 0,
    customerService: 0,
    isPublic: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      setError('Please provide an overall rating');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await createFeedback({
        token,
        ...formData
      });
      
      setShowSuccess(true);
      
      // Call onSuccess after a short delay to show the message
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Overall Rating */}
      <Box mb={3}>
        <Typography component="legend" gutterBottom fontWeight={500}>
          Overall Rating <Typography component="span" color="error">*</Typography>
        </Typography>
        <Rating
          name="overall-rating"
          aria-label="Overall rating, required"
          value={formData.rating}
          onChange={(event, newValue) => handleChange('rating', newValue)}
          size="large"
        />
      </Box>

      {/* Detailed Ratings */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom fontWeight={500}>
          Rate Specific Aspects
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography component="legend" variant="body2" gutterBottom>
              Product Quality
            </Typography>
            <Rating
              name="product-quality"
              aria-label="Product quality rating"
              value={formData.productQuality}
              onChange={(event, newValue) => handleChange('productQuality', newValue)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography component="legend" variant="body2" gutterBottom>
              Delivery Experience
            </Typography>
            <Rating
              name="delivery-experience"
              aria-label="Delivery experience rating"
              value={formData.deliveryExperience}
              onChange={(event, newValue) => handleChange('deliveryExperience', newValue)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography component="legend" variant="body2" gutterBottom>
              Customer Service
            </Typography>
            <Rating
              name="customer-service"
              aria-label="Customer service rating"
              value={formData.customerService}
              onChange={(event, newValue) => handleChange('customerService', newValue)}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Comment */}
      <TextField
        fullWidth
        label="Your Feedback"
        multiline
        rows={4}
        value={formData.comment}
        onChange={(e) => handleChange('comment', e.target.value)}
        placeholder="Tell us about your experience..."
        inputProps={{ maxLength: 1000 }}
        helperText={`${formData.comment.length}/1000 characters`}
        sx={{ mb: 2 }}
      />

      {/* Public Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.isPublic}
            onChange={(e) => handleChange('isPublic', e.target.checked)}
          />
        }
        label="Make this feedback public (visible to other customers)"
        sx={{ mb: 3 }}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={loading || formData.rating === 0}
        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </Button>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Thank you for your feedback!
        </Alert>
      </Snackbar>
    </Box>
  );
};

FeedbackForm.propTypes = {
  token: PropTypes.string.isRequired,
  order: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    orderId: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired
  }).isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default FeedbackForm;
