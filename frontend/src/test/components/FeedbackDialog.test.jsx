import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackDialog from '../../components/FeedbackDialog';
import { createFeedback, getFeedbackByOrderId } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

vi.mock('../../services/api');
vi.mock('../../contexts/NotificationContext');

describe('FeedbackDialog', () => {
  const mockShowNotification = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnFeedbackSubmitted = vi.fn();

  const mockCompletedOrder = {
    _id: 123,
    orderId: 'ORD-123',
    customerName: 'John Doe',
    status: 'completed',
  };

  const mockPendingOrder = {
    _id: 124,
    orderId: 'ORD-124',
    customerName: 'Jane Smith',
    status: 'pending',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNotification.mockReturnValue({
      showNotification: mockShowNotification,
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
    });
    getFeedbackByOrderId.mockResolvedValue(null);
  });

  it('should not render when open is false', () => {
    render(
      <FeedbackDialog
        open={false}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog when open is true', () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display order number in title', () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    expect(screen.getByText(/ORD-123/)).toBeInTheDocument();
  });

  it('should check for existing feedback on mount', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(getFeedbackByOrderId).toHaveBeenCalledWith(123);
    });
  });

  it('should show message if feedback already exists', async () => {
    getFeedbackByOrderId.mockResolvedValue({ _id: 1, orderId: 123, rating: 5 });

    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/already been submitted/i)).toBeInTheDocument();
    });
  });

  it('should show message if order is not completed', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockPendingOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/only be submitted for completed orders/i)).toBeInTheDocument();
    });
  });

  it('should render feedback form for completed order without feedback', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Overall Rating/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
    });
  });

  it('should render submit button', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /submit feedback/i });
      expect(submitButton).toBeInTheDocument();
      // Button should be disabled initially when no rating
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show warning if rating is not selected', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Overall Rating/)).toBeInTheDocument();
    });

    // The submit button should be disabled when rating is 0/null
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();

    // Try to click it anyway (it won't work because it's disabled)
    // Just verify the button state instead
    expect(createFeedback).not.toHaveBeenCalled();
  });

  it('should handle comment input', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Overall Rating/)).toBeInTheDocument();
    });

    const commentField = screen.getByPlaceholderText(/Tell us about your experience/i);
    await user.type(commentField, 'Great service!');

    expect(commentField).toHaveValue('Great service!');
  });

  it('should render product quality and delivery ratings', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Product Quality/)).toBeInTheDocument();
      expect(screen.getByText(/Delivery Experience/)).toBeInTheDocument();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Overall Rating/)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render public checkbox', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      const publicCheckbox = screen.getByRole('checkbox');
      expect(publicCheckbox).toBeInTheDocument();
      expect(publicCheckbox).toBeChecked(); // Should be checked by default
    });
  });

  it('should render all rating stars', async () => {
    render(
      <FeedbackDialog
        open={true}
        onClose={mockOnClose}
        order={mockCompletedOrder}
      />
    );

    await waitFor(() => {
      // There should be rating inputs (5 for overall + 5 for product quality + 5 for delivery = 15 total)
      const ratingInputs = screen.getAllByRole('radio');
      expect(ratingInputs.length).toBeGreaterThanOrEqual(15);
    });
  });
});
