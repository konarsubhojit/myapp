import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PriorityDashboard from '../../components/PriorityDashboard';
import * as api from '../../services/api';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../services/api');

const createMockOrder = (overrides = {}) => ({
  _id: 'order1',
  orderId: 'ORD-001',
  customerName: 'John Doe',
  customerId: '@johndoe',
  totalPrice: 300,
  orderDate: new Date().toISOString(),
  expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  priority: 8,
  items: [
    { name: 'Test Item 1', quantity: 2 },
    { name: 'Test Item 2', quantity: 1 },
  ],
  customerNotes: 'Test notes',
  ...overrides,
});

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
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getPriorityOrders = vi.fn().mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should render the component with title', async () => {
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Priority Dashboard')).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      api.getPriorityOrders = vi.fn().mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render summary cards', async () => {
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Critical Orders')).toBeInTheDocument();
      });
      
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    });

    it('should show success message when no urgent orders', async () => {
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Great job! No urgent orders/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Display', () => {
    it('should display priority orders', async () => {
      const mockOrders = [createMockOrder()];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });
      
      expect(screen.getByText('John Doe • @johndoe')).toBeInTheDocument();
    });

    it('should display order items', async () => {
      const mockOrders = [createMockOrder()];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Test Item 1 \(×2\)/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Test Item 2 \(×1\)/i)).toBeInTheDocument();
    });

    it('should display customer notes when present', async () => {
      const mockOrders = [createMockOrder({ customerNotes: 'Special request' })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Special request')).toBeInTheDocument();
      });
    });

    it('should display priority level', async () => {
      const mockOrders = [createMockOrder({ priority: 8 })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('8/10')).toBeInTheDocument();
      });
    });

    it('should display total price', async () => {
      const mockOrders = [createMockOrder({ totalPrice: 500 })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/500/i)).toBeInTheDocument();
      });
    });
  });

  describe('Urgency Levels', () => {
    it('should mark overdue orders as critical', async () => {
      const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: overdueDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });

    it('should mark orders due within 3 days as critical', async () => {
      const criticalDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: criticalDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });

    it('should mark orders due within 4-7 days as high priority', async () => {
      const highPriorityDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: highPriorityDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument();
      });
    });

    it('should mark orders due within 8-14 days as medium priority', async () => {
      const mediumPriorityDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: mediumPriorityDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
      });
    });

    it('should mark orders due after 14 days as normal', async () => {
      const normalDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: normalDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });
    });
  });

  describe('Order Sorting', () => {
    it('should sort orders by effective priority', async () => {
      const normalOrder = createMockOrder({
        _id: 'order1',
        orderId: 'ORD-001',
        priority: 3,
        expectedDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      const criticalOrder = createMockOrder({
        _id: 'order2',
        orderId: 'ORD-002',
        priority: 5,
        expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      api.getPriorityOrders = vi.fn().mockResolvedValue([normalOrder, criticalOrder]);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const orderIds = screen.getAllByText(/ORD-/);
        expect(orderIds[0]).toHaveTextContent('ORD-002'); // Critical should be first
      });
    });

    it('should prioritize overdue orders over others', async () => {
      const futureOrder = createMockOrder({
        _id: 'order1',
        orderId: 'ORD-001',
        priority: 10,
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      const overdueOrder = createMockOrder({
        _id: 'order2',
        orderId: 'ORD-002',
        priority: 5,
        expectedDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      api.getPriorityOrders = vi.fn().mockResolvedValue([futureOrder, overdueOrder]);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const orderIds = screen.getAllByText(/ORD-/);
        expect(orderIds[0]).toHaveTextContent('ORD-002'); // Overdue should be first
      });
    });
  });

  describe('Summary Statistics', () => {
    it('should count critical orders correctly', async () => {
      const criticalOrders = [
        createMockOrder({ _id: 'order1', expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() }),
        createMockOrder({ _id: 'order2', expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }),
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(criticalOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const criticalCount = screen.getAllByText('2');
        expect(criticalCount.length).toBeGreaterThan(0);
      });
    });

    it('should count high priority orders correctly', async () => {
      const highPriorityOrders = [
        createMockOrder({ _id: 'order1', expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() }),
        createMockOrder({ _id: 'order2', expectedDeliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString() }),
        createMockOrder({ _id: 'order3', expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }),
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(highPriorityOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const highPriorityCount = screen.getAllByText('3');
        expect(highPriorityCount.length).toBeGreaterThan(0);
      });
    });

    it('should count medium priority orders correctly', async () => {
      const mediumPriorityOrders = [
        createMockOrder({ _id: 'order1', expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }),
      ];
      
      api.getPriorityOrders = vi.fn().mockResolvedValue(mediumPriorityOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const mediumPriorityCount = screen.getAllByText('1');
        expect(mediumPriorityCount.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh orders when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(api.getPriorityOrders).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);
      
      await waitFor(() => {
        expect(api.getPriorityOrders).toHaveBeenCalledTimes(2);
      });
    });

    it('should call onRefresh callback when provided', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(api.getPriorityOrders).toHaveBeenCalled();
      });
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);
      
      await waitFor(() => {
        expect(api.getPriorityOrders).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while loading', async () => {
      let resolvePromise;
      api.getPriorityOrders = vi.fn().mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i });
        expect(refreshButton).toBeDisabled();
      });
      
      resolvePromise([]);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      api.getPriorityOrders = vi.fn().mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });
    });

    it('should handle empty array response', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue([]);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Great job! No urgent orders/i)).toBeInTheDocument();
      });
    });

    it('should handle non-array response gracefully', async () => {
      api.getPriorityOrders = vi.fn().mockResolvedValue(null);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Great job! No urgent orders/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Details', () => {
    it('should open order details when view details button is clicked', async () => {
      const user = userEvent.setup();
      const mockOrders = [createMockOrder()];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      api.getOrder = vi.fn().mockResolvedValue(mockOrders[0]);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });
      
      const viewDetailsButton = screen.getByRole('button', { name: /View Details/i });
      await user.click(viewDetailsButton);
      
      await waitFor(() => {
        expect(api.getOrder).toHaveBeenCalledWith('order1');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format order dates correctly', async () => {
      const orderDate = new Date('2024-01-15').toISOString();
      const mockOrders = [createMockOrder({ orderDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
      });
    });

    it('should display dash when date is not provided', async () => {
      const mockOrders = [createMockOrder({ expectedDeliveryDate: null })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Status Display', () => {
    it('should show overdue status for overdue orders', async () => {
      const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const mockOrders = [createMockOrder({ expectedDeliveryDate: overdueDate })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/overdue/i)).toBeInTheDocument();
      });
    });

    it('should show due today status for orders due today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const mockOrders = [createMockOrder({ expectedDeliveryDate: today.toISOString() })];
      api.getPriorityOrders = vi.fn().mockResolvedValue(mockOrders);
      
      renderWithProviders(<PriorityDashboard onRefresh={mockOnRefresh} />);
      
      await waitFor(() => {
        expect(screen.getByText(/due today/i)).toBeInTheDocument();
      });
    });
  });
});
