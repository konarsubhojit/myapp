import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Pagination from '@mui/material/Pagination';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrderPagination } from '../hooks/useOrderPagination';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDetails from './OrderDetails';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
  getPaymentStatusLabel,
  getConfirmationStatusLabel,
} from '../constants/orderConstants';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Formats delivery date for order history display
 */
const formatHistoryDeliveryDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Gets color for order status in history
 */
const getHistoryStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets color for priority indicators
 */
const getHistoryPriorityColor = (priorityData) => {
  if (!priorityData) return 'default';
  if (priorityData.className.includes('overdue')) return 'error';
  if (priorityData.className.includes('due-today')) return 'warning';
  if (priorityData.className.includes('urgent')) return 'warning';
  return 'success';
};

/**
 * Gets color for payment status
 */
const getHistoryPaymentColor = (status) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially_paid': return 'warning';
    case 'unpaid': return 'default';
    default: return 'default';
  }
};

function OrderHistory({ onDuplicateOrder }) {
  const { formatPrice } = useCurrency();
  
  // Use pagination hook
  const {
    orders,
    pagination,
    initialLoading,
    loading,
    error,
    fetchOrders,
    handlePageChange,
    handlePageSizeChange,
  } = useOrderPagination();
  
  // Use filters hook
  const {
    filters,
    sortConfig,
    sortedOrders,
    handleFilterChange,
    handleClearFilters,
    handleSort,
  } = useOrderFilters(orders);
  
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleOrderClick = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = () => {
    setSelectedOrderId(null);
  };

  if (initialLoading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
          Order History
        </Typography>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Order History
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Priority Legend */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Priority Indicators:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="Overdue" color="error" size="small" />
            <Typography variant="caption" color="text.secondary">Past</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="Due Today" color="warning" size="small" />
            <Typography variant="caption" color="text.secondary">Today</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="1-3d" color="warning" variant="outlined" size="small" />
            <Typography variant="caption" color="text.secondary">Soon</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="Normal" color="success" size="small" />
            <Typography variant="caption" color="text.secondary">Later</Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Filters Section */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter by Order ID"
              value={filters.orderId}
              onChange={(e) => handleFilterChange('orderId', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
              aria-label="Filter by Order ID"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter by Customer Name"
              value={filters.customerName}
              onChange={(e) => handleFilterChange('customerName', e.target.value)}
              aria-label="Filter by Customer Name"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter by Customer ID"
              value={filters.customerId}
              onChange={(e) => handleFilterChange('customerId', e.target.value)}
              aria-label="Filter by Customer ID"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Source</InputLabel>
              <Select
                value={filters.orderFrom}
                label="Source"
                onChange={(e) => handleFilterChange('orderFrom', e.target.value)}
              >
                <MenuItem value="">All Sources</MenuItem>
                {ORDER_SOURCES.map(source => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.confirmationStatus}
                label="Status"
                onChange={(e) => handleFilterChange('confirmationStatus', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {CONFIRMATION_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Payment</InputLabel>
              <Select
                value={filters.paymentStatus}
                label="Payment"
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              >
                <MenuItem value="">All Payments</MenuItem>
                {PAYMENT_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Pagination Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="page-size-label">Per page</InputLabel>
          <Select
            labelId="page-size-label"
            id="pageSize"
            value={pagination.limit}
            label="Per page"
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          Showing {sortedOrders.length} of {pagination.total} orders
        </Typography>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && sortedOrders.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No orders found
        </Typography>
      ) : !loading && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small" aria-label="Orders table">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'orderId'}
                    direction={sortConfig.key === 'orderId' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('orderId')}
                  >
                    Order ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'customerName'}
                    direction={sortConfig.key === 'customerName' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('customerName')}
                  >
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'orderFrom'}
                    direction={sortConfig.key === 'orderFrom' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('orderFrom')}
                  >
                    Source
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'confirmationStatus'}
                    direction={sortConfig.key === 'confirmationStatus' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('confirmationStatus')}
                  >
                    Confirmation
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'status'}
                    direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'paymentStatus'}
                    direction={sortConfig.key === 'paymentStatus' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('paymentStatus')}
                  >
                    Payment
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortConfig.key === 'totalPrice'}
                    direction={sortConfig.key === 'totalPrice' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('totalPrice')}
                  >
                    Total
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'expectedDeliveryDate'}
                    direction={sortConfig.key === 'expectedDeliveryDate' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('expectedDeliveryDate')}
                  >
                    Delivery
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map(order => {
                const priority = getPriorityStatus(order.expectedDeliveryDate, { shortLabels: true });
                return (
                  <TableRow 
                    key={order._id} 
                    onClick={() => handleOrderClick(order._id)}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {order.orderId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.customerName}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.customerId}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={order.orderFrom} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getConfirmationStatusLabel(order.confirmationStatus)} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={order.status || 'pending'} 
                        size="small" 
                        color={getHistoryStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getPaymentStatusLabel(order.paymentStatus)} 
                        size="small" 
                        color={getHistoryPaymentColor(order.paymentStatus)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatPrice(order.totalPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatHistoryDeliveryDate(order.expectedDeliveryDate)}
                      </Typography>
                      {priority && (
                        <Chip 
                          label={priority.label} 
                          size="small" 
                          color={getHistoryPriorityColor(priority)}
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Pagination
          count={pagination.totalPages || 1}
          page={pagination.page}
          onChange={(event, page) => handlePageChange(page)}
          color="primary"
          showFirstButton
          showLastButton
        />
        <Typography variant="caption" color="text.secondary">
          Page {pagination.page} of {pagination.totalPages}
        </Typography>
      </Box>

      {selectedOrderId && (
        <OrderDetails 
          orderId={selectedOrderId} 
          onClose={handleCloseDetails}
          onOrderUpdated={() => fetchOrders(pagination.page, pagination.limit)}
          onDuplicateOrder={onDuplicateOrder}
        />
      )}
    </Paper>
  );
}

export default OrderHistory;
