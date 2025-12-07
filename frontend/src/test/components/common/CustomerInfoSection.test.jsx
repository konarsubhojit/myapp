import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomerInfoSection from '../../../components/common/CustomerInfoSection';

describe('CustomerInfoSection', () => {
  const mockData = {
    customerName: 'John Doe',
    customerId: 'CUST123',
    address: '123 Main St',
  };

  const mockOnDataChange = vi.fn();

  it('should render customer info in display mode', () => {
    render(
      <CustomerInfoSection
        isEditing={false}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('CUST123')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('should render editable fields in edit mode', () => {
    render(
      <CustomerInfoSection
        isEditing={true}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(3);
    expect(inputs[0]).toHaveValue('John Doe');
    expect(inputs[1]).toHaveValue('CUST123');
    expect(inputs[2]).toHaveValue('123 Main St');
  });

  it('should call onDataChange when customer name is changed', async () => {
    const user = userEvent.setup();
    render(
      <CustomerInfoSection
        isEditing={true}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs[0]; // First input is customer name
    
    await user.type(nameInput, 'X');
    
    // Verify the callback was called with customerName key
    const calls = mockOnDataChange.mock.calls.filter(call => call[0] === 'customerName');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][1]).toContain('X');
  });

  it('should call onDataChange when customer ID is changed', async () => {
    const user = userEvent.setup();
    render(
      <CustomerInfoSection
        isEditing={true}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    const idInput = inputs[1]; // Second input is customer ID
    
    await user.type(idInput, 'Y');
    
    // Verify the callback was called with customerId key
    const calls = mockOnDataChange.mock.calls.filter(call => call[0] === 'customerId');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][1]).toContain('Y');
  });

  it('should mark fields as required in edit mode', () => {
    render(
      <CustomerInfoSection
        isEditing={true}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    
    // Should have 3 fields: customerName, customerId, and address
    expect(inputs).toHaveLength(3);
    
    // Only customerName and customerId are required, address is optional
    expect(inputs[0]).toBeRequired(); // customerName
    expect(inputs[1]).toBeRequired(); // customerId
    expect(inputs[2]).not.toBeRequired(); // address is optional
  });

  it('should call onDataChange when address is changed', async () => {
    const user = userEvent.setup();
    render(
      <CustomerInfoSection
        isEditing={true}
        data={mockData}
        onDataChange={mockOnDataChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    const addressInput = inputs[2]; // Third input is address
    
    await user.type(addressInput, 'Z');
    
    // Verify the callback was called with address key
    const calls = mockOnDataChange.mock.calls.filter(call => call[0] === 'address');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][1]).toContain('Z');
  });

  it('should hide address in display mode when not provided', () => {
    const dataWithoutAddress = {
      customerName: 'Jane Doe',
      customerId: 'CUST456',
    };
    
    render(
      <CustomerInfoSection
        isEditing={false}
        data={dataWithoutAddress}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('CUST456')).toBeInTheDocument();
    expect(screen.queryByText('Address:')).not.toBeInTheDocument();
  });
});
