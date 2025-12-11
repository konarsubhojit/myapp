import { describe, it, expect, jest } from '@jest/globals';
import { 
  ApiError, 
  notFoundError, 
  badRequestError, 
  unauthorizedError, 
  forbiddenError,
  errorHandler,
  asyncHandler
} from '../../utils/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpConstants.js';

describe('Error Handler Utilities', () => {
  describe('ApiError', () => {
    it('should create an API error with correct properties', () => {
      const error = new ApiError(404, 'Not found');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ApiError');
    });

    it('should allow setting isOperational flag', () => {
      const error = new ApiError(500, 'Internal error', false);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Error factory functions', () => {
    it('should create a notFoundError', () => {
      const error = notFoundError('Item');
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.message).toBe('Item not found');
    });

    it('should create a badRequestError', () => {
      const error = badRequestError('Invalid input');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
    });

    it('should create an unauthorizedError', () => {
      const error = unauthorizedError();
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create a forbiddenError', () => {
      const error = forbiddenError();
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle ApiError instances', () => {
      const error = new ApiError(404, 'Not found');
      const req = { path: '/test', method: 'GET' };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const req = { path: '/test', method: 'POST' };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Something went wrong'
      });
    });

    it('should delegate to next if headers already sent', () => {
      const error = new Error('Too late');
      const req = {};
      const res = { headersSent: true };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async function and catch errors', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrapped = asyncHandler(asyncFn);
      
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through successful async functions', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(asyncFn);
      
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle sync functions', async () => {
      const syncFn = jest.fn();
      const wrapped = asyncHandler(syncFn);
      
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(syncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
