import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { inject } from '@vercel/analytics'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { googleConfig } from './config/authConfig'
import theme from './config/theme'
import { NotificationProvider } from './contexts/NotificationContext'
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
    <GoogleOAuthProvider clientId={googleConfig.clientId}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <App />
          <SpeedInsights />
        </NotificationProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
