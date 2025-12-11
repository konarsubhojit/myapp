import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';
import type { OrderId } from '../types';

// Mock the API
vi.mock('../services/api');

// Mock window.location
const mockLocation = {
  search: '',
  href: '',
  origin: 'http://localhost',
  pathname: '/'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token validation', () => {
    it('should show error when no token is provided', async () => {
      mockLocation.search = '';
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Invalid feedback link. Please use the link provided by the order manager.')).toBeInTheDocument();
      });
    });

    it('should show loading state while validating token', async () => {
      mockLocation.search = '?token=valid-token';
      
      // Create a pending promise
      vi.mocked(api.validateToken).mockImplementation(() => new Promise(() => {}));

      render(<App />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error when token validation fails', async () => {
      mockLocation.search = '?token=invalid-token';
      
      vi.mocked(api.validateToken).mockRejectedValueOnce(new Error('Invalid or expired feedback link'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired feedback link')).toBeInTheDocument();
      });
    });

    it('should show feedback form when token is valid', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-001',
          status: 'completed'
        },
        hasExistingFeedback: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
        expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
      });
    });
  });

  describe('Existing feedback handling', () => {
    it('should show message when feedback already exists', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-001',
          status: 'completed'
        },
        hasExistingFeedback: true
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Feedback Already Submitted')).toBeInTheDocument();
        expect(screen.getByText('Thank you! Feedback has already been submitted for Order #ORD-001.')).toBeInTheDocument();
      });
    });
  });

  describe('Order status handling', () => {
    it('should show message when order is not completed', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-001',
          status: 'pending'
        },
        hasExistingFeedback: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Order Not Completed')).toBeInTheDocument();
        expect(screen.getByText(/Feedback can only be submitted for completed orders/)).toBeInTheDocument();
        expect(screen.getByText(/is currently pending/)).toBeInTheDocument();
      });
    });

    it('should show message when order is processing', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-002',
          status: 'processing'
        },
        hasExistingFeedback: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Order Not Completed')).toBeInTheDocument();
        expect(screen.getByText(/is currently processing/)).toBeInTheDocument();
      });
    });

    it('should show message when order is cancelled', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-003',
          status: 'cancelled'
        },
        hasExistingFeedback: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Order Not Completed')).toBeInTheDocument();
        expect(screen.getByText(/is currently cancelled/)).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle non-Error objects in catch', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockRejectedValueOnce('String error');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });

    it('should display network errors', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockRejectedValueOnce(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('UI layout', () => {
    it('should render loading spinner centered', () => {
      mockLocation.search = '?token=valid-token';
      vi.mocked(api.validateToken).mockImplementation(() => new Promise(() => {}));

      render(<App />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render error in an Alert component', async () => {
      mockLocation.search = '';
      
      render(<App />);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveClass('MuiAlert-standardError');
      });
    });

    it('should render feedback form inside a Paper component', async () => {
      mockLocation.search = '?token=valid-token';
      
      vi.mocked(api.validateToken).mockResolvedValueOnce({
        order: {
          _id: 1 as OrderId,
          orderId: 'ORD-001',
          status: 'completed'
        },
        hasExistingFeedback: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
      });
    });
  });
});
