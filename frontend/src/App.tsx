import { useState, useEffect, useCallback, type ReactElement } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import LogoutIcon from '@mui/icons-material/Logout'
import PreviewIcon from '@mui/icons-material/Preview'
import MenuIcon from '@mui/icons-material/Menu'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import './App.css'
import NavigationDrawer, { DRAWER_WIDTH } from './components/NavigationDrawer'
import CreateItem from './components/CreateItem'
import BrowseItems from './components/BrowseItems'
import ManageDeletedItems from './components/ManageDeletedItems'
import OrderForm from './components/OrderForm'
import OrderHistory from './components/OrderHistory'
import SalesReport from './components/SalesReport'
import PriorityNotificationPanel from './components/PriorityNotificationPanel'
import FeedbackPanel from './components/FeedbackPanel'
import Login from './components/Login'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getItems } from './services/api'
import { APP_VERSION } from './config/version'
import { NAVIGATION_ROUTES } from './constants/navigation.tsx'
import type { Item, OrderId } from './types'

interface LoadingScreenProps {
  readonly message: string;
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
  const [orderHistoryKey, setOrderHistoryKey] = useState<number>(0)
  const [currentRoute, setCurrentRoute] = useState<string>(NAVIGATION_ROUTES.CREATE_ORDER)
  const [duplicateOrderId, setDuplicateOrderId] = useState<string | null>(null)
  const [selectedOrderIdFromPriority, setSelectedOrderIdFromPriority] = useState<OrderId | null>(null)
  const [copiedItem, setCopiedItem] = useState<Item | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false)
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState<boolean>(true)
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const isMdDown = useMediaQuery(muiTheme.breakpoints.down('md'))

  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }, [])

  const handleOrderCreated = useCallback((): void => {
    // Increment key to trigger OrderHistory refresh when switching tabs
    setOrderHistoryKey(prev => prev + 1)
    // Clear duplicate order state
    setDuplicateOrderId(null)
  }, [])

  const handleDuplicateOrder = useCallback((orderId: string): void => {
    setDuplicateOrderId(orderId)
    setCurrentRoute(NAVIGATION_ROUTES.CREATE_ORDER)
  }, [])

  const handleViewOrderFromPriority = useCallback((orderId: OrderId): void => {
    setSelectedOrderIdFromPriority(orderId)
    setCurrentRoute(NAVIGATION_ROUTES.ORDER_HISTORY)
  }, [])

  const handleOrderDetailsClose = useCallback((): void => {
    setSelectedOrderIdFromPriority(null)
  }, [])

  const handleCopyItem = useCallback((item: Item): void => {
    setCopiedItem(item)
    setCurrentRoute(NAVIGATION_ROUTES.CREATE_ITEM)
  }, [])

  const handleCancelCopy = useCallback((): void => {
    setCopiedItem(null)
  }, [])

  const handleNavigate = useCallback((routeId: string): void => {
    setCurrentRoute(routeId)
    // Clear states when navigating away from certain routes
    if (routeId !== NAVIGATION_ROUTES.CREATE_ORDER) {
      setDuplicateOrderId(null)
    }
    if (routeId !== NAVIGATION_ROUTES.CREATE_ITEM) {
      setCopiedItem(null)
    }
  }, [])

  const handleMobileDrawerToggle = useCallback((): void => {
    setMobileDrawerOpen((prev) => !prev)
  }, [])

  const handleDesktopDrawerToggle = useCallback((): void => {
    setDesktopDrawerOpen((prev) => !prev)
  }, [])

  // Fetch initial data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadInitialData = async (): Promise<void> => {
      // Only fetch items on mount - other data loaded on demand
      await fetchItems()
    }
    
    loadInitialData()
  }, [isAuthenticated, fetchItems])

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Drawer */}
      <NavigationDrawer 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate}
        mobileOpen={mobileDrawerOpen}
        desktopOpen={desktopDrawerOpen}
        onMobileToggle={handleMobileDrawerToggle}
      />

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: { 
            xs: '100%', 
            md: desktopDrawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' 
          },
          minHeight: '100vh',
          transition: (theme) => theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: desktopDrawerOpen 
              ? theme.transitions.duration.enteringScreen 
              : theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Header */}
        <AppBar 
          position="sticky" 
          elevation={1}
          sx={{ 
            bgcolor: '#ffffff',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 1, minHeight: { xs: 56, sm: 64 } }}>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                color="inherit"
                aria-label="toggle navigation drawer"
                aria-expanded={isMdDown ? mobileDrawerOpen : desktopDrawerOpen}
                edge="start"
                onClick={isMdDown ? handleMobileDrawerToggle : handleDesktopDrawerToggle}
                sx={{ 
                  color: '#5568d3',
                  '&:hover': {
                    bgcolor: '#f0f4ff',
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
              <Tooltip title={`Version ${APP_VERSION}`} arrow>
                <Typography 
                  variant="h6" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    fontSize: { xs: '1.1rem', sm: '1.5rem' },
                    flexShrink: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#5568d3',
                    background: 'linear-gradient(135deg, #5568d3 0%, #667eea 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    cursor: 'default',
                    '@supports not (-webkit-background-clip: text)': {
                      color: '#5568d3',
                    },
                  }}
                >
                  {isMobile ? 'OMS' : 'Order Management System'}
                </Typography>
              </Tooltip>
            </Box>
            <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
              {!guestMode && <PriorityNotificationPanel onNavigateToPriority={() => setCurrentRoute(NAVIGATION_ROUTES.ORDER_HISTORY)} onViewOrder={handleViewOrderFromPriority} />}
              {guestMode && (
                <Chip 
                  icon={<PreviewIcon />} 
                  label={isMobile ? "Guest" : "Guest Mode"} 
                  size="small"
                  sx={{ 
                    bgcolor: '#f0f4ff', 
                    color: '#5568d3',
                    border: '1px solid #cbd5e1',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: '#5568d3'
                    }
                  }}
                />
              )}
              {user && 'picture' in user && user.picture ? (
                <Avatar 
                  src={user.picture} 
                  alt={user?.name || 'User'}
                  sx={{ width: 32, height: 32, border: '2px solid #e2e8f0' }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#5568d3', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600 }}>
                  {(user?.name || user?.email || 'U')[0]?.toUpperCase() ?? 'U'}
                </Avatar>
              )}
              {!isMobile && !guestMode && (
                <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155', fontWeight: 500 }}>
                  {user?.name || user?.email}
                </Typography>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={logout}
                startIcon={isMobile ? undefined : <LogoutIcon />}
                sx={{ 
                  color: '#5568d3', 
                  borderColor: '#cbd5e1',
                  minWidth: isMobile ? 40 : 'auto',
                  px: isMobile ? 1 : 2,
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#5568d3',
                    bgcolor: '#f0f4ff',
                  }
                }}
                aria-label="Sign out"
              >
                {isMobile ? <LogoutIcon fontSize="small" /> : (guestMode ? 'Exit' : 'Sign Out')}
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box 
          sx={{ 
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 },
            maxWidth: '1200px',
            mx: 'auto',
          }}
        >
          {/* Orders Group */}
          {currentRoute === NAVIGATION_ROUTES.CREATE_ORDER && (
            <OrderForm 
              items={items} 
              onOrderCreated={handleOrderCreated}
              duplicateOrderId={duplicateOrderId}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.ORDER_HISTORY && (
            <OrderHistory 
              key={orderHistoryKey}
              onDuplicateOrder={handleDuplicateOrder}
              initialSelectedOrderId={selectedOrderIdFromPriority}
              onOrderDetailsClose={handleOrderDetailsClose}
            />
          )}
          
          {/* Items Group */}
          {currentRoute === NAVIGATION_ROUTES.BROWSE_ITEMS && (
            <BrowseItems 
              onItemsChange={fetchItems}
              onCopyItem={handleCopyItem}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.CREATE_ITEM && (
            <CreateItem 
              onItemCreated={fetchItems}
              copiedItem={copiedItem}
              onCancelCopy={handleCancelCopy}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.MANAGE_DELETED_ITEMS && (
            <ManageDeletedItems 
              onItemsChange={fetchItems}
            />
          )}
          
          {/* Analytics Group */}
          {currentRoute === NAVIGATION_ROUTES.SALES_REPORT && (
            <SalesReport />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.CUSTOMER_FEEDBACK && (
            <FeedbackPanel />
          )}
        </Box>
      </Box>
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
