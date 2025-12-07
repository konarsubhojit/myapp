import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginationControls from '../../../components/common/PaginationControls';

describe('PaginationControls', () => {
  const mockPaginationData = {
    page: 2,
    limit: 10,
    total: 50,
    totalPages: 5,
  };

  const mockOnPageChange = vi.fn();
  const mockOnLimitChange = vi.fn();

  it('should render pagination controls with correct data', () => {
    render(
      <PaginationControls
        paginationData={mockPaginationData}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    expect(screen.getByText('Page 2 of 5 (50 items)')).toBeInTheDocument();
  });

  it('should call onPageChange when page is changed', async () => {
    const user = userEvent.setup();
    render(
      <PaginationControls
        paginationData={mockPaginationData}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    const nextButton = screen.getByRole('button', { name: /go to next page/i });
    await user.click(nextButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onLimitChange when page size is changed', async () => {
    const user = userEvent.setup();
    render(
      <PaginationControls
        paginationData={mockPaginationData}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    const select = screen.getByRole('combobox', { name: /per page/i });
    await user.click(select);
    
    const option20 = screen.getByRole('option', { name: '20' });
    await user.click(option20);
    
    expect(mockOnLimitChange).toHaveBeenCalledWith(20);
  });

  it('should render with small size variant', () => {
    render(
      <PaginationControls
        paginationData={mockPaginationData}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
        size="small"
      />
    );

    expect(screen.getByText('Page 2 of 5 (50 items)')).toBeInTheDocument();
  });

  it('should handle edge case with no pages', () => {
    const emptyData = {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

    render(
      <PaginationControls
        paginationData={emptyData}
        onPageChange={mockOnPageChange}
        onLimitChange={mockOnLimitChange}
      />
    );

    // When there are no pages, we show "Page 1 of 1" (not 0) for better UX
    expect(screen.getByText('Page 1 of 1 (0 items)')).toBeInTheDocument();
  });
});
