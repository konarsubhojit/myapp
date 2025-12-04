const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connectToDatabase } = require('./db/connection');

const app = express();

// Log startup environment info
const PORT = process.env.PORT || 5000;
console.log('[Server] Starting application...');
console.log('[Server] NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('[Server] PORT:', PORT);
console.log('[Server] MONGODB_URI defined:', !!process.env.MONGODB_URI);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', limiter);

// MongoDB connection - optimized for serverless (Vercel)
connectToDatabase()
  .then(() => console.log('[Server] MongoDB connection successful'))
  .catch(err => {
    console.error('[Server] MongoDB connection error:', err.message);
    console.error('[Server] Full error:', err);
  });

// Routes
const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');

app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[Server] Server running on port ${PORT}`);
});
