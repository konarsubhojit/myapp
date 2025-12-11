import { describe, it, expect } from '@jest/globals';
import { parsePaginationParams, calculateOffset, buildPaginationResponse } from '../../utils/pagination.js';
import { PAGINATION } from '../../constants/paginationConstants.js';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should return default values for empty query', () => {
      const result = parsePaginationParams({});
      expect(result).toEqual({
        page: PAGINATION.DEFAULT_PAGE,
        limit: PAGINATION.DEFAULT_LIMIT,
        search: ''
      });
    });

    it('should parse valid page and limit', () => {
      const result = parsePaginationParams({ page: '2', limit: '20' });
      expect(result).toEqual({
        page: 2,
        limit: 20,
        search: ''
      });
    });

    it('should use default for invalid page', () => {
      const result = parsePaginationParams({ page: 'invalid' });
      expect(result.page).toBe(PAGINATION.DEFAULT_PAGE);
    });

    it('should use default for page less than 1', () => {
      const result = parsePaginationParams({ page: '0' });
      expect(result.page).toBe(PAGINATION.DEFAULT_PAGE);
    });

    it('should use default for invalid limit', () => {
      const result = parsePaginationParams({ limit: 'invalid' });
      expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    });

    it('should use default for limit not in allowed list', () => {
      const result = parsePaginationParams({ limit: '15' });
      expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    });

    it('should include search parameter', () => {
      const result = parsePaginationParams({ search: 'test query' });
      expect(result.search).toBe('test query');
    });

    it('should accept custom options', () => {
      const customAllowed = new Set([5, 10, 20]);
      const result = parsePaginationParams(
        { page: '3', limit: '20' },
        { allowedLimits: customAllowed, defaultLimit: 5, defaultPage: 1 }
      );
      expect(result).toEqual({
        page: 3,
        limit: 20,
        search: ''
      });
    });
  });

  describe('calculateOffset', () => {
    it('should calculate correct offset for page 1', () => {
      expect(calculateOffset(1, 10)).toBe(0);
    });

    it('should calculate correct offset for page 2', () => {
      expect(calculateOffset(2, 10)).toBe(10);
    });

    it('should calculate correct offset for page 5 with limit 25', () => {
      expect(calculateOffset(5, 25)).toBe(100);
    });

    it('should handle large page numbers', () => {
      expect(calculateOffset(100, 50)).toBe(4950);
    });
  });

  describe('buildPaginationResponse', () => {
    it('should build correct pagination response', () => {
      const result = buildPaginationResponse(1, 10, 100);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10
      });
    });

    it('should handle non-divisible totals', () => {
      const result = buildPaginationResponse(2, 10, 95);
      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 95,
        totalPages: 10 // Math.ceil(95 / 10) = 10
      });
    });

    it('should handle empty results', () => {
      const result = buildPaginationResponse(1, 10, 0);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    });

    it('should handle single page results', () => {
      const result = buildPaginationResponse(1, 10, 5);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1
      });
    });
  });
});
