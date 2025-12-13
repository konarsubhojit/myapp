import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReport from '../../components/SalesReport';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  getSalesAnalytics: vi.fn(),
}));

const createMockAnalyticsResponse = () => ({
  analytics: {
    week: {
      totalSales: 800,
      orderCount: 2,
      topItems: [
        { name: 'Test Item 1', quantity: 3, revenue: 400 },
      ],
      topItemsByRevenue: [
        { name: 'Test Item 1', quantity: 3, revenue: 400 },
      ],
      sourceBreakdown: {
        instagram: { count: 1, revenue: 300 },
      },
      topCustomersByOrders: [
        { customerId: '@johndoe', customerName: 'John Doe', orderCount: 1, totalSpent: 300, items: {} },
      ],
      topCustomersByRevenue: [
        { customerId: '@johndoe', customerName: 'John Doe', orderCount: 1, totalSpent: 300, items: {} },
      ],
      highestOrderingCustomer: {
        customerId: '@johndoe',
        customerName: 'John Doe',
        orderCount: 1,
        totalSpent: 300,
        items: {},
      },
      averageOrderValue: 400,
      uniqueCustomers: 1,
    },
    month: {
      totalSales: 800,
      orderCount: 2,
      topItems: [
        { name: 'Test Item 1', quantity: 3, revenue: 400 },
      ],
      topItemsByRevenue: [
        { name: 'Test Item 1', quantity: 3, revenue: 400 },
      ],
      sourceBreakdown: {
        instagram: { count: 1, revenue: 300 },
      },
      topCustomersByOrders: [
        { customerId: '@johndoe', customerName: 'John Doe', orderCount: 1, totalSpent: 300, items: {} },
      ],
      topCustomersByRevenue: [
        { customerId: '@johndoe', customerName: 'John Doe', orderCount: 1, totalSpent: 300, items: {} },
      ],
      highestOrderingCustomer: {
        customerId: '@johndoe',
        customerName: 'John Doe',
        orderCount: 1,
        totalSpent: 300,
        items: {},
      },
      averageOrderValue: 400,
      uniqueCustomers: 1,
    },
    quarter: {
      totalSales: 0,
      orderCount: 0,
      topItems: [],
      topItemsByRevenue: [],
      sourceBreakdown: {},
      topCustomersByOrders: [],
      topCustomersByRevenue: [],
      highestOrderingCustomer: null,
      averageOrderValue: 0,
      uniqueCustomers: 0,
    },
    halfYear: {
      totalSales: 0,
      orderCount: 0,
      topItems: [],
      topItemsByRevenue: [],
      sourceBreakdown: {},
      topCustomersByOrders: [],
      topCustomersByRevenue: [],
      highestOrderingCustomer: null,
      averageOrderValue: 0,
      uniqueCustomers: 0,
    },
    year: {
      totalSales: 0,
      orderCount: 0,
      topItems: [],
      topItemsByRevenue: [],
      sourceBreakdown: {},
      topCustomersByOrders: [],
      topCustomersByRevenue: [],
      highestOrderingCustomer: null,
      averageOrderValue: 0,
      uniqueCustomers: 0,
    },
  },
  timeRanges: [
    { key: 'week', label: 'Last Week', days: 7 },
    { key: 'month', label: 'Last Month', days: 30 },
    { key: 'quarter', label: 'Last Quarter', days: 90 },
    { key: 'halfYear', label: 'Last 6 Months', days: 180 },
    { key: 'year', label: 'Last Year', days: 365 },
  ],
  generatedAt: new Date().toISOString(),
});

const renderWithProviders = (component) => {
  return render(
    <CurrencyProvider>{component}</CurrencyProvider>
  );
};

describe('SalesReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSalesAnalytics.mockResolvedValue(createMockAnalyticsResponse());
  });

  describe('Rendering', () => {
    it('should render the component with title', async () => {
      renderWithProviders(<SalesReport />);
      
      expect(screen.getByText('Sales Report & Analytics')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      renderWithProviders(<SalesReport />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should fetch analytics from API', async () => {
      renderWithProviders(<SalesReport />);
      
      await waitFor(() => {
        expect(api.getSalesAnalytics).toHaveBeenCalledWith('completed');
      });
    });

    it('should render view selector after loading', async () => {
      renderWithProviders(<SalesReport />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/View/i)).toBeInTheDocument();
      });
    });

    it('should render all time range options after loading', async () => {
      renderWithProviders(<SalesReport />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Last Week/i })).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /Last Month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Last Quarter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Last Year/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      api.getSalesAnalytics.mockRejectedValue(new Error('Failed to fetch analytics'));
      
      renderWithProviders(<SalesReport />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch analytics/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Filter', () => {
    it('should call API with all status filter when changed', async () => {
      renderWithProviders(<SalesReport />);
      
      await waitFor(() => {
        expect(api.getSalesAnalytics).toHaveBeenCalledWith('completed');
      });
      
      const statusFilter = await screen.findByLabelText(/Order Status/i);
      await userEvent.click(statusFilter);
      
      const allOption = await screen.findByText('All Orders');
      await userEvent.click(allOption);
      
      await waitFor(() => {
        expect(api.getSalesAnalytics).toHaveBeenCalledWith('all');
      });
    });
  });
});
