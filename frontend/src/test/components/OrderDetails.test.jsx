import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderDetails from '../../components/OrderDetails';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useOrderDetails } from '../../hooks/useOrderDetails';

vi.mock('../../contexts/CurrencyContext');
vi.mock('../../contexts/NotificationContext');
vi.mock('../../hooks/useOrderDetails');

describe('OrderDetails', () => {
  const mockOnClose = vi.fn();
  const mockOnOrderUpdated = vi.fn();
  const mockOnDuplicateOrder = vi.fn();
  const mockFormatPrice = (price) => `$${price.toFixed(2)}`;
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const mockOrder = {
    _id: 'order123',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerId: 'C001',
    customerAddress: '123 Main St',
    items: [{ name: 'Item 1', quantity: 2, price: 25.00 }],
    totalPrice: 50.00,
    status: 'processing',
    paymentStatus: 'paid',
    amountPaid: 50.00,
    customerNotes: 'Handle with care',
    expectedDeliveryDate: '2024-12-15',
  };

  const mockEditForm = {
    customerName: 'John Doe',
    customerId: 'C001',
    status: 'processing',
    paymentStatus: 'paid',
    amountPaid: 50.00,
    customerNotes: 'Handle with care',
  };

  const defaultHookReturn = {
    order: mockOrder,
    loading: false,
    saving: false,
    error: null,
    isEditing: false,
    editForm: mockEditForm,
    handleEditChange: vi.fn(),
    handleSave: vi.fn(),
    handleCancelEdit: vi.fn(),
    startEditing: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({ formatPrice: mockFormatPrice });
    useNotification.mockReturnValue({ 
      showSuccess: mockShowSuccess, 
      showError: mockShowError 
    });
    useOrderDetails.mockReturnValue(defaultHookReturn);
  });

  const defaultProps = {
    orderId: 'order123',
    onClose: mockOnClose,
    onOrderUpdated: mockOnOrderUpdated,
    onDuplicateOrder: mockOnDuplicateOrder,
  };

  it('should render order details dialog', () => {
    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display order ID in title', () => {
    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      loading: true,
      order: null,
    });

    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderDetails {...defaultProps} />);
    
    const closeButton = screen.getByLabelText(/Close dialog/i);
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show save button when editing', () => {
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      isEditing: true,
    });

    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('should show cancel button when editing', () => {
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      isEditing: true,
    });

    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('should call handleSave when save button is clicked', async () => {
    const handleSave = vi.fn();
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      isEditing: true,
      handleSave,
    });

    const user = userEvent.setup();
    render(<OrderDetails {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    expect(handleSave).toHaveBeenCalled();
  });

  it('should call handleCancelEdit when cancel button is clicked', async () => {
    const handleCancelEdit = vi.fn();
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      isEditing: true,
      handleCancelEdit,
    });

    const user = userEvent.setup();
    render(<OrderDetails {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    
    expect(handleCancelEdit).toHaveBeenCalled();
  });

  it('should show saving state on save button', () => {
    useOrderDetails.mockReturnValue({
      ...defaultHookReturn,
      isEditing: true,
      saving: true,
    });

    render(<OrderDetails {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
  });

  it('should call onDuplicateOrder and onClose when duplicate is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderDetails {...defaultProps} />);
    
    const duplicateButton = screen.getByRole('button', { name: /Duplicate/i });
    await user.click(duplicateButton);
    
    expect(mockOnDuplicateOrder).toHaveBeenCalledWith('order123');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
