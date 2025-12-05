import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import ItemPanel from './components/ItemPanel'
import OrderForm from './components/OrderForm'
import OrderHistory from './components/OrderHistory'
import SalesReport from './components/SalesReport'
import Login from './components/Login'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getItems, getOrders } from './services/api'

function AppContent() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth()
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderHistoryKey, setOrderHistoryKey] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

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

  // Show loading while checking auth
  if (authLoading) {
    return <div className="loading">Checking authentication...</div>
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return <div className="loading">Loading your data...</div>
  }

  return (
    <div className="app">
      <header>
        <h1>Order Management System</h1>
        <div className="user-info">
          <span className="user-name">{user?.name || user?.email}</span>
          <button className="logout-button" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <nav className="tabs">
        <NavLink
          to="/orders/new"
          className={({ isActive }) => isActive || location.pathname.startsWith('/orders/new') || location.pathname.startsWith('/orders/duplicate') ? 'active' : ''}
        >
          Create Order
        </NavLink>
        <NavLink
          to="/items"
          className={({ isActive }) => isActive || location.pathname.startsWith('/items') ? 'active' : ''}
        >
          Manage Items
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => isActive || location.pathname.startsWith('/history') ? 'active' : ''}
        >
          Order History
        </NavLink>
        <NavLink
          to="/sales"
          className={({ isActive }) => isActive || location.pathname.startsWith('/sales') ? 'active' : ''}
        >
          Sales Report
        </NavLink>
      </nav>

      <main>
        <Routes>
          <Route 
            path="/" 
            element={<Navigate to="/orders/new" replace />} 
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
            path="/items/*" 
            element={
              <ItemPanel 
                onItemsChange={fetchItems} 
              />
            } 
          />
          <Route 
            path="/history/*" 
            element={
              <OrderHistory 
                key={orderHistoryKey}
                onDuplicateOrder={(orderId) => navigate(`/orders/duplicate/${orderId}`)}
              />
            } 
          />
          <Route 
            path="/sales/*" 
            element={<SalesReport orders={orders} />} 
          />
          {/* Catch-all route */}
          <Route 
            path="*" 
            element={<Navigate to="/orders/new" replace />} 
          />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default App
