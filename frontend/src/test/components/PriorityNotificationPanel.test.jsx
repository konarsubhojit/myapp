import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PriorityNotificationPanel from '../../components/PriorityNotificationPanel';
import { getPriorityOrders } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

vi.mock('../../services/api');
vi.mock('../../contexts/NotificationContext');

describe('PriorityNotificationPanel', () => {
  const mockShowWarning = vi.fn();

  const mockOrders = [
    {
      _id: 'order1',
      orderId: 'ORD-001',
      customerName: 'John Doe',
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      priority: 9,
    },
    {
      _id: 'order2',
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      expectedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      priority: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useNotification.mockReturnValue({ showWarning: mockShowWarning });
    getPriorityOrders.mockResolvedValue(mockOrders);
  });

  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  it('should render notification icon button', async () => {
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(screen.getByTestId('NotificationsActiveIcon')).toBeInTheDocument();
    });
  });

  it('should fetch priority orders on mount', async () => {
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
  });

  it('should show badge with order count', async () => {
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should open drawer when notification icon is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
    
    const notificationButton = screen.getByRole('button');
    await user.click(notificationButton);
    
    expect(screen.getByText('Priority Orders')).toBeInTheDocument();
  });

  it('should display order information in drawer', async () => {
    const user = userEvent.setup();
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
    
    const notificationButton = screen.getByRole('button');
    await user.click(notificationButton);
    
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should close drawer when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
    
    // Open drawer
    const notificationButton = screen.getByRole('button');
    await user.click(notificationButton);
    
    // Close drawer using CloseIcon button
    const closeButton = screen.getByTestId('CloseIcon').closest('button');
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Priority Orders')).not.toBeInTheDocument();
    });
  });

  it('should show no orders message when list is empty', async () => {
    getPriorityOrders.mockResolvedValue([]);
    const user = userEvent.setup();
    
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
    
    const notificationButton = screen.getByRole('button');
    await user.click(notificationButton);
    
    expect(screen.getByText(/No priority orders/i)).toBeInTheDocument();
  });

  it('should show warning notification for critical orders on mount', async () => {
    renderWithRouter(<PriorityNotificationPanel />);
    
    await waitFor(() => {
      expect(getPriorityOrders).toHaveBeenCalled();
    });
    
    // Give time for the notification to be shown
    await waitFor(() => {
      expect(mockShowWarning).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
