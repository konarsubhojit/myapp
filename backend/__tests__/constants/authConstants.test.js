import { GOOGLE_ISSUERS, JWKS_CONFIG } from '../../constants/authConstants.ts';

describe('Auth Constants', () => {
  describe('GOOGLE_ISSUERS', () => {
    it('should be an array with expected Google OAuth issuers', () => {
      expect(Array.isArray(GOOGLE_ISSUERS)).toBe(true);
      expect(GOOGLE_ISSUERS).toHaveLength(2);
      expect(GOOGLE_ISSUERS).toContain('https://accounts.google.com');
      expect(GOOGLE_ISSUERS).toContain('accounts.google.com');
    });
  });

  describe('JWKS_CONFIG', () => {
    it('should have CACHE_MAX_AGE set to 24 hours in milliseconds', () => {
      expect(JWKS_CONFIG.CACHE_MAX_AGE).toBe(24 * 60 * 60 * 1000);
      expect(JWKS_CONFIG.CACHE_MAX_AGE).toBe(86400000);
    });

    it('should have RATE_LIMIT_PER_MINUTE set to 10', () => {
      expect(JWKS_CONFIG.RATE_LIMIT_PER_MINUTE).toBe(10);
    });

    it('should have all required properties', () => {
      expect(JWKS_CONFIG).toHaveProperty('CACHE_MAX_AGE');
      expect(JWKS_CONFIG).toHaveProperty('RATE_LIMIT_PER_MINUTE');
    });
  });
});
