/**
 * MSAL configuration for Microsoft authentication
 */

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes for requesting access token
const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

// Scopes for requesting access token for API
const tokenRequest = {
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`].filter(
    (scope) => !scope.startsWith('api://') || import.meta.env.VITE_AZURE_CLIENT_ID
  ),
};

export { msalConfig, loginRequest, tokenRequest };
