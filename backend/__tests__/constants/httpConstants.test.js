import { HTTP_STATUS, RATE_LIMIT, BODY_LIMITS, SERVER_CONFIG } from '../../constants/httpConstants.ts';

describe('HTTP Constants', () => {
  describe('HTTP_STATUS', () => {
    it('should have correct status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should have all required status codes', () => {
      expect(HTTP_STATUS).toHaveProperty('OK');
      expect(HTTP_STATUS).toHaveProperty('CREATED');
      expect(HTTP_STATUS).toHaveProperty('BAD_REQUEST');
      expect(HTTP_STATUS).toHaveProperty('UNAUTHORIZED');
      expect(HTTP_STATUS).toHaveProperty('FORBIDDEN');
      expect(HTTP_STATUS).toHaveProperty('NOT_FOUND');
      expect(HTTP_STATUS).toHaveProperty('INTERNAL_SERVER_ERROR');
    });
  });

  describe('RATE_LIMIT', () => {
    it('should have WINDOW_MS set to 15 minutes in milliseconds', () => {
      expect(RATE_LIMIT.WINDOW_MS).toBe(15 * 60 * 1000);
      expect(RATE_LIMIT.WINDOW_MS).toBe(900000);
    });

    it('should have MAX_REQUESTS set to 100', () => {
      expect(RATE_LIMIT.MAX_REQUESTS).toBe(100);
    });

    it('should have all required properties', () => {
      expect(RATE_LIMIT).toHaveProperty('WINDOW_MS');
      expect(RATE_LIMIT).toHaveProperty('MAX_REQUESTS');
    });
  });

  describe('BODY_LIMITS', () => {
    it('should have correct body limits', () => {
      expect(BODY_LIMITS.JSON).toBe('10mb');
      expect(BODY_LIMITS.URLENCODED).toBe('10mb');
    });

    it('should have all required properties', () => {
      expect(BODY_LIMITS).toHaveProperty('JSON');
      expect(BODY_LIMITS).toHaveProperty('URLENCODED');
    });
  });

  describe('SERVER_CONFIG', () => {
    it('should have DEFAULT_PORT set to 5000', () => {
      expect(SERVER_CONFIG.DEFAULT_PORT).toBe(5000);
    });

    it('should have TRUST_PROXY_LEVEL set to 1', () => {
      expect(SERVER_CONFIG.TRUST_PROXY_LEVEL).toBe(1);
    });

    it('should have all required properties', () => {
      expect(SERVER_CONFIG).toHaveProperty('DEFAULT_PORT');
      expect(SERVER_CONFIG).toHaveProperty('TRUST_PROXY_LEVEL');
    });
  });
});
