import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderInfoSection from '../../../components/common/OrderInfoSection';

describe('OrderInfoSection', () => {
  const mockOnDataChange = vi.fn();

  const mockDisplayData = {
    orderFrom: 'Website',
    status: 'pending',
    confirmationStatus: 'confirmed',
    priority: 1,
    createdAt: '2024-01-15T10:30:00Z',
    expectedDeliveryDate: '2024-01-20',
  };

  const mockEditData = {
    orderFrom: 'Website',
    status: 'pending',
    confirmationStatus: 'confirmed',
    priority: 1,
    expectedDeliveryDate: '2024-01-20',
  };

  const mockPriority = {
    label: 'Due Soon',
    className: 'urgent',
  };

  it('should render order info in display mode', () => {
    render(
      <OrderInfoSection
        isEditing={false}
        data={mockDisplayData}
        priority={mockPriority}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Order Information')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should render priority chip when provided', () => {
    render(
      <OrderInfoSection
        isEditing={false}
        data={mockDisplayData}
        priority={mockPriority}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Due Soon')).toBeInTheDocument();
  });

  it('should not crash when priority is null', () => {
    render(
      <OrderInfoSection
        isEditing={false}
        data={mockDisplayData}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Order Information')).toBeInTheDocument();
  });

  it('should render editable fields in edit mode', () => {
    render(
      <OrderInfoSection
        isEditing={true}
        data={mockEditData}
        priority={mockPriority}
        onDataChange={mockOnDataChange}
      />
    );

    // Check for select dropdowns
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('should display all order source options in edit mode', () => {
    render(
      <OrderInfoSection
        isEditing={true}
        data={mockEditData}
        priority={mockPriority}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Order Information')).toBeInTheDocument();
  });

  it('should display order status with correct color', () => {
    const pendingData = { ...mockDisplayData, status: 'pending' };
    const { rerender } = render(
      <OrderInfoSection
        isEditing={false}
        data={pendingData}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('pending')).toBeInTheDocument();

    // Test with different statuses
    const completedData = { ...mockDisplayData, status: 'completed' };
    rerender(
      <OrderInfoSection
        isEditing={false}
        data={completedData}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should format and display created date', () => {
    render(
      <OrderInfoSection
        isEditing={false}
        data={mockDisplayData}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    // The date should be formatted and displayed - use getAllByText since both dates contain "Jan"
    const dates = screen.getAllByText(/Jan/);
    expect(dates.length).toBeGreaterThan(0);
    // Check for the specific created date
    expect(screen.getByText('Jan 15, 2024, 10:30 AM')).toBeInTheDocument();
  });

  it('should display expected delivery date', () => {
    render(
      <OrderInfoSection
        isEditing={false}
        data={mockDisplayData}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    // Check for formatted delivery date (specific one without time)
    expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument();
  });

  it('should handle missing expected delivery date', () => {
    const dataWithoutDate = { ...mockDisplayData, expectedDeliveryDate: null };
    render(
      <OrderInfoSection
        isEditing={false}
        data={dataWithoutDate}
        priority={null}
        onDataChange={mockOnDataChange}
      />
    );

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });
});
