import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
  default: () => <div>Item Panel</div>,
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
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    
    // Wait for loading to complete and check for title
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should have version tooltip on header title', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    
    // Find the title heading
    const title = await screen.findByRole('heading', { level: 1 });
    
    // Hover over the title to trigger tooltip
    await user.hover(title);
    
    // Check that tooltip with version text appears
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(`Version ${APP_VERSION}`);
  });
});
