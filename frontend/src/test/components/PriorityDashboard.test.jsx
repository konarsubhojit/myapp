import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PriorityDashboard from '../../components/PriorityDashboard';
import * as api from '../../services/api';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../services/api');
vi.mock('../../components/OrderDetails', () => ({
  default: ({ onClose }) => (
    <div data-testid="order-details-mock">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockPriorityOrders = [
  {
    _id: 'order1',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerId: '@johndoe',
    orderDate: '2025-12-01',
    expectedDeliveryDate: '2025-12-05',
    totalPrice: 1000,
    priority: 8,
    items: [
      { name: 'Item 1', quantity: 2 },
      { name: 'Item 2', quantity: 1 },
    ],
    customerNotes: 'Urgent order',
  },
  {
    _id: 'order2',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    customerId: '@janesmith',
    orderDate: '2025-12-02',
    expectedDeliveryDate: '2025-12-15',
    totalPrice: 500,
    priority: 3,
    items: [
      { name: 'Item 3', quantity: 1 },
    ],
  },
];

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        <CurrencyProvider>{component}</CurrencyProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('PriorityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      api.getPriorityOrders = vi.fn(() => new Promise(() => {})); // Never resolves
      renderWithProviders(<PriorityDashboard />);
      
      expect(screen.getByText('Priority Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render empty state when no priority orders', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue([]);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Great job! No urgent orders requiring immediate attention/i)).toBeInTheDocument();
      });
    });

    it('should render dashboard title and refresh button', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue([]);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Priority Dashboard')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('should render summary cards for order priorities', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue([]);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Critical Orders')).toBeInTheDocument();
      });
      
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    });

    it('should handle API error gracefully', async () => {
      const errorMessage = 'Failed to fetch priority orders';
      api.getPriorityOrders = vi.fn().mockRejectedValue(new Error(errorMessage));
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });
});
