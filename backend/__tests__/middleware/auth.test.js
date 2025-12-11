import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    decode: jest.fn(),
    verify: jest.fn(),
  },
}));
jest.unstable_mockModule('jwks-rsa', () => ({
  default: jest.fn(() => ({
    getSigningKey: jest.fn((kid, callback) => {
      callback(null, { getPublicKey: () => 'mock-public-key' });
    }),
  })),
}));
jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { authMiddleware, optionalAuthMiddleware, validateToken } = await import('../../middleware/auth.js');
const jwt = (await import('jsonwebtoken')).default;

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;
  let originalAuthDisabled;
  let originalNodeEnv;
  let originalGoogleClientId;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    originalAuthDisabled = process.env.AUTH_DISABLED;
    originalNodeEnv = process.env.NODE_ENV;
    originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  });

  afterEach(() => {
    process.env.AUTH_DISABLED = originalAuthDisabled;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should bypass auth when AUTH_DISABLED is true in development', async () => {
      process.env.AUTH_DISABLED = 'true';
      process.env.NODE_ENV = 'development';

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('dev-user');
    });

    it('should return 500 when AUTH_DISABLED is true in production', async () => {
      process.env.AUTH_DISABLED = 'true';
      process.env.NODE_ENV = 'production';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server configuration error' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', async () => {
      delete process.env.AUTH_DISABLED;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header is required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header format is invalid', async () => {
      delete process.env.AUTH_DISABLED;
      req.headers.authorization = 'InvalidFormat';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header must be Bearer token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is not Bearer', async () => {
      delete process.env.AUTH_DISABLED;
      req.headers.authorization = 'Basic token123';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header must be Bearer token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token validation fails', async () => {
      delete process.env.AUTH_DISABLED;
      req.headers.authorization = 'Bearer invalid-token';

      jwt.decode.mockReturnValue(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should successfully authenticate with valid Google token', async () => {
      delete process.env.AUTH_DISABLED;
      req.headers.authorization = 'Bearer valid-google-token';

      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'https://accounts.google.com', sub: 'user789', email: 'auth@example.com', name: 'Auth User' },
      });

      jwt.verify.mockImplementation((token, key, options, callback) => {
        callback(null, {
          sub: 'user789',
          email: 'auth@example.com',
          name: 'Auth User',
        });
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'user789',
        email: 'auth@example.com',
        name: 'Auth User',
        provider: 'google',
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should call next when no Authorization header', async () => {
      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should call next when Authorization header format is invalid', async () => {
      req.headers.authorization = 'InvalidFormat';

      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should call next even when token validation fails', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.decode.mockReturnValue(null);

      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should successfully authenticate with valid token when provided', async () => {
      req.headers.authorization = 'Bearer valid-token';

      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'https://accounts.google.com', sub: 'user-opt', email: 'opt@example.com', name: 'Opt User' },
      });

      jwt.verify.mockImplementation((token, key, options, callback) => {
        callback(null, {
          sub: 'user-opt',
          email: 'opt@example.com',
          name: 'Opt User',
        });
      });

      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'user-opt',
        email: 'opt@example.com',
        name: 'Opt User',
        provider: 'google',
      });
    });

    it('should handle token with missing issuer', async () => {
      req.headers.authorization = 'Bearer token-no-issuer';

      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { sub: 'user-no-iss' },
      });

      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should throw error when token format is invalid', async () => {
      jwt.decode.mockReturnValue(null);

      await expect(validateToken('invalid-token')).rejects.toThrow('Invalid token format');
    });

    it('should throw error for unsupported issuer', async () => {
      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'https://unsupported-issuer.com' },
      });

      await expect(validateToken('token')).rejects.toThrow('Unsupported token issuer');
    });

    it('should validate a valid Google token successfully', async () => {
      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'https://accounts.google.com', sub: 'user123', email: 'test@example.com', name: 'Test User' },
      });

      jwt.verify.mockImplementation((token, key, options, callback) => {
        callback(null, {
          sub: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        });
      });

      const result = await validateToken('valid-google-token');

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      });
    });

    it('should validate token with alternate Google issuer format', async () => {
      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'accounts.google.com', sub: 'user456', email: 'user@test.com', name: 'User Test' },
      });

      jwt.verify.mockImplementation((token, key, options, callback) => {
        callback(null, {
          sub: 'user456',
          email: 'user@test.com',
          name: 'User Test',
        });
      });

      const result = await validateToken('valid-token');

      expect(result).toEqual({
        id: 'user456',
        email: 'user@test.com',
        name: 'User Test',
        provider: 'google',
      });
    });

    it('should reject token when signature verification fails', async () => {
      jwt.decode.mockReturnValue({
        header: { kid: 'key-id' },
        payload: { iss: 'https://accounts.google.com' },
      });

      jwt.verify.mockImplementation((token, key, options, callback) => {
        callback(new Error('Invalid signature'));
      });

      await expect(validateToken('invalid-signature-token')).rejects.toThrow('Invalid signature');
    });
  });
});
