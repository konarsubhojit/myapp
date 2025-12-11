import { useState, type ChangeEvent, type FormEvent, type SyntheticEvent, type ReactElement } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Rating,
  Grid,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { createFeedback } from '../services/api';
import type { FeedbackFormProps, FeedbackFormData } from '../types';

// Using destructuring with underscore prefix to indicate unused variable
const FeedbackForm = ({ token, order: _order, onSuccess }: FeedbackFormProps): ReactElement => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    rating: 0,
    comment: '',
    productQuality: 0,
    deliveryExperience: 0,
    customerService: 0
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const handleChange = <K extends keyof FeedbackFormData>(
    field: K, 
    value: FeedbackFormData[K]
  ): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field: 'rating' | 'productQuality' | 'deliveryExperience' | 'customerService') => 
    (_event: SyntheticEvent, newValue: number | null): void => {
      handleChange(field, newValue ?? 0);
    };

  const handleCommentChange = (e: ChangeEvent<HTMLInputElement>): void => {
    handleChange('comment', e.target.value);
  };

  const handleCloseSuccess = (): void => {
    setShowSuccess(false);
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
          onChange={handleRatingChange('rating')}
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
              onChange={handleRatingChange('productQuality')}
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
              onChange={handleRatingChange('deliveryExperience')}
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
              onChange={handleRatingChange('customerService')}
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
        onChange={handleCommentChange}
        placeholder="Tell us about your experience..."
        inputProps={{ maxLength: 1000 }}
        helperText={`${formData.comment.length}/1000 characters`}
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
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Thank you for your feedback!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackForm;
