import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderDialogContent from '../../../components/common/OrderDialogContent';

describe('OrderDialogContent', () => {
  const mockFormatPrice = (price) => `$${price.toFixed(2)}`;
  const mockOnEditChange = vi.fn();

  const mockOrder = {
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerId: 'C001',
    customerAddress: '123 Main St',
    items: [
      { name: 'Item 1', quantity: 2, price: 25.00 },
    ],
    totalPrice: 50.00,
    status: 'processing',
    paymentStatus: 'paid',
    amountPaid: 50.00,
    customerNotes: 'Handle with care',
  };

  const mockEditForm = {
    customerName: 'John Doe',
    customerId: 'C001',
    customerAddress: '123 Main St',
    status: 'processing',
    paymentStatus: 'paid',
    amountPaid: 50.00,
    customerNotes: 'Handle with care',
    expectedDeliveryDate: '2024-12-15',
    orderFrom: 'website',
    deliveryStatus: 'shipped',
    confirmationStatus: 'confirmed',
  };

  const mockPriority = {
    status: 'medium',
    label: 'Medium Priority',
    className: 'priority-medium',
  };

  const defaultProps = {
    order: mockOrder,
    loading: false,
    error: null,
    isEditing: false,
    editForm: mockEditForm,
    formatPrice: mockFormatPrice,
    priority: mockPriority,
    onEditChange: mockOnEditChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when loading', () => {
    render(<OrderDialogContent {...defaultProps} loading={true} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error alert when error and no order', () => {
    render(<OrderDialogContent {...defaultProps} error="Failed to load" order={null} />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
  });

  it('should return null when no order and not loading or error', () => {
    const { container } = render(<OrderDialogContent {...defaultProps} order={null} />);
    
    // DialogContent wrapper is still rendered, but it should be empty
    expect(container.textContent).toBe('');
  });

  it('should display order information when order exists and not editing', () => {
    render(<OrderDialogContent {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display order items table', () => {
    render(<OrderDialogContent {...defaultProps} />);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('should show error alert along with order content when both exist', () => {
    render(<OrderDialogContent {...defaultProps} error="Update failed" />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Update failed');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render edit form when isEditing is true', () => {
    render(<OrderDialogContent {...defaultProps} isEditing={true} />);
    
    // Should have form elements - edit form is rendered
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
  });

  it('should display customer notes in view mode', () => {
    render(<OrderDialogContent {...defaultProps} />);
    
    expect(screen.getByText('Handle with care')).toBeInTheDocument();
  });
});
