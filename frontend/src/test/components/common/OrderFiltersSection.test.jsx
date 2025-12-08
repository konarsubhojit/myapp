import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderFiltersSection from '../../../components/common/OrderFiltersSection';

describe('OrderFiltersSection', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();
  
  const defaultFilters = {
    orderId: '',
    customerName: '',
    customerId: '',
    orderFrom: '',
    paymentStatus: '',
    confirmationStatus: '',
  };

  const defaultProps = {
    filters: defaultFilters,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all filter inputs', () => {
    render(<OrderFiltersSection {...defaultProps} />);
    
    expect(screen.getByLabelText(/Search by Order ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer ID/i)).toBeInTheDocument();
  });

  it('should call onFilterChange when order ID is typed', async () => {
    const user = userEvent.setup();
    render(<OrderFiltersSection {...defaultProps} />);
    
    const input = screen.getByLabelText(/Search by Order ID/i);
    await user.type(input, 'ORD-001');
    
    expect(mockOnFilterChange).toHaveBeenCalledWith('orderId', 'O');
  });

  it('should call onFilterChange when customer name is typed', async () => {
    const user = userEvent.setup();
    render(<OrderFiltersSection {...defaultProps} />);
    
    const input = screen.getByLabelText(/Customer Name/i);
    await user.type(input, 'John');
    
    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it('should call onFilterChange when customer ID is typed', async () => {
    const user = userEvent.setup();
    render(<OrderFiltersSection {...defaultProps} />);
    
    const input = screen.getByLabelText(/Customer ID/i);
    await user.type(input, 'C123');
    
    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it('should render source dropdown', () => {
    render(<OrderFiltersSection {...defaultProps} />);
    
    expect(screen.getAllByText('Source').length).toBeGreaterThan(0);
  });

  it('should render payment dropdown', () => {
    render(<OrderFiltersSection {...defaultProps} />);
    
    expect(screen.getAllByText('Payment').length).toBeGreaterThan(0);
  });

  it('should render status dropdown', () => {
    render(<OrderFiltersSection {...defaultProps} />);
    
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  it('should call onClearFilters when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderFiltersSection {...defaultProps} />);
    
    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    await user.click(clearButton);
    
    expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
  });

  it('should display current filter values', () => {
    const filtersWithValues = {
      ...defaultFilters,
      orderId: 'ORD-123',
      customerName: 'John',
    };
    
    render(<OrderFiltersSection {...defaultProps} filters={filtersWithValues} />);
    
    expect(screen.getByLabelText(/Search by Order ID/i)).toHaveValue('ORD-123');
    expect(screen.getByLabelText(/Customer Name/i)).toHaveValue('John');
  });
});
