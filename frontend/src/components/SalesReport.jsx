import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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

const VALID_RANGES = new Set(TIME_RANGES.map(r => r.key));
const VALID_VIEWS = new Set(VIEW_OPTIONS.map(v => v.key));

// Helper function to aggregate item counts from orders
const aggregateItemCounts = (filteredOrders) => {
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
  
  return itemCounts;
};

// Helper function to aggregate customer data from orders
const aggregateCustomerData = (filteredOrders) => {
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
    
    // Track items purchased by each customer
    order.items.forEach(item => {
      const itemName = item.name;
      if (!customerCounts[key].items[itemName]) {
        customerCounts[key].items[itemName] = 0;
      }
      customerCounts[key].items[itemName] += item.quantity;
    });
  });
  
  return customerCounts;
};

// Helper function to aggregate source breakdown from orders
const aggregateSourceBreakdown = (filteredOrders) => {
  const sourceBreakdown = {};
  
  filteredOrders.forEach(order => {
    if (!sourceBreakdown[order.orderFrom]) {
      sourceBreakdown[order.orderFrom] = { count: 0, revenue: 0 };
    }
    sourceBreakdown[order.orderFrom].count += 1;
    sourceBreakdown[order.orderFrom].revenue += order.totalPrice;
  });
  
  return sourceBreakdown;
};

function SalesReport({ orders }) {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  // Get initial values from URL or use defaults
  const rangeParam = searchParams.get('range');
  const viewParam = searchParams.get('view');
  
  const selectedRange = VALID_RANGES.has(rangeParam) ? rangeParam : 'month';
  const selectedView = VALID_VIEWS.has(viewParam) ? viewParam : 'overview';

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

      // Use helper functions to aggregate data
      const itemCounts = aggregateItemCounts(filteredOrders);
      const itemsArray = Object.entries(itemCounts).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue
      }));

      itemsArray.sort((a, b) => b.quantity - a.quantity);
      const topItems = itemsArray.slice(0, 5);
      const topItemsByRevenue = [...itemsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const sourceBreakdown = aggregateSourceBreakdown(filteredOrders);
      
      const customerCounts = aggregateCustomerData(filteredOrders);
      const customersArray = Object.values(customerCounts);
      customersArray.sort((a, b) => b.orderCount - a.orderCount);
      const topCustomersByOrders = customersArray.slice(0, 5);
      
      const topCustomersByRevenue = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
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

  const StatCard = ({ value, label, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center' }}>
        {icon && <Box sx={{ color: `${color}.main`, mb: 1 }}>{icon}</Box>}
        <Typography variant="h4" fontWeight={700} color={`${color}.main`}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderOverviewView = () => (
    <>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={formatPrice(currentStats.totalSales)} 
            label="Total Sales" 
            icon={<TrendingUpIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={currentStats.orderCount} 
            label="Total Orders" 
            icon={<ShoppingCartIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={formatPrice(currentStats.averageOrderValue)} 
            label="Avg. Order Value" 
            icon={<AttachMoneyIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={currentStats.uniqueCustomers} 
            label="Unique Customers" 
            icon={<GroupIcon fontSize="large" />}
          />
        </Grid>
        {topSellingItem && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'success.50', border: '2px solid', borderColor: 'success.200' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEventsIcon sx={{ color: 'success.main', fontSize: 40 }} />
                <Typography variant="h6" fontWeight={600} color="success.dark">
                  {topSellingItem.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🏆 Top Selling Item ({topSellingItem.quantity} units)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        {currentStats.highestOrderingCustomer && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'info.50', border: '2px solid', borderColor: 'info.200' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ color: 'info.main', fontSize: 40 }} />
                <Typography variant="h6" fontWeight={600} color="info.dark">
                  {currentStats.highestOrderingCustomer.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  👤 Top Customer ({currentStats.highestOrderingCustomer.orderCount} orders)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Period Comparison</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Customers</TableCell>
                <TableCell align="right">Total Sales</TableCell>
                <TableCell align="right">Avg. Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TIME_RANGES.map(range => (
                <TableRow 
                  key={range.key} 
                  selected={selectedRange === range.key}
                  sx={{ 
                    bgcolor: selectedRange === range.key ? 'primary.50' : 'inherit',
                  }}
                >
                  <TableCell>{range.label}</TableCell>
                  <TableCell align="right">{analytics[range.key]?.orderCount || 0}</TableCell>
                  <TableCell align="right">{analytics[range.key]?.uniqueCustomers || 0}</TableCell>
                  <TableCell align="right">{formatPrice(analytics[range.key]?.totalSales || 0)}</TableCell>
                  <TableCell align="right">{formatPrice(analytics[range.key]?.averageOrderValue || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );

  const renderItemsView = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Items by Quantity Sold</Typography>
        {currentStats.topItems.length === 0 ? (
          <Typography color="text.secondary">No items sold in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {currentStats.topItems.map((item, idx) => (
              <Box key={item.name}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={idx === 0 ? 600 : 400}>
                    #{idx + 1} {item.name} {idx === 0 && '🏆'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatPrice(item.revenue)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(item.quantity / getMaxQuantity()) * 100}
                      sx={{ 
                        height: 20, 
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: idx === 0 ? 'success.main' : 'primary.main',
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 60 }}>
                    {item.quantity} units
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Items by Revenue</Typography>
        {currentStats.topItemsByRevenue.length === 0 ? (
          <Typography color="text.secondary">No items sold in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {currentStats.topItemsByRevenue.map((item, idx) => (
              <Box key={item.name}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={idx === 0 ? 600 : 400}>
                    #{idx + 1} {item.name} {idx === 0 && '💰'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.quantity} units
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(item.revenue / getMaxRevenue()) * 100}
                      sx={{ 
                        height: 20, 
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: idx === 0 ? 'warning.main' : 'secondary.main',
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    {formatPrice(item.revenue)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>
    </Grid>
  );

  const renderCustomersView = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Customers by Order Count</Typography>
        {currentStats.topCustomersByOrders.length === 0 ? (
          <Typography color="text.secondary">No customers in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {currentStats.topCustomersByOrders.map((customer, idx) => (
              <Box key={customer.customerId}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={idx === 0 ? 600 : 400}>
                    #{idx + 1} {customer.customerName} {idx === 0 && '👤'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatPrice(customer.totalSpent)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {customer.customerId}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(customer.orderCount / getMaxCustomerOrders()) * 100}
                      sx={{ 
                        height: 16, 
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: idx === 0 ? 'info.main' : 'primary.main',
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 70 }}>
                    {customer.orderCount} orders
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Customers by Revenue</Typography>
        {currentStats.topCustomersByRevenue.length === 0 ? (
          <Typography color="text.secondary">No customers in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {currentStats.topCustomersByRevenue.map((customer, idx) => (
              <Box key={customer.customerId}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={idx === 0 ? 600 : 400}>
                    #{idx + 1} {customer.customerName} {idx === 0 && '💰'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customer.orderCount} orders
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {customer.customerId}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(customer.totalSpent / getMaxCustomerRevenue()) * 100}
                      sx={{ 
                        height: 16, 
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: idx === 0 ? 'warning.main' : 'secondary.main',
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    {formatPrice(customer.totalSpent)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>
    </Grid>
  );

  const renderSourceView = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Orders by Source</Typography>
      {Object.keys(currentStats.sourceBreakdown).length === 0 ? (
        <Typography color="text.secondary">No orders in this period</Typography>
      ) : (
        <Stack spacing={2}>
          {Object.entries(currentStats.sourceBreakdown)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([source, data]) => (
              <Box key={source}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={500}>{source}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatPrice(data.revenue)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(data.count / getMaxSourceCount()) * 100}
                      sx={{ 
                        height: 20, 
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 70 }}>
                    {data.count} orders
                  </Typography>
                </Box>
              </Box>
            ))}
        </Stack>
      )}
    </Box>
  );

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Sales Report & Analytics
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          {isMobile ? (
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedRange}
                label="Time Range"
                onChange={(e) => handleRangeChange(e.target.value)}
              >
                {TIME_RANGES.map(range => (
                  <MenuItem key={range.key} value={range.key}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <ButtonGroup variant="outlined" size="small">
              {TIME_RANGES.map(range => (
                <Button
                  key={range.key}
                  variant={selectedRange === range.key ? 'contained' : 'outlined'}
                  onClick={() => handleRangeChange(range.key)}
                >
                  {range.label}
                </Button>
              ))}
            </ButtonGroup>
          )}

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="view-select-label">View</InputLabel>
            <Select 
              labelId="view-select-label"
              id="viewSelect"
              value={selectedView} 
              label="View"
              onChange={(e) => handleViewChange(e.target.value)}
            >
              {VIEW_OPTIONS.map(option => (
                <MenuItem key={option.key} value={option.key}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {selectedView === 'overview' && renderOverviewView()}
      {selectedView === 'byItem' && renderItemsView()}
      {selectedView === 'byCustomer' && renderCustomersView()}
      {selectedView === 'bySource' && renderSourceView()}
    </Paper>
  );
}

export default SalesReport;
