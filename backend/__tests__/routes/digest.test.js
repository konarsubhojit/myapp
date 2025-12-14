import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Store original env
const originalEnv = process.env;

// Mock dependencies
jest.unstable_mockModule('../../services/digestService', () => ({
  runDailyDigest: jest.fn()
}));

jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { default: digestRoutes } = await import('../../routes/digest.js');
const { runDailyDigest } = await import('../../services/digestService.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

// Set up express app
const app = express();
app.use(express.json());
app.use('/api/internal/digest', digestRoutes);
app.use(errorHandler);

describe('Digest Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, DIGEST_JOB_SECRET: 'test-secret-123' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/internal/digest/run', () => {
    describe('Authentication', () => {
      it('should reject requests without any authentication', async () => {
        const response = await request(app)
          .post('/api/internal/digest/run');

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid or missing authentication');
      });

      it('should reject requests with incorrect X-DIGEST-SECRET', async () => {
        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'wrong-secret');

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid or missing authentication');
      });

      it('should accept requests with correct X-DIGEST-SECRET', async () => {
        runDailyDigest.mockResolvedValue({ status: 'sent', digestDate: '2024-12-15' });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(200);
      });

      it('should accept requests with Vercel CRON_SECRET authorization', async () => {
        process.env.CRON_SECRET = 'vercel-cron-secret';
        delete process.env.DIGEST_JOB_SECRET;
        
        runDailyDigest.mockResolvedValue({ status: 'sent', digestDate: '2024-12-15' });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('Authorization', 'Bearer vercel-cron-secret');

        expect(response.status).toBe(200);
      });

      it('should return 500 when no secrets are configured', async () => {
        delete process.env.DIGEST_JOB_SECRET;
        delete process.env.CRON_SECRET;

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'any-secret');

        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Server configuration error');
      });
    });

    describe('Digest Execution', () => {
      it('should return success message when digest is sent', async () => {
        runDailyDigest.mockResolvedValue({
          status: 'sent',
          digestDate: '2024-12-15',
          orderCounts: { oneDay: 2, threeDay: 3, sevenDay: 5 }
        });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Digest completed successfully');
        expect(response.body.status).toBe('sent');
        expect(response.body.digestDate).toBe('2024-12-15');
        expect(response.body.orderCounts).toEqual({ oneDay: 2, threeDay: 3, sevenDay: 5 });
      });

      it('should return already_sent message for idempotency', async () => {
        runDailyDigest.mockResolvedValue({
          status: 'already_sent',
          digestDate: '2024-12-15'
        });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Digest already sent for today');
        expect(response.body.digestDate).toBe('2024-12-15');
      });

      it('should handle no recipients case', async () => {
        runDailyDigest.mockResolvedValue({
          status: 'sent',
          digestDate: '2024-12-15',
          message: 'No recipients configured'
        });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(200);
        // The message comes from the service result
        expect(response.body.status).toBe('sent');
      });

      it('should handle no orders case', async () => {
        runDailyDigest.mockResolvedValue({
          status: 'sent',
          digestDate: '2024-12-15',
          message: 'No orders requiring reminders'
        });

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(200);
        // The message comes from the service result
        expect(response.body.status).toBe('sent');
      });

      it('should return 500 when digest service throws an error', async () => {
        runDailyDigest.mockRejectedValue(new Error('Email service unavailable'));

        const response = await request(app)
          .post('/api/internal/digest/run')
          .set('X-DIGEST-SECRET', 'test-secret-123');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Digest failed');
        expect(response.body.error).toBe('Email service unavailable');
      });
    });
  });
});
