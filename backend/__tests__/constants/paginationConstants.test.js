import { PAGINATION } from '../../constants/paginationConstants.ts';

describe('Pagination Constants', () => {
  describe('PAGINATION', () => {
    it('should have DEFAULT_PAGE set to 1', () => {
      expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    });

    it('should have DEFAULT_LIMIT set to 10', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBe(10);
    });

    it('should have ALLOWED_LIMITS as an array', () => {
      expect(Array.isArray(PAGINATION.ALLOWED_LIMITS)).toBe(true);
      expect(PAGINATION.ALLOWED_LIMITS).toContain(10);
      expect(PAGINATION.ALLOWED_LIMITS).toContain(20);
      expect(PAGINATION.ALLOWED_LIMITS).toContain(50);
      expect(PAGINATION.ALLOWED_LIMITS).toHaveLength(3);
    });

    it('should have MAX_LIMIT set to 50', () => {
      expect(PAGINATION.MAX_LIMIT).toBe(50);
    });

    it('should have all required properties', () => {
      expect(PAGINATION).toHaveProperty('DEFAULT_PAGE');
      expect(PAGINATION).toHaveProperty('DEFAULT_LIMIT');
      expect(PAGINATION).toHaveProperty('ALLOWED_LIMITS');
      expect(PAGINATION).toHaveProperty('MAX_LIMIT');
    });

    it('should have DEFAULT_LIMIT in ALLOWED_LIMITS', () => {
      expect(PAGINATION.ALLOWED_LIMITS).toContain(PAGINATION.DEFAULT_LIMIT);
    });

    it('should have MAX_LIMIT in ALLOWED_LIMITS', () => {
      expect(PAGINATION.ALLOWED_LIMITS).toContain(PAGINATION.MAX_LIMIT);
    });

    it('should have sorted ALLOWED_LIMITS in ascending order', () => {
      const sorted = [...PAGINATION.ALLOWED_LIMITS].sort((a, b) => a - b);
      expect(PAGINATION.ALLOWED_LIMITS).toEqual(sorted);
    });

    it('should have MAX_LIMIT as the largest in ALLOWED_LIMITS', () => {
      const maxInAllowed = Math.max(...PAGINATION.ALLOWED_LIMITS);
      expect(PAGINATION.MAX_LIMIT).toBe(maxInAllowed);
    });
  });
});
