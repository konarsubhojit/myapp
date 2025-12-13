import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import OrderRowSkeleton from '../../../components/common/OrderRowSkeleton';
import { Table, TableBody } from '@mui/material';

describe('OrderRowSkeleton', () => {
  const renderSkeleton = () => {
    return render(
      <Table>
        <TableBody>
          <OrderRowSkeleton />
        </TableBody>
      </Table>
    );
  };

  it('should render a table row', () => {
    const { container } = renderSkeleton();
    const row = container.querySelector('tr');
    expect(row).toBeInTheDocument();
  });

  it('should render 9 table cells to match OrderHistoryTableHeader', () => {
    const { container } = renderSkeleton();
    const cells = container.querySelectorAll('td');
    // Should have 9 cells: orderId, customerName, orderFrom, confirmationStatus, 
    // status, paymentStatus, deliveryStatus, totalPrice, expectedDeliveryDate
    expect(cells).toHaveLength(9);
  });

  it('should render skeleton elements in all cells', () => {
    const { container } = renderSkeleton();
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    // Should have multiple skeletons (at least 9 for each cell, some cells have 2)
    expect(skeletons.length).toBeGreaterThanOrEqual(9);
  });

  it('should align total price cell to the right', () => {
    const { container } = renderSkeleton();
    const cells = container.querySelectorAll('td');
    // 8th cell (index 7) should be the total price with right alignment
    const totalPriceCell = cells[7];
    expect(totalPriceCell).toHaveStyle({ textAlign: 'right' });
  });

  it('should render rounded variant skeletons for chip-like fields', () => {
    const { container } = renderSkeleton();
    const roundedSkeletons = container.querySelectorAll('.MuiSkeleton-rounded');
    // Should have at least 5 rounded skeletons for orderFrom, confirmationStatus,
    // status, paymentStatus, deliveryStatus, and priority chip
    expect(roundedSkeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('should render customer name cell with two text skeletons', () => {
    const { container } = renderSkeleton();
    const cells = container.querySelectorAll('td');
    // 2nd cell (index 1) is customer name with name + customerId
    const customerCell = cells[1];
    const textSkeletons = customerCell.querySelectorAll('.MuiSkeleton-text');
    expect(textSkeletons).toHaveLength(2);
  });

  it('should render expected delivery date cell with two skeletons', () => {
    const { container } = renderSkeleton();
    const cells = container.querySelectorAll('td');
    // 9th cell (index 8) is expected delivery date with date + priority chip
    const dateCell = cells[8];
    const skeletons = dateCell.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(2);
  });
});
