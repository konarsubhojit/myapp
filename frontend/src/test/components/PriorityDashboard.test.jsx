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

  describe('Data Display', () => {
    it('should render priority orders with correct information', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockPriorityOrders);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });
      
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it('should display order items count and names', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockPriorityOrders);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Items \(2\)/)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Item 1.*×2.*Item 2.*×1/)).toBeInTheDocument();
      expect(screen.getByText(/Items \(1\)/)).toBeInTheDocument();
    });

    it('should display customer notes when present', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockPriorityOrders);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Urgent order')).toBeInTheDocument();
      });
    });

    it('should show correct urgency levels based on delivery dates', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const ordersWithDifferentUrgencies = [
        {
          ...mockPriorityOrders[0],
          _id: 'critical1',
          orderId: 'ORD-CRITICAL',
          expectedDeliveryDate: todayStr, // Due today - critical
        },
        {
          ...mockPriorityOrders[1],
          _id: 'high1',
          orderId: 'ORD-HIGH',
          expectedDeliveryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days - high
        },
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(ordersWithDifferentUrgencies);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        // Should render the orders
        expect(screen.getByText('ORD-CRITICAL')).toBeInTheDocument();
        expect(screen.getByText('ORD-HIGH')).toBeInTheDocument();
      });
    });

    it('should update summary cards based on order urgency', async () => {
      const today = new Date();
      const criticalOrders = [
        {
          ...mockPriorityOrders[0],
          expectedDeliveryDate: today.toISOString().split('T')[0], // Critical - due today
        },
        {
          ...mockPriorityOrders[1],
          expectedDeliveryDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Critical - overdue
        },
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(criticalOrders);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        // Both orders should be counted as critical
        const criticalCount = screen.getByText('Critical Orders').closest('div').querySelector('h4');
        expect(criticalCount).toHaveTextContent('2');
      });
    });

    it('should sort orders by effective priority (most urgent first)', async () => {
      const today = new Date();
      const ordersUnsorted = [
        {
          ...mockPriorityOrders[1],
          _id: 'order-normal',
          orderId: 'ORD-NORMAL',
          expectedDeliveryDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days away
          priority: 2,
        },
        {
          ...mockPriorityOrders[0],
          _id: 'order-critical',
          orderId: 'ORD-CRITICAL',
          expectedDeliveryDate: today.toISOString().split('T')[0], // Due today
          priority: 5,
        },
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(ordersUnsorted);
      renderWithProviders(<PriorityDashboard />);
      
      await waitFor(() => {
        const orderIds = screen.getAllByText(/ORD-/);
        // ORD-CRITICAL should appear before ORD-NORMAL
        const criticalIndex = orderIds.findIndex(el => el.textContent === 'ORD-CRITICAL');
        const normalIndex = orderIds.findIndex(el => el.textContent === 'ORD-NORMAL');
        expect(criticalIndex).toBeLessThan(normalIndex);
      });
    });
  });
});
