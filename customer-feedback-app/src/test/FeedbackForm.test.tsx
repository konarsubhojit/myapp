import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackForm from '../components/FeedbackForm';
import * as api from '../services/api';
import type { OrderInfo, OrderId } from '../types';

// Mock the API
vi.mock('../services/api');

const mockOrder: OrderInfo = {
  _id: 1 as OrderId,
  orderId: 'ORD-001',
  status: 'completed'
};

describe('FeedbackForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the form with all fields', () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Check for overall rating
    expect(screen.getByText('Overall Rating')).toBeInTheDocument();
    
    // Check for specific aspects section
    expect(screen.getByText('Rate Specific Aspects')).toBeInTheDocument();
    expect(screen.getByText('Product Quality')).toBeInTheDocument();
    expect(screen.getByText('Delivery Experience')).toBeInTheDocument();
    expect(screen.getByText('Customer Service')).toBeInTheDocument();
    
    // Check for comment field
    expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
    
    // Check for public checkbox
    expect(screen.getByLabelText('Make this feedback public (visible to other customers)')).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
  });

  it('should have submit button disabled when rating is 0', () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();
  });

  it('should update comment text', async () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    const commentField = screen.getByLabelText('Your Feedback');
    fireEvent.change(commentField, { target: { value: 'Great product!' } });

    expect(commentField).toHaveValue('Great product!');
  });

  it('should toggle public checkbox', async () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('should enable submit button when rating is selected', async () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Initially disabled
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeDisabled();

    // Select a rating using the radio input
    const ratingInputs = screen.getAllByRole('radio');
    // Find the 5-star radio for overall rating (value="5" and name="overall-rating")
    const fiveStarRating = ratingInputs.find(
      input => input.getAttribute('value') === '5' && input.getAttribute('name') === 'overall-rating'
    );
    expect(fiveStarRating).toBeDefined();
    fireEvent.click(fiveStarRating!);

    // Now enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit feedback/i })).not.toBeDisabled();
    });
  });

  it('should submit feedback successfully when rating is selected', async () => {
    vi.mocked(api.createFeedback).mockResolvedValueOnce({
      id: 1,
      orderId: 1,
      rating: 5,
      comment: 'Great!',
      productQuality: 5,
      deliveryExperience: 5,
      customerService: 5,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00Z'
    });

    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Select a rating using the radio input
    const ratingInputs = screen.getAllByRole('radio');
    const fiveStarRating = ratingInputs.find(
      input => input.getAttribute('value') === '5' && input.getAttribute('name') === 'overall-rating'
    );
    fireEvent.click(fiveStarRating!);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createFeedback).toHaveBeenCalled();
    });

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('should display error when submission fails', async () => {
    vi.mocked(api.createFeedback).mockRejectedValueOnce(new Error('Server error'));

    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Select a rating
    const ratingInputs = screen.getAllByRole('radio');
    const fiveStarRating = ratingInputs.find(
      input => input.getAttribute('value') === '5' && input.getAttribute('name') === 'overall-rating'
    );
    fireEvent.click(fiveStarRating!);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting', async () => {
    // Create a promise that doesn't resolve immediately
    let resolvePromise: (value: Awaited<ReturnType<typeof api.createFeedback>>) => void;
    const pendingPromise = new Promise<Awaited<ReturnType<typeof api.createFeedback>>>(resolve => {
      resolvePromise = resolve;
    });
    vi.mocked(api.createFeedback).mockReturnValueOnce(pendingPromise);

    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Select a rating
    const ratingInputs = screen.getAllByRole('radio');
    const fiveStarRating = ratingInputs.find(
      input => input.getAttribute('value') === '5' && input.getAttribute('name') === 'overall-rating'
    );
    fireEvent.click(fiveStarRating!);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!({
      id: 1,
      orderId: 1,
      rating: 5,
      comment: '',
      productQuality: null,
      deliveryExperience: null,
      customerService: null,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00Z'
    });
  });

  it('should clear error when form field changes', async () => {
    vi.mocked(api.createFeedback).mockRejectedValueOnce(new Error('Server error'));

    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Select a rating
    const ratingInputs = screen.getAllByRole('radio');
    const fiveStarRating = ratingInputs.find(
      input => input.getAttribute('value') === '5' && input.getAttribute('name') === 'overall-rating'
    );
    fireEvent.click(fiveStarRating!);

    // Submit the form to get an error
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    // Type in comment to clear error
    const commentField = screen.getByLabelText('Your Feedback');
    fireEvent.change(commentField, { target: { value: 'test' } });

    expect(screen.queryByText('Server error')).not.toBeInTheDocument();
  });

  it('should have aria labels for ratings', () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    // Check that rating components have proper aria-labels
    expect(screen.getByLabelText(/overall rating, required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/product quality rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery experience rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer service rating/i)).toBeInTheDocument();
  });

  it('should limit comment to 1000 characters', () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    const commentField = screen.getByLabelText('Your Feedback');
    expect(commentField).toHaveAttribute('maxLength', '1000');
  });

  it('should show character count for comment', () => {
    render(
      <FeedbackForm token="test-token" order={mockOrder} onSuccess={mockOnSuccess} />
    );

    expect(screen.getByText('0/1000 characters')).toBeInTheDocument();
  });
});
