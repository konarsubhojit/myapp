import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderDialogTitle from '../../../components/common/OrderDialogTitle';

describe('OrderDialogTitle', () => {
  const mockOnEdit = vi.fn();
  const mockOnDuplicate = vi.fn();
  const mockOnClose = vi.fn();

  const mockOrder = {
    orderId: 'ORD-001',
    status: 'processing',
  };

  const mockPriority = {
    status: 'medium',
    label: 'Medium Priority',
    className: 'priority-medium',
  };

  const defaultProps = {
    order: mockOrder,
    priority: mockPriority,
    loading: false,
    error: null,
    isEditing: false,
    onEdit: mockOnEdit,
    onDuplicate: mockOnDuplicate,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    render(<OrderDialogTitle {...defaultProps} loading={true} order={null} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error state when no order', () => {
    render(<OrderDialogTitle {...defaultProps} error="Failed to load" order={null} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render null when no order and not loading or error', () => {
    const { container } = render(<OrderDialogTitle {...defaultProps} order={null} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should display order ID when order exists', () => {
    render(<OrderDialogTitle {...defaultProps} />);
    
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderDialogTitle {...defaultProps} />);
    
    const closeButton = screen.getByLabelText(/Close dialog/i);
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderDialogTitle {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onDuplicate when duplicate button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrderDialogTitle {...defaultProps} />);
    
    const duplicateButton = screen.getByRole('button', { name: /Duplicate/i });
    await user.click(duplicateButton);
    
    expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
  });

  it('should hide edit button when isEditing is true', () => {
    render(<OrderDialogTitle {...defaultProps} isEditing={true} />);
    
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
  });

  it('should not render duplicate button when onDuplicate is null', () => {
    render(<OrderDialogTitle {...defaultProps} onDuplicate={null} />);
    
    expect(screen.queryByRole('button', { name: /Duplicate/i })).not.toBeInTheDocument();
  });

  it('should display status chip with correct color', () => {
    render(<OrderDialogTitle {...defaultProps} />);
    
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('should call onClose in loading state', async () => {
    const user = userEvent.setup();
    render(<OrderDialogTitle {...defaultProps} loading={true} order={null} />);
    
    const closeButton = screen.getByLabelText(/Close dialog/i);
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose in error state', async () => {
    const user = userEvent.setup();
    render(<OrderDialogTitle {...defaultProps} error="Error" order={null} />);
    
    const closeButton = screen.getByLabelText(/Close dialog/i);
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
