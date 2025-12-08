/**
 * Application version configuration
 * Version is injected at build time via VITE_APP_VERSION environment variable
 * Falls back to '0.0.0-dev' for local development
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0-dev';
