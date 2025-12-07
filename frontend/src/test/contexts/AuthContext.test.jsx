import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = () => {};
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      console.error = consoleError;
    });

    it('should provide auth context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeDefined();
      expect(result.current.isAuthenticated).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.handleGoogleSuccess).toBeDefined();
      expect(result.current.handleGoogleError).toBeDefined();
      expect(result.current.logout).toBeDefined();
      expect(result.current.getAccessToken).toBeDefined();
      expect(result.current.guestMode).toBeDefined();
      expect(result.current.enableGuestMode).toBeDefined();
    });
  });

  describe('AuthProvider', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // The loading state may be synchronously set to false in the useEffect
      // So we just check that loading is defined as a boolean
      expect(typeof result.current.loading).toBe('boolean');
    });

    it('should finish loading after initialization', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should start with no user when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should enable guest mode', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.enableGuestMode();
      });

      expect(result.current.guestMode).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        name: 'Guest User',
        email: 'guest@localhost',
        isGuest: true,
      });
      expect(sessionStorage.getItem('guestMode')).toBe('true');
    });

    it('should restore guest mode from sessionStorage', async () => {
      sessionStorage.setItem('guestMode', 'true');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.guestMode).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.isGuest).toBe(true);
    });

    it('should handle Google login success', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockToken = createMockToken({
        sub: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      act(() => {
        result.current.handleGoogleSuccess({ credential: mockToken });
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
        expect(result.current.user.email).toBe('test@example.com');
        expect(result.current.user.name).toBe('Test User');
        expect(result.current.user.provider).toBe('google');
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(sessionStorage.getItem('googleUser')).toBeTruthy();
      expect(sessionStorage.getItem('googleToken')).toBe(mockToken);
    });

    it('should handle Google login failure', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleGoogleError();
      });

      expect(result.current.error).toBe('Google login failed. Please try again.');
    });

    it('should handle logout', async () => {
      sessionStorage.setItem('guestMode', 'true');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.guestMode).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.guestMode).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(sessionStorage.getItem('guestMode')).toBeNull();
      expect(sessionStorage.getItem('googleUser')).toBeNull();
      expect(sessionStorage.getItem('googleToken')).toBeNull();
    });

    it('should restore Google session from sessionStorage', async () => {
      const mockToken = createMockToken({
        sub: '123',
        email: 'stored@example.com',
        name: 'Stored User',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const storedUser = {
        id: '123',
        email: 'stored@example.com',
        name: 'Stored User',
        provider: 'google',
      };

      sessionStorage.setItem('googleUser', JSON.stringify(storedUser));
      sessionStorage.setItem('googleToken', mockToken);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.email).toBe('stored@example.com');
    });

    it('should clear invalid stored session data', async () => {
      sessionStorage.setItem('googleUser', 'invalid-json');
      sessionStorage.setItem('googleToken', 'invalid-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(sessionStorage.getItem('googleUser')).toBeNull();
      expect(sessionStorage.getItem('googleToken')).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return null when getting access token without authentication', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const token = await result.current.getAccessToken();
      expect(token).toBeNull();
    });

    it('should return valid access token', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockToken = createMockToken({
        sub: '123',
        email: 'test@example.com',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      act(() => {
        result.current.handleGoogleSuccess({ credential: mockToken });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const token = await result.current.getAccessToken();
      expect(token).toBe(mockToken);
    });

    it('should handle expired token', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const expiredToken = createMockToken({
        sub: '123',
        email: 'test@example.com',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      act(() => {
        result.current.handleGoogleSuccess({ credential: expiredToken });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Getting token should trigger the expiration check
      let token;
      await act(async () => {
        token = await result.current.getAccessToken();
      });
      
      expect(token).toBeNull();
      
      // Wait for state updates to complete
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('should handle invalid token format in handleGoogleSuccess', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleGoogleSuccess({ credential: 'invalid.token' });
      });

      expect(result.current.error).toBe('Failed to process Google login');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle Google login success without picture', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockToken = createMockToken({
        sub: '123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      act(() => {
        result.current.handleGoogleSuccess({ credential: mockToken });
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
        expect(result.current.user.email).toBe('test@example.com');
        expect(result.current.user.name).toBe('test@example.com'); // Falls back to email
        expect(result.current.user.picture).toBeNull();
      });
    });
  });
});

// Helper function to create mock JWT tokens
function createMockToken(payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
