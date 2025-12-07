import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../components/Login';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext');
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <button 
      onClick={() => onSuccess({ credential: 'test-token' })}
      data-testid="google-login"
    >
      Sign in with Google
    </button>
  ),
}));

describe('Login', () => {
  const mockHandleGoogleSuccess = vi.fn();
  const mockHandleGoogleError = vi.fn();
  const mockEnableGuestMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      handleGoogleSuccess: mockHandleGoogleSuccess,
      handleGoogleError: mockHandleGoogleError,
      enableGuestMode: mockEnableGuestMode,
      loading: false,
      error: null,
    });
  });

  it('should render login page with title', () => {
    render(<Login />);
    expect(screen.getByText('Order Management System')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
  });

  it('should render Google login button', () => {
    render(<Login />);
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });

  it('should render guest mode button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /Continue as Guest/i })).toBeInTheDocument();
  });

  it('should call enableGuestMode when guest button is clicked', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const guestButton = screen.getByRole('button', { name: /Continue as Guest/i });
    await user.click(guestButton);
    
    expect(mockEnableGuestMode).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    useAuth.mockReturnValue({
      handleGoogleSuccess: mockHandleGoogleSuccess,
      handleGoogleError: mockHandleGoogleError,
      enableGuestMode: mockEnableGuestMode,
      loading: true,
      error: null,
    });

    render(<Login />);
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    useAuth.mockReturnValue({
      handleGoogleSuccess: mockHandleGoogleSuccess,
      handleGoogleError: mockHandleGoogleError,
      enableGuestMode: mockEnableGuestMode,
      loading: false,
      error: 'Login failed',
    });

    render(<Login />);
    expect(screen.getByRole('alert')).toHaveTextContent('Login failed');
  });

  it('should have terms and privacy text', () => {
    render(<Login />);
    expect(screen.getByText(/terms of service and privacy policy/i)).toBeInTheDocument();
  });
});
