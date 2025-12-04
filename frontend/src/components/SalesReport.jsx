import { useMemo, useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

const TIME_RANGES = [
  { key: 'week', label: 'Last Week', days: 7 },
  { key: 'month', label: 'Last Month', days: 30 },
  { key: '3months', label: 'Last 3 Months', days: 90 },
  { key: 'year', label: 'Last Year', days: 365 },
];

function SalesReport({ orders }) {
  const { formatPrice } = useCurrency();
  const [selectedRange, setSelectedRange] = useState('month');

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

      // Calculate orders by source
      const sourceBreakdown = {};
      filteredOrders.forEach(order => {
        if (!sourceBreakdown[order.orderFrom]) {
          sourceBreakdown[order.orderFrom] = { count: 0, revenue: 0 };
        }
        sourceBreakdown[order.orderFrom].count += 1;
        sourceBreakdown[order.orderFrom].revenue += order.totalPrice;
      });

      results[range.key] = {
        totalSales,
        orderCount,
        topItems,
        sourceBreakdown,
        averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0
      };
    });

    return results;
  }, [orders]);

  const currentStats = analytics[selectedRange] || {
    totalSales: 0,
    orderCount: 0,
    topItems: [],
    sourceBreakdown: {},
    averageOrderValue: 0
  };

  const getMaxQuantity = () => {
    if (currentStats.topItems.length === 0) return 1;
    return Math.max(...currentStats.topItems.map(item => item.quantity));
  };

  const getMaxSourceCount = () => {
    const counts = Object.values(currentStats.sourceBreakdown).map(s => s.count);
    if (counts.length === 0) return 1;
    return Math.max(...counts);
  };

  return (
    <div className="panel sales-report-panel">
      <h2>Sales Report & Analytics</h2>

      <div className="time-range-selector">
        {TIME_RANGES.map(range => (
          <button
            key={range.key}
            className={`range-btn ${selectedRange === range.key ? 'active' : ''}`}
            onClick={() => setSelectedRange(range.key)}
          >
            {range.label}
          </button>
        ))}
      </div>

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
      </div>

      <div className="analytics-sections">
        <div className="analytics-section">
          <h3>Top Selling Items</h3>
          {currentStats.topItems.length === 0 ? (
            <p className="no-data">No items sold in this period</p>
          ) : (
            <div className="top-items-chart">
              {currentStats.topItems.map((item, idx) => (
                <div key={item.name} className="chart-bar-container">
                  <div className="chart-label">
                    <span className="rank">#{idx + 1}</span>
                    <span className="item-name">{item.name}</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar"
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
          <h3>Orders by Source</h3>
          {Object.keys(currentStats.sourceBreakdown).length === 0 ? (
            <p className="no-data">No orders in this period</p>
          ) : (
            <div className="source-breakdown">
              {Object.entries(currentStats.sourceBreakdown).map(([source, data]) => (
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

      <div className="all-time-comparison">
        <h3>Period Comparison</h3>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Orders</th>
              <th>Total Sales</th>
              <th>Avg. Order Value</th>
            </tr>
          </thead>
          <tbody>
            {TIME_RANGES.map(range => (
              <tr key={range.key} className={selectedRange === range.key ? 'selected' : ''}>
                <td>{range.label}</td>
                <td>{analytics[range.key]?.orderCount || 0}</td>
                <td>{formatPrice(analytics[range.key]?.totalSales || 0)}</td>
                <td>{formatPrice(analytics[range.key]?.averageOrderValue || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalesReport;
