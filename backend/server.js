import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { connectToDatabase } from './db/connection.js';
import { createLogger } from './utils/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { HTTP_STATUS, RATE_LIMIT, BODY_LIMITS, SERVER_CONFIG } from './constants/httpConstants.js';

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

import itemRoutes from './routes/items.js';
import orderRoutes from './routes/orders.js';

app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
