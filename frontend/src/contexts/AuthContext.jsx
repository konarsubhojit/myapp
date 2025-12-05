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
  const isMicrosoftAuthenticated = useIsAuthenticated();
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  // Get the active Microsoft account
  const activeAccount = accounts[0] || null;

  // Derive user from activeAccount or googleUser
  const user = useMemo(() => {
    if (googleUser) {
      return googleUser;
    }
    if (activeAccount) {
      return {
        id: activeAccount.localAccountId,
        email: activeAccount.username,
        name: activeAccount.name || activeAccount.username,
        provider: 'microsoft',
      };
    }
    return null;
  }, [activeAccount, googleUser]);

  // Check if authenticated (Microsoft or Google)
  const isAuthenticated = isMicrosoftAuthenticated || !!googleUser;

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
      console.warn('[Auth] Silent token acquisition failed:', {
        errorCode: silentError.errorCode,
        errorMessage: silentError.errorMessage || silentError.message,
        timestamp: new Date().toISOString(),
      });
      try {
        const response = await instance.acquireTokenPopup({
          ...loginRequest,
          account: activeAccount,
        });
        setAccessToken(response.accessToken);
        setError(null);
        return response.accessToken;
      } catch (popupError) {
        console.error('[Auth] Token acquisition via popup failed:', {
          errorCode: popupError.errorCode,
          errorMessage: popupError.errorMessage || popupError.message,
          correlationId: popupError.correlationId,
          timestamp: new Date().toISOString(),
        });
        setError('Failed to acquire access token');
        return null;
      }
    }
  }, [instance, activeAccount]);

  // Initial token acquisition - using a flag to track initial load
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
      
      if (inProgress === InteractionStatus.None) {
        if (isMicrosoftAuthenticated && activeAccount) {
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
  }, [isMicrosoftAuthenticated, activeAccount, inProgress, acquireToken]);

  // Login with Microsoft
  const loginWithMicrosoft = useCallback(async () => {
    setError(null);
    console.log('[Auth] Starting Microsoft login...');
    if (import.meta.env.DEV) {
      console.log('[Auth] Redirect URI:', import.meta.env.VITE_REDIRECT_URI || window.location.origin);
      console.log('[Auth] Client ID:', import.meta.env.VITE_AZURE_CLIENT_ID ? '[configured]' : '[not configured]');
      console.log('[Auth] Tenant ID:', import.meta.env.VITE_AZURE_TENANT_ID || 'common');
    }
    
    try {
      await instance.loginPopup(loginRequest);
      console.log('[Auth] Microsoft login successful');
    } catch (loginErr) {
      if (loginErr.errorCode !== 'user_cancelled') {
        const errorMessage = loginErr.errorMessage || loginErr.message || 'Unknown error';
        const errorCode = loginErr.errorCode || 'unknown';
        console.error('[Auth] Microsoft login failed:', {
          errorCode,
          errorMessage,
          correlationId: loginErr.correlationId,
          timestamp: new Date().toISOString(),
        });
        if (import.meta.env.DEV) {
          console.error('[Auth] Debug info:', {
            redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
          });
        }
        setError(`Login failed (${errorCode}): ${errorMessage}`);
      } else {
        console.log('[Auth] Login cancelled by user');
      }
    }
  }, [instance]);

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
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      const userData = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        provider: 'google',
      };
      setGoogleUser(userData);
      setError(null);
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('googleUser', JSON.stringify(userData));
      sessionStorage.setItem('googleToken', token);
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
  const logout = useCallback(async () => {
    // Clear Google session if present
    if (googleUser) {
      setGoogleUser(null);
      sessionStorage.removeItem('googleUser');
      sessionStorage.removeItem('googleToken');
      setAccessToken(null);
      console.log('[Auth] Google logout successful');
      return;
    }
    
    // Microsoft logout
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
        account: activeAccount,
      });
      setAccessToken(null);
      console.log('[Auth] Microsoft logout successful');
    } catch (logoutErr) {
      console.error('[Auth] Logout error:', logoutErr);
    }
  }, [instance, activeAccount, googleUser]);

  // Get current access token (refreshes if needed)
  const getAccessToken = useCallback(async () => {
    if (accessToken) {
      // Check if token is still valid (basic check)
      try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
          // Malformed JWT, acquire new one (only for Microsoft)
          if (!googleUser) {
            return acquireToken();
          }
          return null;
        }
        const payload = JSON.parse(atob(parts[1]));
        if (typeof payload.exp !== 'number') {
          // Invalid exp claim, acquire new one (only for Microsoft)
          if (!googleUser) {
            return acquireToken();
          }
          return null;
        }
        const expiry = payload.exp * 1000;
        if (Date.now() < expiry - 60000) {
          // Token valid for at least 1 more minute
          return accessToken;
        }
        // Token expired
        if (googleUser) {
          // For Google, we need to re-login (can't refresh silently)
          console.warn('[Auth] Google token expired, user needs to re-login');
          setGoogleUser(null);
          sessionStorage.removeItem('googleUser');
          sessionStorage.removeItem('googleToken');
          setAccessToken(null);
          return null;
        }
      } catch {
        // Token parsing failed, try to acquire new one
      }
    }
    // Only try to acquire token for Microsoft users
    if (!googleUser) {
      return acquireToken();
    }
    return null;
  }, [accessToken, acquireToken, googleUser]);

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
    handleGoogleSuccess,
    handleGoogleError,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
