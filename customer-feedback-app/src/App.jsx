import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import FeedbackForm from './components/FeedbackForm';
import { validateToken } from './services/api';

function App() {
  const [token, setToken] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);

  useEffect(() => {
    // Get token from URL parameter
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setError('Invalid feedback link. Please use the link provided by the order manager.');
      setLoading(false);
      return;
    }
    
    setToken(tokenParam);
    validateFeedbackToken(tokenParam);
  }, []);

  const validateFeedbackToken = async (tokenParam) => {
    try {
      setLoading(true);
      
      // Validate token and get order details
      const data = await validateToken(tokenParam);
      setOrder(data.order);
      setHasExistingFeedback(data.hasExistingFeedback);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (hasExistingFeedback) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">
            Feedback Already Submitted
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Thank you! Feedback has already been submitted for Order #{order.orderId}.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (order && order.status !== 'completed') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">
            Order Not Completed
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Feedback can only be submitted for completed orders. Your order (#{order.orderId}) is currently {order.status}.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" fontWeight={600}>
          Share Your Feedback
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" mb={4}>
          Order #{order.orderId}
        </Typography>
        
        <FeedbackForm 
          token={token}
          order={order}
          onSuccess={() => {
            setHasExistingFeedback(true);
          }}
        />
      </Paper>
    </Container>
  );
}

export default App;
