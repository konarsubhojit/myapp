import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Rating,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { createFeedback, getFeedbackByOrderId } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const FeedbackDialog = ({ open, onClose, order, onFeedbackSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    productQuality: 0,
    deliveryExperience: 0,
    customerService: 0,
    isPublic: true
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    if (open && order) {
      checkExistingFeedback();
    }
  }, [open, order]);

  const checkExistingFeedback = async () => {
    try {
      const feedback = await getFeedbackByOrderId(order._id);
      if (feedback) {
        setHasExistingFeedback(true);
      } else {
        setHasExistingFeedback(false);
      }
    } catch (error) {
      setHasExistingFeedback(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      showNotification('Please provide an overall rating', 'warning');
      return;
    }

    try {
      setLoading(true);
      await createFeedback({
        orderId: order._id,
        ...formData
      });
      showNotification('Feedback submitted successfully!', 'success');
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      handleClose();
    } catch (error) {
      showNotification('Failed to submit feedback: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      rating: 0,
      comment: '',
      productQuality: 0,
      deliveryExperience: 0,
      customerService: 0,
      isPublic: true
    });
    setHasExistingFeedback(false);
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Submit Feedback for Order #{order.orderId}
      </DialogTitle>
      <DialogContent>
        {hasExistingFeedback ? (
          <Box py={3}>
            <Typography variant="body1" color="textSecondary" textAlign="center">
              Feedback has already been submitted for this order.
            </Typography>
          </Box>
        ) : order.status !== 'completed' ? (
          <Box py={3}>
            <Typography variant="body1" color="textSecondary" textAlign="center">
              Feedback can only be submitted for completed orders.
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {/* Overall Rating */}
            <Box mb={3}>
              <Typography component="legend" gutterBottom>
                Overall Rating <Typography component="span" color="error">*</Typography>
              </Typography>
              <Rating
                value={formData.rating}
                onChange={(event, newValue) => handleChange('rating', newValue)}
                size="large"
              />
            </Box>

            {/* Detailed Ratings */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={4}>
                <Typography component="legend" variant="body2" gutterBottom>
                  Product Quality
                </Typography>
                <Rating
                  value={formData.productQuality}
                  onChange={(event, newValue) => handleChange('productQuality', newValue)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography component="legend" variant="body2" gutterBottom>
                  Delivery Experience
                </Typography>
                <Rating
                  value={formData.deliveryExperience}
                  onChange={(event, newValue) => handleChange('deliveryExperience', newValue)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography component="legend" variant="body2" gutterBottom>
                  Customer Service
                </Typography>
                <Rating
                  value={formData.customerService}
                  onChange={(event, newValue) => handleChange('customerService', newValue)}
                />
              </Grid>
            </Grid>

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
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {!hasExistingFeedback && order.status === 'completed' && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || formData.rating === 0}
            startIcon={loading && <CircularProgress size={20} />}
          >
            Submit Feedback
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
