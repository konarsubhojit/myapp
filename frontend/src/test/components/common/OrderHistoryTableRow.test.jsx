import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderHistoryTableRow from '../../../components/common/OrderHistoryTableRow';

describe('OrderHistoryTableRow', () => {
  const mockOnClick = vi.fn();
  const mockFormatPrice = (price) => `$${price.toFixed(2)}`;
  
  const mockOrder = {
    _id: 'order123',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    orderFrom: 'website',
    confirmationStatus: 'confirmed',
    status: 'processing',
    paymentStatus: 'paid',
    deliveryStatus: 'shipped',
    totalPrice: 150.00,
    expectedDeliveryDate: '2024-12-15',
  };

  const defaultProps = {
    order: mockOrder,
    formatPrice: mockFormatPrice,
    onClick: mockOnClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTable = (props = {}) => {
    return render(
      <table>
        <tbody>
          <OrderHistoryTableRow {...defaultProps} {...props} />
        </tbody>
      </table>
    );
  };

  it('should render order details', () => {
    renderWithTable();
    
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should format and display total price', () => {
    renderWithTable();
    
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('should call onClick when row is clicked', async () => {
    const user = userEvent.setup();
    renderWithTable();
    
    const row = screen.getByRole('row');
    await user.click(row);
    
    expect(mockOnClick).toHaveBeenCalledWith('order123');
  });

  it('should display payment status chip', () => {
    renderWithTable();
    
    // Payment status should show 'Paid'
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('should display delivery status chip', () => {
    renderWithTable();
    
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('should handle missing expected delivery date', () => {
    renderWithTable({ 
      order: { ...mockOrder, expectedDeliveryDate: null } 
    });
    
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should display confirmation status', () => {
    renderWithTable();
    
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('should display order status with correct color', () => {
    renderWithTable({ 
      order: { ...mockOrder, status: 'pending' } 
    });
    
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should display cancelled status correctly', () => {
    renderWithTable({ 
      order: { ...mockOrder, status: 'cancelled' } 
    });
    
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('should display completed status correctly', () => {
    renderWithTable({ 
      order: { ...mockOrder, status: 'completed' } 
    });
    
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should handle unpaid payment status', () => {
    renderWithTable({ 
      order: { ...mockOrder, paymentStatus: 'unpaid' } 
    });
    
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  it('should handle partially paid status', () => {
    renderWithTable({ 
      order: { ...mockOrder, paymentStatus: 'partially_paid' } 
    });
    
    expect(screen.getByText('Partially Paid')).toBeInTheDocument();
  });

  it('should handle various delivery statuses', () => {
    const deliveryStatuses = [
      { status: 'delivered', label: 'Delivered' },
      { status: 'out_for_delivery', label: 'Out for Delivery' },
      { status: 'in_transit', label: 'In Transit' },
      { status: 'returned', label: 'Returned' },
      { status: 'not_shipped', label: 'Not Shipped' },
    ];

    deliveryStatuses.forEach(({ status, label }) => {
      const { unmount } = renderWithTable({ 
        order: { ...mockOrder, deliveryStatus: status } 
      });
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});
