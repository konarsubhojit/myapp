import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

function OrderHistoryTableHeader({ sortConfig, onSort }) {
  const createSortHandler = (key) => () => onSort(key);
  
  const columns = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'orderFrom', label: 'Source' },
    { key: 'confirmationStatus', label: 'Confirmation' },
    { key: 'status', label: 'Status' },
    { key: 'paymentStatus', label: 'Payment' },
    { key: 'deliveryStatus', label: 'Delivery' },
    { key: 'totalPrice', label: 'Total', align: 'right' },
    { key: 'expectedDeliveryDate', label: 'Expected' },
  ];

  return (
    <TableHead>
      <TableRow>
        {columns.map(column => (
          <TableCell key={column.key} align={column.align}>
            <TableSortLabel
              active={sortConfig.key === column.key}
              direction={sortConfig.key === column.key ? sortConfig.direction : 'asc'}
              onClick={createSortHandler(column.key)}
            >
              {column.label}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export default OrderHistoryTableHeader;
