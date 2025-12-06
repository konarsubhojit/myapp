import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';

const TIME_RANGES = [
  { key: 'week', label: 'Last Week', days: 7 },
  { key: 'month', label: 'Last Month', days: 30 },
  { key: 'quarter', label: 'Last Quarter', days: 90 },
  { key: 'halfYear', label: 'Last 6 Months', days: 180 },
  { key: 'year', label: 'Last Year', days: 365 },
];

const VIEW_OPTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'byItem', label: 'By Item' },
  { key: 'byCustomer', label: 'By Customer' },
  { key: 'bySource', label: 'By Source' },
];

const VALID_RANGES = TIME_RANGES.map(r => r.key);
const VALID_VIEWS = VIEW_OPTIONS.map(v => v.key);

function SalesReport({ orders }) {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL or use defaults
  const rangeParam = searchParams.get('range');
  const viewParam = searchParams.get('view');
  
  const selectedRange = VALID_RANGES.includes(rangeParam) ? rangeParam : 'month';
  const selectedView = VALID_VIEWS.includes(viewParam) ? viewParam : 'overview';

  // Update URL when state changes
  const updateUrl = useCallback((range, view) => {
    const params = new URLSearchParams();
    if (range !== 'month') params.set('range', range);
    if (view !== 'overview') params.set('view', view);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleRangeChange = (range) => {
    updateUrl(range, selectedView);
  };

  const handleViewChange = (view) => {
    updateUrl(selectedRange, view);
  };

  const analytics = useMemo(() => {
    const now = new Date();
    const results = {};

    TIME_RANGES.forEach(range => {
      const cutoffDate = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
      
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= cutoffDate;
      });

      const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const orderCount = filteredOrders.length;

      // Calculate most sold item
      const itemCounts = {};
      filteredOrders.forEach(order => {
        order.items.forEach(item => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { quantity: 0, revenue: 0 };
          }
          itemCounts[item.name].quantity += item.quantity;
          itemCounts[item.name].revenue += item.price * item.quantity;
        });
      });

      const itemsArray = Object.entries(itemCounts).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue
      }));

      itemsArray.sort((a, b) => b.quantity - a.quantity);
      const topItems = itemsArray.slice(0, 5);
      const topItemsByRevenue = [...itemsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Calculate orders by source
      const sourceBreakdown = {};
      filteredOrders.forEach(order => {
        if (!sourceBreakdown[order.orderFrom]) {
          sourceBreakdown[order.orderFrom] = { count: 0, revenue: 0 };
        }
        sourceBreakdown[order.orderFrom].count += 1;
        sourceBreakdown[order.orderFrom].revenue += order.totalPrice;
      });

      // Calculate customer analytics
      const customerCounts = {};
      filteredOrders.forEach(order => {
        const customerId = order.customerId;
        const customerName = order.customerName;
        const key = `${customerId}_${customerName}`;
        
        if (!customerCounts[key]) {
          customerCounts[key] = { 
            customerId, 
            customerName, 
            orderCount: 0, 
            totalSpent: 0,
            items: {}
          };
        }
        customerCounts[key].orderCount += 1;
        customerCounts[key].totalSpent += order.totalPrice;
        
        order.items.forEach(item => {
          if (!customerCounts[key].items[item.name]) {
            customerCounts[key].items[item.name] = 0;
          }
          customerCounts[key].items[item.name] += item.quantity;
        });
      });

      const customersArray = Object.values(customerCounts);
      customersArray.sort((a, b) => b.orderCount - a.orderCount);
      const topCustomersByOrders = customersArray.slice(0, 5);
      
      const topCustomersByRevenue = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

      // Get highest ordering customer
      const highestOrderingCustomer = customersArray.length > 0 ? customersArray[0] : null;

      results[range.key] = {
        totalSales,
        orderCount,
        topItems,
        topItemsByRevenue,
        sourceBreakdown,
        topCustomersByOrders,
        topCustomersByRevenue,
        highestOrderingCustomer,
        averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
        uniqueCustomers: customersArray.length
      };
    });

    return results;
  }, [orders]);

  const currentStats = analytics[selectedRange] || {
    totalSales: 0,
    orderCount: 0,
    topItems: [],
    topItemsByRevenue: [],
    sourceBreakdown: {},
    topCustomersByOrders: [],
    topCustomersByRevenue: [],
    highestOrderingCustomer: null,
    averageOrderValue: 0,
    uniqueCustomers: 0
  };

  const getMaxQuantity = () => {
    if (currentStats.topItems.length === 0) return 1;
    return Math.max(...currentStats.topItems.map(item => item.quantity));
  };

  const getMaxRevenue = () => {
    if (currentStats.topItemsByRevenue.length === 0) return 1;
    return Math.max(...currentStats.topItemsByRevenue.map(item => item.revenue));
  };

  const getMaxSourceCount = () => {
    const counts = Object.values(currentStats.sourceBreakdown).map(s => s.count);
    if (counts.length === 0) return 1;
    return Math.max(...counts);
  };

  const getMaxCustomerOrders = () => {
    if (currentStats.topCustomersByOrders.length === 0) return 1;
    return Math.max(...currentStats.topCustomersByOrders.map(c => c.orderCount));
  };

  const getMaxCustomerRevenue = () => {
    if (currentStats.topCustomersByRevenue.length === 0) return 1;
    return Math.max(...currentStats.topCustomersByRevenue.map(c => c.totalSpent));
  };

  // Get the top selling item for the highlight card
  const topSellingItem = currentStats.topItems.length > 0 ? currentStats.topItems[0] : null;

  const renderOverviewView = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatPrice(currentStats.totalSales)}</div>
          <div className="stat-label">Total Sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentStats.orderCount}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatPrice(currentStats.averageOrderValue)}</div>
          <div className="stat-label">Avg. Order Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentStats.uniqueCustomers}</div>
          <div className="stat-label">Unique Customers</div>
        </div>
        {topSellingItem && (
          <div className="stat-card top-seller-card">
            <div className="stat-value top-seller-name">{topSellingItem.name}</div>
            <div className="stat-label">🏆 Top Selling Item ({topSellingItem.quantity} units)</div>
          </div>
        )}
        {currentStats.highestOrderingCustomer && (
          <div className="stat-card top-customer-card">
            <div className="stat-value top-customer-name">{currentStats.highestOrderingCustomer.customerName}</div>
            <div className="stat-label">👤 Top Customer ({currentStats.highestOrderingCustomer.orderCount} orders)</div>
          </div>
        )}
      </div>

      <div className="all-time-comparison">
        <h3>Period Comparison</h3>
        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Orders</th>
                <th>Customers</th>
                <th>Total Sales</th>
                <th>Avg. Order Value</th>
              </tr>
            </thead>
            <tbody>
              {TIME_RANGES.map(range => (
                <tr key={range.key} className={selectedRange === range.key ? 'selected' : ''}>
                  <td>{range.label}</td>
                  <td>{analytics[range.key]?.orderCount || 0}</td>
                  <td>{analytics[range.key]?.uniqueCustomers || 0}</td>
                  <td>{formatPrice(analytics[range.key]?.totalSales || 0)}</td>
                  <td>{formatPrice(analytics[range.key]?.averageOrderValue || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderItemsView = () => (
    <div className="analytics-sections">
      <div className="analytics-section">
        <h3>Top Items by Quantity Sold</h3>
        {currentStats.topItems.length === 0 ? (
          <p className="no-data">No items sold in this period</p>
        ) : (
          <div className="top-items-chart">
            {currentStats.topItems.map((item, idx) => (
              <div key={item.name} className={`chart-bar-container ${idx === 0 ? 'top-seller' : ''}`}>
                <div className="chart-label">
                  <span className="rank">#{idx + 1}</span>
                  <span className="item-name">{item.name}</span>
                  {idx === 0 && <span className="top-badge">🏆</span>}
                </div>
                <div className="chart-bar-wrapper">
                  <div 
                    className={`chart-bar ${idx === 0 ? 'top-seller-bar' : ''}`}
                    style={{ width: `${(item.quantity / getMaxQuantity()) * 100}%` }}
                  >
                    <span className="bar-value">{item.quantity} units</span>
                  </div>
                </div>
                <div className="chart-revenue">{formatPrice(item.revenue)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="analytics-section">
        <h3>Top Items by Revenue</h3>
        {currentStats.topItemsByRevenue.length === 0 ? (
          <p className="no-data">No items sold in this period</p>
        ) : (
          <div className="top-items-chart">
            {currentStats.topItemsByRevenue.map((item, idx) => (
              <div key={item.name} className={`chart-bar-container ${idx === 0 ? 'top-revenue' : ''}`}>
                <div className="chart-label">
                  <span className="rank">#{idx + 1}</span>
                  <span className="item-name">{item.name}</span>
                  {idx === 0 && <span className="top-badge">💰</span>}
                </div>
                <div className="chart-bar-wrapper">
                  <div 
                    className={`chart-bar revenue-bar ${idx === 0 ? 'top-revenue-bar' : ''}`}
                    style={{ width: `${(item.revenue / getMaxRevenue()) * 100}%` }}
                  >
                    <span className="bar-value">{formatPrice(item.revenue)}</span>
                  </div>
                </div>
                <div className="chart-quantity">{item.quantity} units</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCustomersView = () => (
    <div className="analytics-sections">
      <div className="analytics-section">
        <h3>Top Customers by Order Count</h3>
        {currentStats.topCustomersByOrders.length === 0 ? (
          <p className="no-data">No customers in this period</p>
        ) : (
          <div className="customer-chart">
            {currentStats.topCustomersByOrders.map((customer, idx) => (
              <div key={customer.customerId} className={`customer-bar-container ${idx === 0 ? 'top-customer' : ''}`}>
                <div className="customer-info">
                  <span className="rank">#{idx + 1}</span>
                  <span className="customer-name">{customer.customerName}</span>
                  {idx === 0 && <span className="top-badge">👤</span>}
                </div>
                <div className="customer-id-cell">{customer.customerId}</div>
                <div className="chart-bar-wrapper">
                  <div 
                    className={`chart-bar customer-bar ${idx === 0 ? 'top-customer-bar' : ''}`}
                    style={{ width: `${(customer.orderCount / getMaxCustomerOrders()) * 100}%` }}
                  >
                    <span className="bar-value">{customer.orderCount} orders</span>
                  </div>
                </div>
                <div className="customer-spent">{formatPrice(customer.totalSpent)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="analytics-section">
        <h3>Top Customers by Revenue</h3>
        {currentStats.topCustomersByRevenue.length === 0 ? (
          <p className="no-data">No customers in this period</p>
        ) : (
          <div className="customer-chart">
            {currentStats.topCustomersByRevenue.map((customer, idx) => (
              <div key={customer.customerId} className={`customer-bar-container ${idx === 0 ? 'top-revenue-customer' : ''}`}>
                <div className="customer-info">
                  <span className="rank">#{idx + 1}</span>
                  <span className="customer-name">{customer.customerName}</span>
                  {idx === 0 && <span className="top-badge">💰</span>}
                </div>
                <div className="customer-id-cell">{customer.customerId}</div>
                <div className="chart-bar-wrapper">
                  <div 
                    className={`chart-bar revenue-bar ${idx === 0 ? 'top-revenue-bar' : ''}`}
                    style={{ width: `${(customer.totalSpent / getMaxCustomerRevenue()) * 100}%` }}
                  >
                    <span className="bar-value">{formatPrice(customer.totalSpent)}</span>
                  </div>
                </div>
                <div className="customer-orders">{customer.orderCount} orders</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSourceView = () => (
    <div className="analytics-sections full-width">
      <div className="analytics-section">
        <h3>Orders by Source</h3>
        {Object.keys(currentStats.sourceBreakdown).length === 0 ? (
          <p className="no-data">No orders in this period</p>
        ) : (
          <div className="source-breakdown">
            {Object.entries(currentStats.sourceBreakdown)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([source, data]) => (
                <div key={source} className="source-row">
                  <div className="source-info">
                    <span className="source-name">{source}</span>
                    <span className="source-count">{data.count} orders</span>
                  </div>
                  <div className="source-bar-wrapper">
                    <div 
                      className="source-bar"
                      style={{ width: `${(data.count / getMaxSourceCount()) * 100}%` }}
                    />
                  </div>
                  <div className="source-revenue">{formatPrice(data.revenue)}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="panel sales-report-panel">
      <h2>Sales Report & Analytics</h2>

      <div className="report-controls">
        <div className="time-range-selector">
          {TIME_RANGES.map(range => (
            <button
              key={range.key}
              className={`range-btn ${selectedRange === range.key ? 'active' : ''}`}
              onClick={() => handleRangeChange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="view-selector">
          <label htmlFor="viewSelect">View:</label>
          <select 
            id="viewSelect"
            value={selectedView} 
            onChange={(e) => handleViewChange(e.target.value)}
            className="view-select"
          >
            {VIEW_OPTIONS.map(option => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedView === 'overview' && renderOverviewView()}
      {selectedView === 'byItem' && renderItemsView()}
      {selectedView === 'byCustomer' && renderCustomersView()}
      {selectedView === 'bySource' && renderSourceView()}
    </div>
  );
}

export default SalesReport;
