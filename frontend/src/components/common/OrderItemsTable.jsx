import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

/**
 * Reusable order items table component
 * Displays items with quantities and prices
 */
function OrderItemsTable({ items, formatPrice }) {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Order Items
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2">{item.name}</Typography>
                  {item.customizationRequest && (
                    <Typography variant="caption" color="info.main" fontStyle="italic">
                      Customization: {item.customizationRequest}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{formatPrice(item.price)}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{formatPrice(item.price * item.quantity)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} align="right">
                <Typography variant="subtitle2">Total:</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                  {formatPrice(totalPrice)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

OrderItemsTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    quantity: PropTypes.number.isRequired,
    customizationRequest: PropTypes.string,
  })).isRequired,
  formatPrice: PropTypes.func.isRequired,
};

export default OrderItemsTable;
