import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeedbackPanel from '../../components/FeedbackPanel';
import { getFeedbacksPaginated, getFeedbackStats } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

vi.mock('../../services/api');
vi.mock('../../contexts/NotificationContext');

describe('FeedbackPanel', () => {
  const mockShowNotification = vi.fn();

  const mockFeedbacks = [
    {
      _id: 1,
      orderId: 123,
      rating: 5,
      comment: 'Excellent service!',
      productQuality: 5,
      deliveryExperience: 4,
      isPublic: true,
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      _id: 2,
      orderId: 124,
      rating: 4,
      comment: 'Good overall',
      productQuality: 4,
      deliveryExperience: 4,
      isPublic: false,
      createdAt: '2024-01-16T11:00:00Z',
      responseText: 'Thank you for your feedback!',
      respondedAt: '2024-01-17T09:00:00Z',
    },
  ];

  const mockStats = {
    avgRating: '4.5',
    avgProductQuality: '4.7',
    avgDeliveryExperience: '4.3',
    totalFeedbacks: 10,
  };

  const mockPaginationData = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNotification.mockReturnValue({
      showNotification: mockShowNotification,
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
    });
    getFeedbacksPaginated.mockResolvedValue({
      feedbacks: mockFeedbacks,
      pagination: mockPaginationData,
    });
    getFeedbackStats.mockResolvedValue(mockStats);
  });

  it('should render title', () => {
    render(<FeedbackPanel />);
    expect(screen.getByText(/Customer Feedback/i)).toBeInTheDocument();
  });

  it('should fetch feedbacks on mount', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(getFeedbacksPaginated).toHaveBeenCalled();
      expect(getFeedbackStats).toHaveBeenCalled();
    });
  });

  it('should display loading spinner initially', () => {
    render(<FeedbackPanel />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display feedback statistics', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText('Average Rating')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('Product Quality')).toBeInTheDocument();
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText('Delivery Experience')).toBeInTheDocument();
      expect(screen.getByText('4.3')).toBeInTheDocument();
      expect(screen.getByText('Total Feedbacks')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('should display list of feedbacks', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Order #123/)).toBeInTheDocument();
      expect(screen.getByText(/Order #124/)).toBeInTheDocument();
      expect(screen.getByText('Excellent service!')).toBeInTheDocument();
      expect(screen.getByText('Good overall')).toBeInTheDocument();
    });
  });

  it('should display public badge for public feedback', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      const publicBadges = screen.getAllByText('Public');
      expect(publicBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display manager response when available', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText('Manager Response')).toBeInTheDocument();
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('should display rating labels', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('should show alert when no feedbacks available', async () => {
    getFeedbacksPaginated.mockResolvedValue({
      feedbacks: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No feedbacks available yet/i)).toBeInTheDocument();
    });
  });

  it('should handle error when fetching feedbacks', async () => {
    getFeedbacksPaginated.mockRejectedValue(new Error('Network error'));

    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error'
      );
    });
  });

  it('should handle pagination controls', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Order #123/)).toBeInTheDocument();
    });

    // Check if pagination controls are present
    const paginationControls = screen.getByText(/Page 1 of 1/i);
    expect(paginationControls).toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 16, 2024/)).toBeInTheDocument();
    });
  });

  it('should display detailed ratings when available', async () => {
    render(<FeedbackPanel />);

    await waitFor(() => {
      const productQualityLabels = screen.getAllByText('Product Quality');
      // At least 2: one in stats card and one in feedback detail
      expect(productQualityLabels.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should handle stats fetch error gracefully', async () => {
    getFeedbackStats.mockRejectedValue(new Error('Stats error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(getFeedbackStats).toHaveBeenCalled();
    });

    // Stats section should not be rendered on error
    await waitFor(() => {
      expect(screen.queryByText('Average Rating')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should display rating colors correctly', async () => {
    const lowRatingFeedback = {
      _id: 3,
      orderId: 125,
      rating: 2,
      comment: 'Needs improvement',
      createdAt: '2024-01-17T10:00:00Z',
      isPublic: true,
    };

    getFeedbacksPaginated.mockResolvedValue({
      feedbacks: [lowRatingFeedback],
      pagination: mockPaginationData,
    });

    render(<FeedbackPanel />);

    await waitFor(() => {
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  it('should render without crashing when stats have null values', async () => {
    getFeedbackStats.mockResolvedValue({
      avgRating: null,
      avgProductQuality: null,
      avgDeliveryExperience: null,
      totalFeedbacks: 0,
    });

    render(<FeedbackPanel />);

    await waitFor(() => {
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });
});
