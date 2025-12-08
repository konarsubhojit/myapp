import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import LogoutIcon from '@mui/icons-material/Logout'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import InventoryIcon from '@mui/icons-material/Inventory'
import HistoryIcon from '@mui/icons-material/History'
import AssessmentIcon from '@mui/icons-material/Assessment'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PreviewIcon from '@mui/icons-material/Preview'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import './App.css'
import ItemPanel from './components/ItemPanel'
import OrderForm from './components/OrderForm'
import OrderHistory from './components/OrderHistory'
import SalesReport from './components/SalesReport'
import PriorityDashboard from './components/PriorityDashboard'
import PriorityNotificationPanel from './components/PriorityNotificationPanel'
import Login from './components/Login'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getItems, getOrders } from './services/api'
import { APP_VERSION } from './config/version'

const TAB_ROUTES = [
  { path: '/priority', label: 'Priority', icon: <NotificationsActiveIcon /> },
  { path: '/orders/new', label: 'Create Order', icon: <AddShoppingCartIcon /> },
  { path: '/items', label: 'Manage Items', icon: <InventoryIcon /> },
  { path: '/history', label: 'Order History', icon: <HistoryIcon /> },
  { path: '/sales', label: 'Sales Report', icon: <AssessmentIcon /> },
]

// Loading screen component to reduce cognitive complexity
function LoadingScreen({ message }) {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
      gap={2}
      component="output"
      aria-live="polite"
      aria-label={message}
    >
      <CircularProgress size={48} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}

function AppContent() {
  const { isAuthenticated, loading: authLoading, user, logout, guestMode } = useAuth()
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderHistoryKey, setOrderHistoryKey] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const fetchItems = useCallback(async () => {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }, [])

  const handleOrderCreated = useCallback(() => {
    fetchOrders()
    // Increment key to trigger OrderHistory refresh when switching tabs
    setOrderHistoryKey(prev => prev + 1)
  }, [fetchOrders])

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isAuthenticated) {
        if (isMounted) setLoading(false)
        return
      }
      
      if (isMounted) setLoading(true)
      await Promise.all([fetchItems(), fetchOrders()])
      if (isMounted) setLoading(false)
    }
    
    loadData()
    
    return () => {
      isMounted = false
    }
  }, [isAuthenticated, fetchItems, fetchOrders])

  // Get current tab value based on path
  const getCurrentTabValue = () => {
    const path = location.pathname
    if (path.startsWith('/priority')) return 0
    if (path.startsWith('/orders/new') || path.startsWith('/orders/duplicate')) return 1
    if (path.startsWith('/items')) return 2
    if (path.startsWith('/history')) return 3
    if (path.startsWith('/sales')) return 4
    return 0
  }

  const handleTabChange = (event, newValue) => {
    navigate(TAB_ROUTES[newValue].path)
  }

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return <LoadingScreen message="Loading your data..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: '#000000',
          borderBottom: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Tooltip title={`Version ${APP_VERSION}`} arrow>
            <Typography 
              variant="h6" 
              component="h1" 
              sx={{ 
                fontWeight: 600,
                letterSpacing: '0.01em',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                flexShrink: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#ffffff',
                cursor: 'default',
              }}
            >
              {isMobile ? 'OMS' : 'Order Management System'}
            </Typography>
          </Tooltip>
          <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
            {!guestMode && <PriorityNotificationPanel />}
            {guestMode && (
              <Chip 
                icon={<PreviewIcon />} 
                label={isMobile ? "Guest" : "Guest Mode"} 
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 500,
                  '& .MuiChip-icon': {
                    color: 'white'
                  }
                }}
              />
            )}
            {user?.picture ? (
              <Avatar 
                src={user.picture} 
                alt={user?.name || 'User'}
                sx={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)' }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#ffffff', color: '#000000', fontSize: '0.875rem', fontWeight: 600 }}>
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </Avatar>
            )}
            {!isMobile && !guestMode && (
              <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                {user?.name || user?.email}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={logout}
              startIcon={isMobile ? undefined : <LogoutIcon />}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.3)',
                minWidth: isMobile ? 40 : 'auto',
                px: isMobile ? 1 : 2,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.08)',
                }
              }}
              aria-label="Sign out"
            >
              {(() => {
                if (isMobile) return <LogoutIcon fontSize="small" />;
                return guestMode ? 'Exit' : 'Sign Out';
              })()}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs */}
      <Paper 
        elevation={0}
        sx={{ 
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: 1000,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#ffffff',
        }}
      >
        <Container maxWidth="lg">
          <Tabs
            value={getCurrentTabValue()}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            aria-label="Main navigation"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                color: '#666666',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.9375rem',
                '&.Mui-selected': {
                  color: '#000000',
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                height: 2,
                bgcolor: '#000000',
              }
            }}
          >
            {TAB_ROUTES.map((tab) => (
              <Tab
                key={tab.path}
                icon={tab.icon}
                label={isMobile ? undefined : tab.label}
                aria-label={tab.label}
                iconPosition="start"
                sx={{ 
                  gap: 1,
                  flexDirection: 'row',
                }}
              />
            ))}
          </Tabs>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container 
        component="main" 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Routes>
          <Route 
            path="/" 
            element={<Navigate to="/priority" replace />} 
          />
          <Route 
            path="/priority" 
            element={
              <PriorityDashboard 
                onRefresh={() => {
                  fetchOrders();
                  setOrderHistoryKey(prev => prev + 1);
                }}
              />
            } 
          />
          <Route 
            path="/orders/new" 
            element={
              <OrderForm 
                items={items} 
                onOrderCreated={handleOrderCreated} 
              />
            } 
          />
          <Route 
            path="/orders/duplicate/:orderId" 
            element={
              <OrderForm 
                items={items} 
                onOrderCreated={handleOrderCreated} 
              />
            } 
          />
          <Route 
            path="/items" 
            element={
              <ItemPanel 
                onItemsChange={fetchItems} 
              />
            } 
          />
          <Route 
            path="/history" 
            element={
              <OrderHistory 
                key={orderHistoryKey}
                onDuplicateOrder={(orderId) => navigate(`/orders/duplicate/${orderId}`)}
              />
            } 
          />
          <Route 
            path="/sales" 
            element={<SalesReport orders={orders} />} 
          />
          {/* Catch-all route */}
          <Route 
            path="*" 
            element={<Navigate to="/priority" replace />} 
          />
        </Routes>
      </Container>
    </Box>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
