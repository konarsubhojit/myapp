import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { inject } from '@vercel/analytics'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { googleConfig } from './features/auth/authConfig'
import theme from './config/theme'
import { queryClient } from './queryClient'
import { NotificationProvider } from './lib/NotificationContext'
import ErrorBoundary from './ErrorBoundary'
import './index.css'
import App from './App'

// Initialize Vercel Web Analytics
inject()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={googleConfig.clientId}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <NotificationProvider>
              <App />
              <SpeedInsights />
            </NotificationProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
