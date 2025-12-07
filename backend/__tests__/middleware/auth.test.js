const { authMiddleware, optionalAuthMiddleware, validateToken } = require('../../middleware/auth');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn((kid, callback) => {
      callback(null, { getPublicKey: () => 'mock-public-key' });
    }),
  }));
});
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const jwt = require('jsonwebtoken');

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
  });
});
