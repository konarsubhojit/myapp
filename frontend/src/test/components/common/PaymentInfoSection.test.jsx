import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentInfoSection from '../../../components/common/PaymentInfoSection';

describe('PaymentInfoSection', () => {
  const mockFormatPrice = vi.fn((price) => `$${price.toFixed(2)}`);
  const mockOnDataChange = vi.fn();

  it('should render payment info in display mode - paid status', () => {
    const paidData = {
      paymentStatus: 'paid',
      totalPrice: 100,
      paidAmount: 100,
    };

    render(
      <PaymentInfoSection
        isEditing={false}
        data={paidData}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Payment Information')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('should render payment info in display mode - partially paid status', () => {
    const partialData = {
      paymentStatus: 'partially_paid',
      totalPrice: 100,
      paidAmount: 50,
    };

    render(
      <PaymentInfoSection
        isEditing={false}
        data={partialData}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Partially Paid')).toBeInTheDocument();
    // Check that both amount paid and balance are shown
    const amountTexts = screen.getAllByText('$50.00');
    expect(amountTexts).toHaveLength(2); // Amount paid and balance due
  });

  it('should render payment info in display mode - unpaid status', () => {
    const unpaidData = {
      paymentStatus: 'unpaid',
      totalPrice: 100,
      paidAmount: 0,
    };

    render(
      <PaymentInfoSection
        isEditing={false}
        data={unpaidData}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // Balance due
  });

  it('should render editable fields in edit mode', () => {
    const data = {
      paymentStatus: 'unpaid',
      totalPrice: 100,
      paidAmount: 0,
    };

    render(
      <PaymentInfoSection
        isEditing={true}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    // MUI Select has a hidden input, check by role
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  it('should show amount paid field when partially paid in edit mode', () => {
    const data = {
      paymentStatus: 'partially_paid',
      totalPrice: 100,
      paidAmount: 50,
    };

    render(
      <PaymentInfoSection
        isEditing={true}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    // Find the number input for amount paid
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveValue(50);
  });

  it('should not show amount paid field when not partially paid', () => {
    const data = {
      paymentStatus: 'paid',
      totalPrice: 100,
      paidAmount: 100,
    };

    render(
      <PaymentInfoSection
        isEditing={true}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    // No number input should be present
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  });

  it('should calculate balance due correctly', () => {
    const data = {
      paymentStatus: 'partially_paid',
      totalPrice: 150,
      paidAmount: 75,
    };

    render(
      <PaymentInfoSection
        isEditing={false}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    expect(mockFormatPrice).toHaveBeenCalledWith(75); // Balance due
  });

  it('should call onDataChange when payment status is changed', async () => {
    const user = userEvent.setup();
    const data = {
      paymentStatus: 'unpaid',
      totalPrice: 100,
      paidAmount: 0,
    };

    render(
      <PaymentInfoSection
        isEditing={true}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);
    
    const option = screen.getByRole('option', { name: 'Partially Paid' });
    await user.click(option);
    
    expect(mockOnDataChange).toHaveBeenCalledWith('paymentStatus', 'partially_paid');
  });

  it('should call onDataChange when amount paid is modified', async () => {
    const user = userEvent.setup();
    const data = {
      paymentStatus: 'partially_paid',
      totalPrice: 100,
      paidAmount: 50,
    };

    render(
      <PaymentInfoSection
        isEditing={true}
        data={data}
        formatPrice={mockFormatPrice}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const amountInput = inputs[0];
    
    await user.clear(amountInput);
    mockOnDataChange.mockClear();
    await user.type(amountInput, '75');
    
    // Check that onDataChange was called with paidAmount
    const calls = mockOnDataChange.mock.calls.filter(call => call[0] === 'paidAmount');
    expect(calls.length).toBeGreaterThan(0);
  });
});
