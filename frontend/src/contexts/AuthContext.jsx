import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../config/authConfig';
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
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the active account
  const activeAccount = accounts[0] || null;

  // Derive user from activeAccount (no useState needed)
  const user = useMemo(() => {
    if (activeAccount) {
      return {
        id: activeAccount.localAccountId,
        email: activeAccount.username,
        name: activeAccount.name || activeAccount.username,
        provider: 'microsoft',
      };
    }
    return null;
  }, [activeAccount]);

  // Acquire token silently when authenticated
  const acquireToken = useCallback(async () => {
    if (!activeAccount) {
      setAccessToken(null);
      return null;
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount,
      });
      setAccessToken(response.accessToken);
      setError(null);
      return response.accessToken;
    } catch (silentError) {
      // If silent acquisition fails, try interactive
      console.debug('Silent token acquisition failed, attempting popup:', silentError);
      try {
        const response = await instance.acquireTokenPopup({
          ...loginRequest,
          account: activeAccount,
        });
        setAccessToken(response.accessToken);
        setError(null);
        return response.accessToken;
      } catch (popupError) {
        setError('Failed to acquire access token');
        console.error('Token acquisition error:', popupError);
        return null;
      }
    }
  }, [instance, activeAccount]);

  // Initial token acquisition - using a flag to track initial load
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (inProgress === InteractionStatus.None) {
        if (isAuthenticated && activeAccount) {
          await acquireToken();
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, activeAccount, inProgress, acquireToken]);

  // Login with Microsoft
  const loginWithMicrosoft = useCallback(async () => {
    setError(null);
    try {
      await instance.loginPopup(loginRequest);
    } catch (loginErr) {
      if (loginErr.errorCode !== 'user_cancelled') {
        setError('Login failed. Please try again.');
        console.error('Login error:', loginErr);
      }
    }
  }, [instance]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
        account: activeAccount,
      });
      setAccessToken(null);
    } catch (logoutErr) {
      console.error('Logout error:', logoutErr);
    }
  }, [instance, activeAccount]);

  // Get current access token (refreshes if needed)
  const getAccessToken = useCallback(async () => {
    if (accessToken) {
      // Check if token is still valid (basic check)
      try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
          // Malformed JWT, acquire new one
          return acquireToken();
        }
        const payload = JSON.parse(atob(parts[1]));
        if (typeof payload.exp !== 'number') {
          // Invalid exp claim, acquire new one
          return acquireToken();
        }
        const expiry = payload.exp * 1000;
        if (Date.now() < expiry - 60000) {
          // Token valid for at least 1 more minute
          return accessToken;
        }
      } catch {
        // Token parsing failed, try to acquire new one
      }
    }
    return acquireToken();
  }, [accessToken, acquireToken]);

  // Handle unauthorized responses by clearing token and triggering re-auth
  const handleUnauthorized = useCallback(() => {
    console.warn('Handling unauthorized response - clearing token');
    setAccessToken(null);
    // Attempt to acquire a new token
    acquireToken();
  }, [acquireToken]);

  // Set the token getter and unauthorized handler for API service
  useEffect(() => {
    setAccessTokenGetter(getAccessToken);
    setOnUnauthorizedCallback(handleUnauthorized);
  }, [getAccessToken, handleUnauthorized]);

  const value = {
    user,
    isAuthenticated,
    loading: loading || inProgress !== InteractionStatus.None,
    error,
    accessToken,
    loginWithMicrosoft,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
