import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode, type ReactElement } from 'react';
import { setAccessTokenGetter, setOnUnauthorizedCallback, setGuestModeChecker } from '../../services/api';
import { clearQueryCache } from '../../queryClient';
import type { AuthUser, GuestUser } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Guest user constant
const GUEST_USER: GuestUser = { name: 'Guest User', email: 'guest@localhost', isGuest: true };

interface GoogleCredentialResponse {
  credential: string;
}

interface AuthContextType {
  user: AuthUser | GuestUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  accessToken: string | null;
  handleGoogleSuccess: (credentialResponse: GoogleCredentialResponse) => Promise<void>;
  handleGoogleError: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  guestMode: boolean;
  enableGuestMode: () => void;
  isForbidden: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

interface GoogleUserData extends AuthUser {
  picture?: string;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUserData | null>(null);
  const [guestMode, setGuestMode] = useState<boolean>(false);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Derive user from googleUser or guest mode
  const user = useMemo((): AuthUser | GuestUser | null => {
    if (guestMode) {
      return GUEST_USER;
    }
    return googleUser;
  }, [googleUser, guestMode]);

  // Check if authenticated (guest mode counts as authenticated for UI purposes)
  const isAuthenticated = !!googleUser || guestMode;

  // Initial auth check - restore session from storage
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async (): Promise<void> => {
      // Check for guest mode from sessionStorage
      const storedGuestMode = sessionStorage.getItem('guestMode');
      if (storedGuestMode === 'true') {
        setGuestMode(true);
        console.log('[Auth] Guest mode enabled');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // Check for stored Google session
      const storedGoogleUser = sessionStorage.getItem('googleUser');
      const storedGoogleToken = sessionStorage.getItem('googleToken');
      if (storedGoogleUser && storedGoogleToken) {
        try {
          const parsedUser = JSON.parse(storedGoogleUser) as GoogleUserData;
          setGoogleUser(parsedUser);
          setAccessToken(storedGoogleToken);
          console.log('[Auth] Restored Google session');
        } catch {
          // Invalid stored data, clear it
          sessionStorage.removeItem('googleUser');
          sessionStorage.removeItem('googleToken');
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Google login success - exchange token with backend
  const handleGoogleSuccess = useCallback(async (credentialResponse: GoogleCredentialResponse): Promise<void> => {
    console.log('[Auth] Google login successful, exchanging token with backend');
    setLoading(true);
    setError(null);
    setIsForbidden(false);
    
    try {
      const token = credentialResponse.credential;
      
      // Exchange token with backend
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: token }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle 403 Forbidden (non-admin user)
        if (response.status === 403 || data.code === 'NOT_ADMIN') {
          console.error('[Auth] Access denied - user is not an admin');
          setIsForbidden(true);
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        
        throw new Error(data.message || 'Authentication failed');
      }
      
      // Set token and user data
      setAccessToken(data.token);
      const userData: GoogleUserData = {
        id: data.user.googleId,
        email: data.user.email,
        name: data.user.name,
        picture: data.user.picture,
        provider: 'google',
        role: data.user.role,
      };
      setGoogleUser(userData);
      
      // Store in sessionStorage
      sessionStorage.setItem('googleUser', JSON.stringify(userData));
      sessionStorage.setItem('googleToken', data.token);
      
      console.log('[Auth] Authentication successful');
    } catch (error) {
      console.error('[Auth] Backend authentication failed:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Google login failure
  const handleGoogleError = useCallback((): void => {
    console.error('[Auth] Google login failed');
    if (import.meta.env.DEV) {
      console.error('[Auth] Debug info:', {
        timestamp: new Date().toISOString(),
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? '[configured]' : '[not configured]',
      });
    }
    setError('Google login failed. Please try again.');
  }, []);

  // Enable guest mode
  const enableGuestMode = useCallback((): void => {
    // Clear any existing cached data to avoid mixing authenticated and guest data
    clearQueryCache();
    setGuestMode(true);
    sessionStorage.setItem('guestMode', 'true');
    console.log('[Auth] Guest mode enabled');
  }, []);

  // Logout
  const logout = useCallback((): void => {
    // Clear query cache to avoid showing stale data on next login
    clearQueryCache();
    setGoogleUser(null);
    setGuestMode(false);
    setIsForbidden(false);
    sessionStorage.removeItem('googleUser');
    sessionStorage.removeItem('googleToken');
    sessionStorage.removeItem('guestMode');
    setAccessToken(null);
    console.log('[Auth] Logout successful');
  }, []);

  // Get current access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (accessToken) {
      // Check if token is still valid (basic check)
      try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
          return null;
        }
        const payloadPart = parts[1];
        if (!payloadPart) {
          return null;
        }
        const payload = JSON.parse(atob(payloadPart)) as { exp?: number };
        if (typeof payload.exp !== 'number') {
          return null;
        }
        const expiry = payload.exp * 1000;
        if (Date.now() < expiry - 60000) {
          // Token valid for at least 1 more minute
          return accessToken;
        }
        // Token expired - user needs to re-login
        console.warn('[Auth] Google token expired, user needs to re-login');
        setGoogleUser(null);
        sessionStorage.removeItem('googleUser');
        sessionStorage.removeItem('googleToken');
        setAccessToken(null);
        return null;
      } catch {
        // Token parsing failed
        return null;
      }
    }
    return null;
  }, [accessToken]);

  // Handle unauthorized responses by clearing token
  const handleUnauthorized = useCallback((): void => {
    console.warn('Handling unauthorized response - clearing token');
    setAccessToken(null);
    setGoogleUser(null);
    sessionStorage.removeItem('googleUser');
    sessionStorage.removeItem('googleToken');
  }, []);

  // Set the token getter and unauthorized handler for API service
  // This must be called synchronously to avoid race conditions with API calls
  setAccessTokenGetter(getAccessToken);
  setOnUnauthorizedCallback(handleUnauthorized);
  setGuestModeChecker(() => guestMode);

  const value = useMemo((): AuthContextType => ({
    user,
    isAuthenticated,
    loading,
    error,
    accessToken,
    handleGoogleSuccess,
    handleGoogleError,
    logout,
    getAccessToken,
    guestMode,
    enableGuestMode,
    isForbidden,
  }), [user, isAuthenticated, loading, error, accessToken, handleGoogleSuccess, handleGoogleError, logout, getAccessToken, guestMode, enableGuestMode, isForbidden]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
