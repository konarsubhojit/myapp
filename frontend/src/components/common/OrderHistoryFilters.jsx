import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
} from '../../constants/orderConstants';

function OrderHistoryFilters({ filters, onFilterChange, onClearFilters }) {
  return (
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
            onChange={(e) => onFilterChange('orderId', e.target.value)}
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
            onChange={(e) => onFilterChange('customerName', e.target.value)}
            aria-label="Filter by Customer Name"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Filter by Customer ID"
            value={filters.customerId}
            onChange={(e) => onFilterChange('customerId', e.target.value)}
            aria-label="Filter by Customer ID"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Source</InputLabel>
            <Select
              value={filters.orderFrom}
              label="Source"
              onChange={(e) => onFilterChange('orderFrom', e.target.value)}
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
              onChange={(e) => onFilterChange('confirmationStatus', e.target.value)}
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
              onChange={(e) => onFilterChange('paymentStatus', e.target.value)}
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
            onClick={onClearFilters}
            fullWidth
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default OrderHistoryFilters;
