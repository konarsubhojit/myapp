import { useState, useEffect } from 'react'
import './App.css'
import ItemPanel from './components/ItemPanel'
import OrderForm from './components/OrderForm'
import { getItems, getOrders } from './services/api'

function App() {
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchItems(), fetchOrders()])
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="loading">Loading your data...</div>
  }

  return (
    <div className="app">
      <header>
        <h1>Order Management System</h1>
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
      </nav>

      <main>
        {activeTab === 'orders' && (
          <OrderForm 
            items={items} 
            onOrderCreated={fetchOrders} 
          />
        )}

        {activeTab === 'items' && (
          <ItemPanel 
            items={items} 
            onItemsChange={fetchItems} 
          />
        )}

        {activeTab === 'history' && (
          <div className="panel">
            <h2>Order History</h2>
            {orders.length === 0 ? (
              <p>No orders yet</p>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">{order.orderId}</span>
                      <span className="order-source">{order.orderFrom}</span>
                    </div>
                    <div className="order-details">
                      <p><strong>Customer:</strong> {order.customerName}</p>
                      <p><strong>Customer ID:</strong> {order.customerId}</p>
                      <p><strong>Items:</strong></p>
                      <ul>
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                      <p className="order-total"><strong>Total:</strong> ${order.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
