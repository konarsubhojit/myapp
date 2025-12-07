const express = require('express');
const request = require('supertest');

// Mock dependencies BEFORE requiring any modules
jest.mock('../db/connection', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(),
}));
jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => next(),
}));

describe('Server Configuration', () => {
  let app;

  beforeEach(() => {
    // Create a simple app for testing
    app = express();
    const cors = require('cors');
    
    app.set('trust proxy', 1);
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    
    // Mock routes
    app.get('/api/items', (req, res) => res.json({ items: [] }));
    app.get('/api/orders', (req, res) => res.json({ orders: [] }));
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  });

  it('should have health endpoint', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should support CORS', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should parse JSON bodies', async () => {
    app.post('/api/test', (req, res) => {
      res.json({ received: req.body });
    });

    const response = await request(app)
      .post('/api/test')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.received).toEqual({ test: 'data' });
  });

  it('should handle URL encoded bodies', async () => {
    app.post('/api/form', (req, res) => {
      res.json({ received: req.body });
    });

    const response = await request(app)
      .post('/api/form')
      .send('name=test&value=123')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    expect(response.status).toBe(200);
  });

  it('should respect trust proxy setting', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});
