import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderHistoryTableHeader from '../../../components/common/OrderHistoryTableHeader';

describe('OrderHistoryTableHeader', () => {
  const mockOnSort = vi.fn();
  const defaultProps = {
    sortConfig: { key: 'orderId', direction: 'asc' },
    onSort: mockOnSort,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTable = (props = {}) => {
    return render(
      <table>
        <OrderHistoryTableHeader {...defaultProps} {...props} />
      </table>
    );
  };

  it('should render all column headers', () => {
    renderWithTable();
    
    expect(screen.getByText('Order ID')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });

  it('should call onSort when column header is clicked', async () => {
    const user = userEvent.setup();
    renderWithTable();
    
    await user.click(screen.getByText('Customer'));
    
    expect(mockOnSort).toHaveBeenCalledWith('customerName');
  });

  it('should show active sort indicator on sorted column', () => {
    renderWithTable({ sortConfig: { key: 'totalPrice', direction: 'desc' } });
    
    // The Total column should show as sorted
    const totalButton = screen.getByText('Total').closest('span');
    expect(totalButton).toHaveClass('Mui-active');
  });

  it('should show asc direction when sort config is asc', () => {
    renderWithTable({ sortConfig: { key: 'orderId', direction: 'asc' } });
    
    const orderIdButton = screen.getByText('Order ID').closest('span');
    expect(orderIdButton).toHaveClass('Mui-active');
  });

  it('should handle multiple column sort clicks', async () => {
    const user = userEvent.setup();
    renderWithTable();
    
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByText('Payment'));
    
    expect(mockOnSort).toHaveBeenCalledTimes(2);
    expect(mockOnSort).toHaveBeenCalledWith('status');
    expect(mockOnSort).toHaveBeenCalledWith('paymentStatus');
  });
});
