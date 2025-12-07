import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { googleConfig } from './config/authConfig'
import theme from './config/theme'
import './index.css'
import App from './App.jsx'

// Initialize Vercel Web Analytics
inject()

// Initialize Vercel Speed Insights
injectSpeedInsights()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleConfig.clientId}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
