import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tab';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useMediaQuery, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import InventoryIcon from '@mui/icons-material/Inventory';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import PreviewIcon from '@mui/icons-material/Preview';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { VIEWS } from './constants/navigationConstants';
import { getItems, getOrders } from './services/api';
import Login from './components/Login';
import PriorityDashboard from './components/PriorityDashboard';
import OrderForm from './components/OrderForm';
import ItemPanel from './components/ItemPanel';
import OrderHistory from './components/OrderHistory';
import SalesReport from './components/SalesReport';
import OrderDetailsPage from './pages/OrderDetailsPage';
import OrderEditPage from './pages/OrderEditPage';
import PriorityNotificationPanel from './components/PriorityNotificationPanel';

const TAB_ROUTES = [
  { view: VIEWS.PRIORITY, label: 'Priority Dashboard', icon: <DashboardIcon /> },
  { view: VIEWS.NEW_ORDER, label: 'New Order', icon: <AddBoxIcon /> },
  { view: VIEWS.ITEMS, label: 'Manage Items', icon: <InventoryIcon /> },
  { view: VIEWS.HISTORY, label: 'Order History', icon: <HistoryIcon /> },
  { view: VIEWS.SALES, label: 'Sales Report', icon: <AssessmentIcon /> },
];

function LoadingScreen({ message }) {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress size={48} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function AppContent() {
  const { isAuthenticated, loading: authLoading, user, logout, guestMode } = useAuth();
  const { currentView, navigateTo, viewData } = useNavigation();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderHistoryKey, setOrderHistoryKey] = useState(0);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const fetchItems = useCallback(async () => {
    try {
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, []);

  const handleOrderCreated = useCallback(() => {
    fetchOrders();
    setOrderHistoryKey(prev => prev + 1);
  }, [fetchOrders]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isAuthenticated) {
        if (isMounted) setLoading(false);
        return;
      }
      
      if (isMounted) setLoading(true);
      await Promise.all([fetchItems(), fetchOrders()]);
      if (isMounted) setLoading(false);
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, fetchItems, fetchOrders]);

  const getCurrentTabValue = () => {
    const tabIndex = TAB_ROUTES.findIndex(route => route.view === currentView);
    return tabIndex >= 0 ? tabIndex : 0;
  };

  const handleTabChange = (event, newValue) => {
    navigateTo(TAB_ROUTES[newValue].view);
  };

  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (loading) {
    return <LoadingScreen message="Loading your data..." />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case VIEWS.PRIORITY:
        return (
          <PriorityDashboard 
            onRefresh={() => {
              fetchOrders();
              setOrderHistoryKey(prev => prev + 1);
            }}
          />
        );
      
      case VIEWS.NEW_ORDER:
        return (
          <OrderForm 
            items={items} 
            onOrderCreated={handleOrderCreated} 
          />
        );
      
      case VIEWS.DUPLICATE_ORDER:
        return (
          <OrderForm 
            items={items} 
            onOrderCreated={handleOrderCreated}
            duplicateOrderId={viewData?.orderId}
          />
        );
      
      case VIEWS.ITEMS:
        return (
          <ItemPanel 
            onItemsChange={fetchItems} 
          />
        );
      
      case VIEWS.HISTORY:
        return (
          <OrderHistory 
            key={orderHistoryKey}
            onOrderClick={(orderId) => navigateTo(VIEWS.ORDER_DETAILS, { orderId })}
            onDuplicateOrder={(orderId) => navigateTo(VIEWS.DUPLICATE_ORDER, { orderId })}
          />
        );
      
      case VIEWS.SALES:
        return <SalesReport orders={orders} />;
      
      case VIEWS.ORDER_DETAILS:
        return (
          <OrderDetailsPage 
            orderId={viewData?.orderId}
            onBack={() => navigateTo(VIEWS.HISTORY)}
            onEdit={(orderId) => navigateTo(VIEWS.EDIT_ORDER, { orderId })}
            onDuplicate={(orderId) => navigateTo(VIEWS.DUPLICATE_ORDER, { orderId })}
          />
        );
      
      case VIEWS.EDIT_ORDER:
        return (
          <OrderEditPage
            orderId={viewData?.orderId}
            onBack={() => navigateTo(VIEWS.ORDER_DETAILS, { orderId: viewData?.orderId })}
            onSaved={(orderId) => {
              fetchOrders();
              setOrderHistoryKey(prev => prev + 1);
              navigateTo(VIEWS.ORDER_DETAILS, { orderId });
            }}
          />
        );
      
      default:
        return <PriorityDashboard onRefresh={fetchOrders} />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
              cursor: 'pointer',
            }}
            onClick={() => navigateTo(VIEWS.PRIORITY)}
          >
            {isMobile ? 'OMS' : 'Order Management System'}
          </Typography>
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
            >
              {isMobile ? <LogoutIcon fontSize="small" /> : (guestMode ? 'Exit' : 'Sign Out')}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs - only show for main views */}
      {![VIEWS.ORDER_DETAILS, VIEWS.EDIT_ORDER].includes(currentView) && (
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
                  key={tab.view}
                  icon={tab.icon}
                  label={isMobile ? undefined : tab.label}
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
      )}

      {/* Main Content */}
      <Container 
        component="main" 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
        }}
      >
        {renderCurrentView()}
      </Container>
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
