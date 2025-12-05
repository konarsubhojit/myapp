import { useState, useEffect } from 'react'
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
  const [activeTab, setActiveTab] = useState('orders')
  const [loading, setLoading] = useState(true)
  const [orderHistoryKey, setOrderHistoryKey] = useState(0)

  const fetchItems = async () => {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const data = await getOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleOrderCreated = () => {
    fetchOrders()
    // Increment key to trigger OrderHistory refresh when switching tabs
    setOrderHistoryKey(prev => prev + 1)
  }

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
  }, [isAuthenticated])

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
        <button
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          Create Order
        </button>
        <button
          className={activeTab === 'items' ? 'active' : ''}
          onClick={() => setActiveTab('items')}
        >
          Manage Items
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Order History
        </button>
        <button
          className={activeTab === 'sales' ? 'active' : ''}
          onClick={() => setActiveTab('sales')}
        >
          Sales Report
        </button>
      </nav>

      <main>
        {activeTab === 'orders' && (
          <OrderForm 
            items={items} 
            onOrderCreated={handleOrderCreated} 
          />
        )}

        {activeTab === 'items' && (
          <ItemPanel 
            onItemsChange={fetchItems} 
          />
        )}

        {activeTab === 'history' && (
          <OrderHistory key={orderHistoryKey} />
        )}

        {activeTab === 'sales' && (
          <SalesReport orders={orders} />
        )}
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
