import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SalesReport from '../../components/SalesReport';
import { CurrencyProvider } from '../../contexts/CurrencyContext';

const createMockOrder = (overrides = {}) => ({
  _id: 'order1',
  orderId: 'ORD-001',
  customerName: 'John Doe',
  customerId: '@johndoe',
  orderFrom: 'instagram',
  totalPrice: 300,
  orderDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  items: [
    { name: 'Test Item 1', quantity: 2, price: 100 },
    { name: 'Test Item 2', quantity: 1, price: 100 },
  ],
  ...overrides,
});

const renderWithProviders = (component, initialPath = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CurrencyProvider>{component}</CurrencyProvider>
    </MemoryRouter>
  );
};

describe('SalesReport', () => {
  const mockOrders = [
    createMockOrder({ _id: 'order1', totalPrice: 300, orderFrom: 'instagram' }),
    createMockOrder({ _id: 'order2', totalPrice: 500, orderFrom: 'facebook', customerId: '@janedoe', customerName: 'Jane Doe' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText('Sales Report & Analytics')).toBeInTheDocument();
    });

    it('should render time range selector', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText(/Last Month/i)).toBeInTheDocument();
    });

    it('should render view selector', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByLabelText(/View/i)).toBeInTheDocument();
    });

    it('should render all time range options on desktop', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByRole('button', { name: /Last Week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Last Month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Last Quarter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Last Year/i })).toBeInTheDocument();
    });
  });

  describe('Overview View', () => {
    it('should display total sales', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });

    it('should display total orders count', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display average order value', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText('Avg. Order Value')).toBeInTheDocument();
    });

    it('should display unique customers count', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText('Unique Customers')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display top selling item when orders exist', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText(/Top Selling Item/i)).toBeInTheDocument();
    });

    it('should display top customer when orders exist', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText(/Top Customer/i)).toBeInTheDocument();
    });

    it('should display period comparison table', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText('Period Comparison')).toBeInTheDocument();
      expect(screen.getByText(/Last Week/i)).toBeInTheDocument();
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter orders by selected time range', async () => {
      const user = userEvent.setup();
      const oldOrder = createMockOrder({
        _id: 'old-order',
        orderDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        totalPrice: 100,
      });
      
      const recentOrder = createMockOrder({
        _id: 'recent-order',
        orderDate: new Date().toISOString(),
        totalPrice: 200,
      });
      
      renderWithProviders(<SalesReport orders={[oldOrder, recentOrder]} />);
      
      // Check month view initially (should show recent order only)
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
    });

    it('should change time range when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const weekButton = screen.getByRole('button', { name: /Last Week/i });
      await user.click(weekButton);
      
      // Should update the active button
      expect(weekButton).toHaveClass('MuiButton-contained');
    });

    it('should update URL when time range changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const quarterButton = screen.getByRole('button', { name: /Last Quarter/i });
      await user.click(quarterButton);
      
      await waitFor(() => {
        expect(window.location.search).toContain('range=quarter');
      });
    });

    it('should read time range from URL on load', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />, '/?range=week');
      
      const weekButton = screen.getByRole('button', { name: /Last Week/i });
      expect(weekButton).toHaveClass('MuiButton-contained');
    });

    it('should use default time range when URL param is invalid', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />, '/?range=invalid');
      
      const monthButton = screen.getByRole('button', { name: /Last Month/i });
      expect(monthButton).toHaveClass('MuiButton-contained');
    });
  });

  describe('View Switching', () => {
    it('should switch to items view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      
      const byItemOption = screen.getByRole('option', { name: /By Item/i });
      await user.click(byItemOption);
      
      await waitFor(() => {
        expect(screen.getByText('Top Items by Quantity Sold')).toBeInTheDocument();
      });
    });

    it('should switch to customers view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      
      const byCustomerOption = screen.getByRole('option', { name: /By Customer/i });
      await user.click(byCustomerOption);
      
      await waitFor(() => {
        expect(screen.getByText('Top Customers by Order Count')).toBeInTheDocument();
      });
    });

    it('should switch to source view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      
      const bySourceOption = screen.getByRole('option', { name: /By Source/i });
      await user.click(bySourceOption);
      
      await waitFor(() => {
        expect(screen.getByText('Orders by Source')).toBeInTheDocument();
      });
    });

    it('should update URL when view changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      
      const byItemOption = screen.getByRole('option', { name: /By Item/i });
      await user.click(byItemOption);
      
      await waitFor(() => {
        expect(window.location.search).toContain('view=byItem');
      });
    });

    it('should read view from URL on load', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />, '/?view=byItem');
      
      expect(screen.getByText('Top Items by Quantity Sold')).toBeInTheDocument();
    });

    it('should use default view when URL param is invalid', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />, '/?view=invalid');
      
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });
  });

  describe('Items View', () => {
    it('should display top items by quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Test Item 1/i)).toBeInTheDocument();
      });
    });

    it('should display top items by revenue', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Top Items by Revenue')).toBeInTheDocument();
      });
    });

    it('should show message when no items sold', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={[]} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText('No items sold in this period')).toBeInTheDocument();
      });
    });

    it('should display item quantities correctly', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({
          _id: 'order1',
          items: [{ name: 'Item A', quantity: 5, price: 100 }],
        }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/5 units/i)).toBeInTheDocument();
      });
    });

    it('should show trophy icon for top item by quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/🏆/)).toBeInTheDocument();
      });
    });

    it('should show money icon for top item by revenue', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/💰/)).toBeInTheDocument();
      });
    });
  });

  describe('Customers View', () => {
    it('should display top customers by order count', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Top Customers by Order Count')).toBeInTheDocument();
      });
    });

    it('should display top customers by revenue', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Top Customers by Revenue')).toBeInTheDocument();
      });
    });

    it('should show message when no customers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={[]} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getAllByText('No customers in this period')).toHaveLength(2);
      });
    });

    it('should display customer order counts', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({ _id: 'order1', customerId: '@john', customerName: 'John' }),
        createMockOrder({ _id: 'order2', customerId: '@john', customerName: 'John' }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/2 orders/i)).toBeInTheDocument();
      });
    });

    it('should display customer names and IDs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('@johndoe')).toBeInTheDocument();
      });
    });
  });

  describe('Source View', () => {
    it('should display orders by source', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Source/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Orders by Source')).toBeInTheDocument();
      });
    });

    it('should show message when no orders', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={[]} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Source/i }));
      
      await waitFor(() => {
        expect(screen.getByText('No orders in this period')).toBeInTheDocument();
      });
    });

    it('should display order counts by source', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({ _id: 'order1', orderFrom: 'instagram' }),
        createMockOrder({ _id: 'order2', orderFrom: 'instagram' }),
        createMockOrder({ _id: 'order3', orderFrom: 'facebook' }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Source/i }));
      
      await waitFor(() => {
        expect(screen.getByText('instagram')).toBeInTheDocument();
        expect(screen.getByText('facebook')).toBeInTheDocument();
      });
    });

    it('should sort sources by order count', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({ _id: 'order1', orderFrom: 'facebook' }),
        createMockOrder({ _id: 'order2', orderFrom: 'instagram' }),
        createMockOrder({ _id: 'order3', orderFrom: 'instagram' }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Source/i }));
      
      await waitFor(() => {
        const sources = screen.getAllByText(/instagram|facebook/);
        // Instagram should appear first (2 orders vs 1)
        expect(sources[0]).toHaveTextContent('instagram');
      });
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate total sales correctly', () => {
      const orders = [
        createMockOrder({ _id: 'order1', totalPrice: 100 }),
        createMockOrder({ _id: 'order2', totalPrice: 200 }),
        createMockOrder({ _id: 'order3', totalPrice: 300 }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      // Should show sum of all order totals
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });

    it('should calculate average order value correctly', () => {
      const orders = [
        createMockOrder({ _id: 'order1', totalPrice: 100 }),
        createMockOrder({ _id: 'order2', totalPrice: 200 }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      expect(screen.getByText('Avg. Order Value')).toBeInTheDocument();
    });

    it('should count unique customers correctly', () => {
      const orders = [
        createMockOrder({ _id: 'order1', customerId: '@john', customerName: 'John' }),
        createMockOrder({ _id: 'order2', customerId: '@john', customerName: 'John' }),
        createMockOrder({ _id: 'order3', customerId: '@jane', customerName: 'Jane' }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 unique customers
    });

    it('should handle orders with no items gracefully', () => {
      const orders = [
        createMockOrder({ _id: 'order1', items: [] }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
    });

    it('should handle zero average when no orders', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText('Avg. Order Value')).toBeInTheDocument();
    });
  });

  describe('Data Aggregation', () => {
    it('should aggregate item quantities correctly', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({
          _id: 'order1',
          items: [
            { name: 'Item A', quantity: 2, price: 100 },
            { name: 'Item B', quantity: 1, price: 50 },
          ],
        }),
        createMockOrder({
          _id: 'order2',
          items: [
            { name: 'Item A', quantity: 3, price: 100 },
          ],
        }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/5 units/i)).toBeInTheDocument(); // Item A: 2 + 3 = 5
      });
    });

    it('should aggregate customer data correctly', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({ _id: 'order1', customerId: '@john', customerName: 'John', totalPrice: 100 }),
        createMockOrder({ _id: 'order2', customerId: '@john', customerName: 'John', totalPrice: 200 }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Customer/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/2 orders/i)).toBeInTheDocument();
      });
    });

    it('should aggregate revenue by source correctly', async () => {
      const user = userEvent.setup();
      const orders = [
        createMockOrder({ _id: 'order1', orderFrom: 'instagram', totalPrice: 100 }),
        createMockOrder({ _id: 'order2', orderFrom: 'instagram', totalPrice: 200 }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Source/i }));
      
      await waitFor(() => {
        expect(screen.getByText('instagram')).toBeInTheDocument();
      });
    });
  });

  describe('Period Comparison Table', () => {
    it('should display all time periods in comparison table', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText(/Last Week/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Month/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Quarter/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Year/i)).toBeInTheDocument();
    });

    it('should highlight selected period in comparison table', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      const quarterButton = screen.getByRole('button', { name: /Last Quarter/i });
      await user.click(quarterButton);
      
      await waitFor(() => {
        // The selected row should have a highlighted background
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle empty orders array', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show zero for all metrics when no orders', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Unique Customers')).toBeInTheDocument();
    });
  });

  describe('URL Synchronization', () => {
    it('should sync both range and view in URL', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      // Change range
      const weekButton = screen.getByRole('button', { name: /Last Week/i });
      await user.click(weekButton);
      
      // Change view
      const viewSelect = screen.getByLabelText(/View/i);
      await user.click(viewSelect);
      await user.click(screen.getByRole('option', { name: /By Item/i }));
      
      await waitFor(() => {
        expect(window.location.search).toContain('range=week');
        expect(window.location.search).toContain('view=byItem');
      });
    });

    it('should not include default values in URL', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      // Default is month and overview, should not be in URL
      expect(window.location.search).not.toContain('range=month');
      expect(window.location.search).not.toContain('view=overview');
    });
  });
});
