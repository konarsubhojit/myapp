const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connectToDatabase } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const { createLogger } = require('./utils/logger');

const logger = createLogger('Server');
const app = express();

const PORT = process.env.PORT || 5000;
logger.info('Starting application', { 
  nodeEnv: process.env.NODE_ENV || 'development',
  port: PORT,
  databaseConfigured: !!process.env.NEON_DATABASE_URL
});

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

async function initializeDatabase() {
  try {
    await runMigrations();
    logger.info('Database migrations completed');
    
    await connectToDatabase();
    logger.info('PostgreSQL connection successful');
  } catch (err) {
    logger.error('Database initialization failed', err);
    process.exit(1);
  }
}

initializeDatabase();

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
  logger.info(`Server running on port ${PORT}`);
});
