import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { setAccessTokenGetter, setOnUnauthorizedCallback } from '../services/api';

const AuthContext = createContext(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  // Derive user from googleUser
  const user = useMemo(() => {
    return googleUser;
  }, [googleUser]);

  // Check if authenticated
  const isAuthenticated = !!googleUser;

  // Initial auth check - restore session from storage
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      // Check for stored Google session
      const storedGoogleUser = sessionStorage.getItem('googleUser');
      const storedGoogleToken = sessionStorage.getItem('googleToken');
      if (storedGoogleUser && storedGoogleToken) {
        try {
          const parsedUser = JSON.parse(storedGoogleUser);
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

  // Handle Google login success
  const handleGoogleSuccess = useCallback((credentialResponse) => {
    console.log('[Auth] Google login successful');
    const token = credentialResponse.credential;
    setAccessToken(token);
    
    // Decode the JWT to extract user info for display purposes
    // Note: The token signature is already validated by Google's SDK before this callback
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      // Decode base64url to base64, then decode to JSON
      const base64Url = parts[1];
      const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
      const payload = JSON.parse(atob(base64));
      const userData = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture || null,
        provider: 'google',
      };
      setGoogleUser(userData);
      setError(null);
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('googleUser', JSON.stringify(userData));
      sessionStorage.setItem('googleToken', token);
      
      // Check for redirect after login (deeplink support)
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        // Use setTimeout to ensure state is updated before navigation
        setTimeout(() => {
          globalThis.location.href = redirectPath;
        }, 100);
      }
    } catch (parseError) {
      console.error('[Auth] Failed to parse Google token:', parseError);
      setError('Failed to process Google login');
    }
  }, []);

  // Handle Google login failure
  const handleGoogleError = useCallback(() => {
    console.error('[Auth] Google login failed');
    if (import.meta.env.DEV) {
      console.error('[Auth] Debug info:', {
        timestamp: new Date().toISOString(),
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? '[configured]' : '[not configured]',
      });
    }
    setError('Google login failed. Please try again.');
  }, []);

  // Logout
  const logout = useCallback(() => {
    setGoogleUser(null);
    sessionStorage.removeItem('googleUser');
    sessionStorage.removeItem('googleToken');
    setAccessToken(null);
    console.log('[Auth] Logout successful');
  }, []);

  // Get current access token
  const getAccessToken = useCallback(async () => {
    if (accessToken) {
      // Check if token is still valid (basic check)
      try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
          return null;
        }
        const payload = JSON.parse(atob(parts[1]));
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
  const handleUnauthorized = useCallback(() => {
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

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    accessToken,
    handleGoogleSuccess,
    handleGoogleError,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
