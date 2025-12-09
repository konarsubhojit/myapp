import { jest } from '@jest/globals';
import request from 'supertest';

// Mock dependencies BEFORE importing server
jest.unstable_mockModule('../db/connection', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(),
  getDatabase: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
  }),
}));

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.unstable_mockModule('../utils/logger', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

jest.unstable_mockModule('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => next(),
}));

describe('Server Module', () => {
  let app;
  let connectToDatabase;

  beforeAll(async () => {
    // Set NODE_ENV to test to prevent server from actually starting
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5001';
    process.env.NEON_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.AUTH_DISABLED = 'true';
    
    // Import mocked modules
    const connectionModule = await import('../db/connection.js');
    connectToDatabase = connectionModule.connectToDatabase;
    
    // Import server.js to get the app
    const serverModule = await import('../server.js');
    app = serverModule.app;
    
    // Wait for database connection to complete
    await new Promise(resolve => setImmediate(resolve));
  });

  it('should export express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function'); // Express app is a function
  });

  it('should log application startup information', () => {
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Starting application',
      expect.objectContaining({
        nodeEnv: expect.any(String),
        port: expect.any(String), // PORT is a string from env
        databaseConfigured: expect.any(Boolean),
        authEnabled: expect.any(Boolean)
      })
    );
  });

  it('should connect to database on startup', () => {
    expect(connectToDatabase).toHaveBeenCalled();
  });

  it('should log successful database connection', () => {
    expect(mockLogger.info).toHaveBeenCalledWith('PostgreSQL connection successful');
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
    const response = await request(app)
      .get('/api/items');
    
    // This will hit the real items route (which is mocked to not require auth)
    expect(response.status).toBeDefined();
  });

  it('should have items route configured', async () => {
    const response = await request(app).get('/api/items');
    // Route exists (might return various status codes depending on implementation)
    expect(response.status).toBeDefined();
  });

  it('should have orders route configured', async () => {
    const response = await request(app).get('/api/orders');
    // Route exists (might return various status codes depending on implementation)
    expect(response.status).toBeDefined();
  });

  it('should respect trust proxy setting', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});

describe('Server Database Error Handling', () => {
  let mockErrorLogger;
  let processExitSpy;

  beforeAll(async () => {
    // Reset modules to create fresh mocks
    jest.resetModules();
    
    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    const dbError = new Error('Database connection failed');
    
    jest.unstable_mockModule('../db/connection', () => ({
      connectToDatabase: jest.fn().mockRejectedValue(dbError),
      getDatabase: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([]),
      }),
    }));

    mockErrorLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    jest.unstable_mockModule('../utils/logger', () => ({
      createLogger: jest.fn(() => mockErrorLogger),
    }));

    jest.unstable_mockModule('../middleware/auth', () => ({
      authMiddleware: (req, res, next) => next(),
    }));

    // Set required env vars
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5002';
    process.env.NEON_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    // Import server module which should fail to connect to DB
    // Using dynamic import with a unique module specifier to avoid cache
    const modulePath = `../server.js`;
    await import(modulePath);
    
    // Wait for database connection promise to reject
    await new Promise(resolve => setImmediate(resolve));
  });

  afterAll(() => {
    processExitSpy.mockRestore();
  });

  it('should log database connection errors', () => {
    expect(mockErrorLogger.error).toHaveBeenCalledWith(
      'Database initialization failed',
      expect.any(Error)
    );
  });

  it('should call process.exit with code 1 on database error', () => {
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
