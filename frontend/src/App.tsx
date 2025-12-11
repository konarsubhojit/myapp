import { useState, useEffect, useCallback, type ReactNode, type ReactElement } from 'react'
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
import FeedbackIcon from '@mui/icons-material/Feedback'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import './App.css'
import ItemPanel from './components/ItemPanel'
import OrderForm from './components/OrderForm'
import OrderHistory from './components/OrderHistory'
import SalesReport from './components/SalesReport'
import PriorityDashboard from './components/PriorityDashboard'
import PriorityNotificationPanel from './components/PriorityNotificationPanel'
import FeedbackPanel from './components/FeedbackPanel'
import Login from './components/Login'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getItems, getOrders } from './services/api'
import { APP_VERSION } from './config/version'
import type { Item, Order } from './types'

interface TabRoute {
  id: string;
  label: string;
  icon: ReactElement;
}

const TAB_ROUTES: TabRoute[] = [
  { id: 'priority', label: 'Priority', icon: <NotificationsActiveIcon /> },
  { id: 'new-order', label: 'Create Order', icon: <AddShoppingCartIcon /> },
  { id: 'items', label: 'Manage Items', icon: <InventoryIcon /> },
  { id: 'history', label: 'Order History', icon: <HistoryIcon /> },
  { id: 'sales', label: 'Sales Report', icon: <AssessmentIcon /> },
  { id: 'feedback', label: 'Feedback', icon: <FeedbackIcon /> },
]

interface LoadingScreenProps {
  message: string;
}

// Loading screen component to reduce cognitive complexity
function LoadingScreen({ message }: LoadingScreenProps): ReactElement {
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

function AppContent(): ReactElement {
  const { isAuthenticated, loading: authLoading, user, logout, guestMode } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [orderHistoryKey, setOrderHistoryKey] = useState<number>(0)
  const [currentTab, setCurrentTab] = useState<number>(0)
  const [duplicateOrderId, setDuplicateOrderId] = useState<string | null>(null)
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }, [])

  const fetchOrders = useCallback(async (): Promise<void> => {
    try {
      const data = await getOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }, [])

  const handleOrderCreated = useCallback((): void => {
    fetchOrders()
    // Increment key to trigger OrderHistory refresh when switching tabs
    setOrderHistoryKey(prev => prev + 1)
    // Clear duplicate order state
    setDuplicateOrderId(null)
  }, [fetchOrders])

  const handleDuplicateOrder = useCallback((orderId: string): void => {
    setDuplicateOrderId(orderId)
    setCurrentTab(1) // Switch to Create Order tab
  }, [])

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async (): Promise<void> => {
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTab(newValue)
    // Clear duplicate order when switching away from Create Order tab
    if (newValue !== 1) {
      setDuplicateOrderId(null)
    }
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
            {!guestMode && <PriorityNotificationPanel onNavigateToPriority={() => setCurrentTab(0)} />}
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
            {user && 'picture' in user && user.picture ? (
              <Avatar 
                src={user.picture} 
                alt={user?.name || 'User'}
                sx={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)' }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#ffffff', color: '#000000', fontSize: '0.875rem', fontWeight: 600 }}>
                {(user?.name || user?.email || 'U')[0]?.toUpperCase() ?? 'U'}
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
              {isMobile ? <LogoutIcon fontSize="small" /> : (guestMode ? 'Exit' : 'Sign Out')}
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
            value={currentTab}
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
                key={tab.id}
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
        {currentTab === 0 && (
          <PriorityDashboard 
            onRefresh={() => {
              fetchOrders();
              setOrderHistoryKey(prev => prev + 1);
            }}
            onDuplicateOrder={handleDuplicateOrder}
          />
        )}
        
        {currentTab === 1 && (
          <OrderForm 
            items={items} 
            onOrderCreated={handleOrderCreated}
            duplicateOrderId={duplicateOrderId}
          />
        )}
        
        {currentTab === 2 && (
          <ItemPanel 
            onItemsChange={fetchItems} 
          />
        )}
        
        {currentTab === 3 && (
          <OrderHistory 
            key={orderHistoryKey}
            onDuplicateOrder={handleDuplicateOrder}
          />
        )}
        
        {currentTab === 4 && (
          <SalesReport orders={orders} />
        )}
        
        {currentTab === 5 && (
          <FeedbackPanel />
        )}
      </Container>
    </Box>
  )
}

function App(): ReactElement {
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
