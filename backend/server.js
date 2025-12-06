const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connectToDatabase } = require('./db/connection');
const { createLogger } = require('./utils/logger');
const { authMiddleware } = require('./middleware/auth');

const logger = createLogger('Server');
const app = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
logger.info('Starting application', { 
  nodeEnv: process.env.NODE_ENV || 'development',
  port: PORT,
  databaseConfigured: !!process.env.NEON_DATABASE_URL,
  authEnabled: process.env.AUTH_DISABLED !== 'true'
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', limiter);

async function initializeDatabase() {
  try {
    await connectToDatabase();
    logger.info('PostgreSQL connection successful');
  } catch (err) {
    logger.error('Database initialization failed', err);
    process.exit(1);
  }
}

initializeDatabase();

const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');

app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
