import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_VERSION } from '../../config/version';

// Mock all context providers and components
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    guestMode: false,
  }),
}));

vi.mock('../../contexts/CurrencyContext', () => ({
  CurrencyProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../services/api', () => ({
  getItems: vi.fn().mockResolvedValue([]),
  getOrders: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../components/PriorityNotificationPanel', () => ({
  default: () => <div data-testid="priority-panel">Priority Panel</div>,
}));

vi.mock('../../components/PriorityDashboard', () => ({
  default: () => <div>Priority Dashboard</div>,
}));

vi.mock('../../components/ItemPanel', () => ({
  default: () => <div data-testid="item-panel">Item Panel</div>,
}));

vi.mock('../../components/OrderForm', () => ({
  default: () => <div>Order Form</div>,
}));

vi.mock('../../components/OrderHistory', () => ({
  default: () => <div>Order History</div>,
}));

vi.mock('../../components/SalesReport', () => ({
  default: () => <div>Sales Report</div>,
}));

vi.mock('../../components/FeedbackPanel', () => ({
  default: () => <div>Feedback Panel</div>,
}));

vi.mock('../../components/Login', () => ({
  default: () => <div>Login</div>,
}));

// Import after mocks
import App from '../../App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header with application title', async () => {
    render(<App />);
>>>>>>> master
    
    // Wait for loading to complete and check for title
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should have version tooltip on header title', async () => {
    const user = userEvent.setup();
    render(<App />);
>>>>>>> master
    
    // Find the title heading
    const title = await screen.findByRole('heading', { level: 1 });
    
    // Hover over the title to trigger tooltip
    await user.hover(title);
    
    // Check that tooltip with version text appears
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(`Version ${APP_VERSION}`);
  });

  it('should not show app-level loading screen when authenticated', async () => {
    render(<App />);
    
    // Should not show "Loading your data..." message
    expect(screen.queryByText('Loading your data...')).not.toBeInTheDocument();
    
    // Should show the header and tabs immediately (not blocked by loading)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should render content immediately without blocking loading screen', async () => {
    render(<App />);
    
    // Header should be visible immediately
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    
    // Navigation tabs should be visible
    expect(screen.getByRole('tablist', { name: 'Main navigation' })).toBeInTheDocument();
    
    // Should not show blocking loading screen
    expect(screen.queryByText('Loading your data...')).not.toBeInTheDocument();
  });
});

