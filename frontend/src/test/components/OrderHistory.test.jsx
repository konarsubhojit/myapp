import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderHistory from '../../components/OrderHistory';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrderPagination } from '../../hooks/useOrderPagination';
import { useOrderFilters } from '../../hooks/useOrderFilters';

vi.mock('../../contexts/CurrencyContext');
vi.mock('../../hooks/useOrderPagination');
vi.mock('../../hooks/useOrderFilters');
vi.mock('../../components/OrderDetails', () => ({
  default: ({ onClose }) => (
    <div data-testid="order-details-dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('OrderHistory', () => {
  const mockFormatPrice = (price) => `$${price.toFixed(2)}`;
  const mockOnDuplicateOrder = vi.fn();

  const mockOrders = [
    {
      _id: 'order1',
      orderId: 'ORD-001',
      customerName: 'John Doe',
      orderFrom: 'website',
      confirmationStatus: 'confirmed',
      status: 'processing',
      paymentStatus: 'paid',
      deliveryStatus: 'shipped',
      totalPrice: 150.00,
      expectedDeliveryDate: '2024-12-15',
    },
    {
      _id: 'order2',
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      orderFrom: 'phone',
      confirmationStatus: 'pending',
      status: 'pending',
      paymentStatus: 'unpaid',
      deliveryStatus: 'not_shipped',
      totalPrice: 250.00,
      expectedDeliveryDate: '2024-12-20',
    },
  ];

  const defaultPaginationReturn = {
    orders: mockOrders,
    pagination: { page: 1, totalPages: 1, total: 2, limit: 10 },
    initialLoading: false,
    loading: false,
    error: null,
    fetchOrders: vi.fn(),
    handlePageChange: vi.fn(),
    handlePageSizeChange: vi.fn(),
  };

  const defaultFiltersReturn = {
    filters: {
      orderId: '',
      customerName: '',
      customerId: '',
      orderFrom: '',
      paymentStatus: '',
      confirmationStatus: '',
    },
    sortConfig: { key: 'createdAt', direction: 'desc' },
    sortedOrders: mockOrders,
    handleFilterChange: vi.fn(),
    handleClearFilters: vi.fn(),
    handleSort: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({ formatPrice: mockFormatPrice });
    useOrderPagination.mockReturnValue(defaultPaginationReturn);
    useOrderFilters.mockReturnValue(defaultFiltersReturn);
  });

  it('should render Order History title', () => {
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByText('Order History')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    useOrderPagination.mockReturnValue({
      ...defaultPaginationReturn,
      initialLoading: true,
    });

    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error message', () => {
    useOrderPagination.mockReturnValue({
      ...defaultPaginationReturn,
      error: 'Failed to load orders',
    });

    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load orders');
  });

  it('should display orders in the table', () => {
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display priority indicators section', () => {
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByText(/Priority Indicators/i)).toBeInTheDocument();
  });

  it('should open order details when order row is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    const orderRow = screen.getByText('ORD-001').closest('tr');
    await user.click(orderRow);
    
    expect(screen.getByTestId('order-details-dialog')).toBeInTheDocument();
  });

  it('should close order details dialog', async () => {
    const user = userEvent.setup();
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    // Open dialog
    const orderRow = screen.getByText('ORD-001').closest('tr');
    await user.click(orderRow);
    
    // Close dialog
    await user.click(screen.getByText('Close'));
    
    expect(screen.queryByTestId('order-details-dialog')).not.toBeInTheDocument();
  });

  it('should render table structure', () => {
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    // Check table is rendered
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should render filter section', () => {
    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should show no orders message when list is empty', () => {
    useOrderFilters.mockReturnValue({
      ...defaultFiltersReturn,
      sortedOrders: [],
    });

    render(<OrderHistory onDuplicateOrder={mockOnDuplicateOrder} />);
    
    expect(screen.getByText(/No orders found/i)).toBeInTheDocument();
  });
});
