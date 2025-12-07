import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrderPagination } from '../hooks/useOrderPagination';
import { useOrderFilters } from '../hooks/useOrderFilters';
import OrderHistoryFilters from './common/OrderHistoryFilters';
import OrderHistoryTable from './common/OrderHistoryTable';
import PriorityLegend from './common/PriorityLegend';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function OrderHistory({ onOrderClick, onDuplicateOrder }) {
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
      
      <PriorityLegend />
      
      <OrderHistoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

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
        <OrderHistoryTable
          orders={sortedOrders}
          sortConfig={sortConfig}
          formatPrice={formatPrice}
          onSort={handleSort}
          onOrderClick={onOrderClick}
        />
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
    </Paper>
  );
}

export default OrderHistory;
