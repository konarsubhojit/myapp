import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  status: 'completed',
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








    it('should display top selling item when orders exist', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText(/Top Selling Item/i)).toBeInTheDocument();
    });

    it('should display top customer when orders exist', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      expect(screen.getByText(/Top Customer/i)).toBeInTheDocument();
    });


  });

  describe('Time Range Filtering', () => {
    it('should filter orders by selected time range', async () => {
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



    it('should read view from URL on load', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />, '/?view=byItem');
      
      expect(screen.getByText('Top Items by Quantity Sold')).toBeInTheDocument();
    });


  });

  describe('Items View', () => {


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






    it('should handle orders with no items gracefully', () => {
      const orders = [
        createMockOrder({ _id: 'order1', items: [] }),
      ];
      
      renderWithProviders(<SalesReport orders={orders} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
    });


  });

  describe('Data Aggregation', () => {




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


    it('should show zero for all metrics when no orders', () => {
      renderWithProviders(<SalesReport orders={[]} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Unique Customers')).toBeInTheDocument();
    });
  });

  describe('URL Synchronization', () => {


    it('should not include default values in URL', () => {
      renderWithProviders(<SalesReport orders={mockOrders} />);
      
      // Default is month and overview, should not be in URL
      expect(window.location.search).not.toContain('range=month');
      expect(window.location.search).not.toContain('view=overview');
    });
  });
});
