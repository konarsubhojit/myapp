import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderItemsTable from '../../../components/common/OrderItemsTable';

describe('OrderItemsTable', () => {
  const mockFormatPrice = vi.fn((price) => `$${price.toFixed(2)}`);

  const mockItems = [
    {
      name: 'Item 1',
      price: 10.00,
      quantity: 2,
    },
    {
      name: 'Item 2',
      price: 15.50,
      quantity: 1,
      customizationRequest: 'Add embroidery',
    },
  ];

  it('should render order items table', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    expect(screen.getByText('Order Items')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should display item details correctly', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // quantity
    expect(screen.getByText('1')).toBeInTheDocument(); // quantity
  });

  it('should display customization request when present', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    expect(screen.getByText(/Add embroidery/)).toBeInTheDocument();
  });

  it('should calculate and display total price', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    // Total should be (10 * 2) + (15.50 * 1) = 35.50
    expect(mockFormatPrice).toHaveBeenCalledWith(35.50);
  });

  it('should render table headers', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
  });

  it('should handle empty items array', () => {
    render(
      <OrderItemsTable
        items={[]}
        formatPrice={mockFormatPrice}
      />
    );

    expect(screen.getByText('Order Items')).toBeInTheDocument();
    expect(mockFormatPrice).toHaveBeenCalledWith(0); // Total should be 0
  });

  it('should calculate subtotal for each item', () => {
    render(
      <OrderItemsTable
        items={mockItems}
        formatPrice={mockFormatPrice}
      />
    );

    // Check that formatPrice was called for subtotals
    expect(mockFormatPrice).toHaveBeenCalledWith(20.00); // Item 1: 10 * 2
    expect(mockFormatPrice).toHaveBeenCalledWith(15.50); // Item 2: 15.50 * 1
  });
});
