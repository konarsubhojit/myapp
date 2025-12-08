const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connectToDatabase } = require('./db/connection');
const { createLogger } = require('./utils/logger');
const { authMiddleware } = require('./middleware/auth');
const { HTTP_STATUS, RATE_LIMIT, BODY_LIMITS, SERVER_CONFIG } = require('./constants/httpConstants');

const logger = createLogger('Server');
const app = express();

app.set('trust proxy', SERVER_CONFIG.TRUST_PROXY_LEVEL);

const PORT = process.env.PORT || SERVER_CONFIG.DEFAULT_PORT;
logger.info('Starting application', { 
  nodeEnv: process.env.NODE_ENV || 'development',
  port: PORT,
  databaseConfigured: !!process.env.NEON_DATABASE_URL,
  authEnabled: process.env.AUTH_DISABLED !== 'true'
});

const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: { message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: BODY_LIMITS.JSON }));
app.use(express.urlencoded({ limit: BODY_LIMITS.URLENCODED, extended: true }));
app.use('/api/', limiter);

(async () => {
  try {
    await connectToDatabase();
    logger.info('PostgreSQL connection successful');
  } catch (err) {
    logger.error('Database initialization failed', err);
    process.exit(1);
  }
})();

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
