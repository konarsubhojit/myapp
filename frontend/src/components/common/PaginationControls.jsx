import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Reusable pagination controls component
 * Shows page size selector, count information, and page navigation
 */
function PaginationControls({ 
  paginationData, 
  onPageChange, 
  onLimitChange,
  size = 'medium'
}) {
  const { page, limit, total, totalPages } = paginationData;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mt: 2,
        ...(size === 'small' ? {} : { p: 2, bgcolor: 'grey.50', borderRadius: 2 })
      }}
    >
      <FormControl size="small" sx={{ minWidth: size === 'small' ? 100 : 120 }}>
        <InputLabel id="page-size-label">Per page</InputLabel>
        <Select
          labelId="page-size-label"
          value={limit}
          label="Per page"
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        >
          {PAGE_SIZE_OPTIONS.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary">
        Page {page} of {totalPages || 1} ({total} items)
      </Typography>
      <Pagination
        count={totalPages || 1}
        page={page}
        onChange={(event, newPage) => onPageChange(newPage)}
        color="primary"
        showFirstButton
        showLastButton
        size={size}
      />
    </Box>
  );
}

PaginationControls.propTypes = {
  paginationData: PropTypes.shape({
    page: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
  }).isRequired,
  onPageChange: PropTypes.func.isRequired,
  onLimitChange: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default PaginationControls;
