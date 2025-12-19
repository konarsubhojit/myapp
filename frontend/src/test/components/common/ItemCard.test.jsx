import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '../../../components/common/ItemCard';

describe('ItemCard', () => {
  const mockItem = {
    _id: '123',
    name: 'Test Item',
    price: 29.99,
    fabric: 'Cotton',
    specialFeatures: 'Handmade',
    imageUrl: 'https://example.com/image.jpg',
  };

  const mockFormatPrice = vi.fn((price) => `$${price.toFixed(2)}`);
  const mockOnCopy = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  it('should render item with all details', () => {
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('Cotton')).toBeInTheDocument();
    expect(screen.getByText('Handmade')).toBeInTheDocument();
  });

  it('should render item without image', () => {
    const itemWithoutImage = { ...mockItem, imageUrl: null };
    render(
      <ItemCard
        item={itemWithoutImage}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('should render item without optional fields', () => {
    const minimalItem = {
      _id: '123',
      name: 'Minimal Item',
      price: 10.00,
    };
    
    render(
      <ItemCard
        item={minimalItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Minimal Item')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('should call onCopy when copy button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy test item/i });
    await user.click(copyButton);
    
    expect(mockOnCopy).toHaveBeenCalledWith(mockItem);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit test item/i });
    await user.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete test item/i });
    await user.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledWith('123', 'Test Item');
  });

  it('should not render copy button when onCopy is not provided', () => {
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('should not render edit button when onEdit is not provided', () => {
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should not render delete button when onDelete is not provided', () => {
    render(
      <ItemCard
        item={mockItem}
        formatPrice={mockFormatPrice}
        onCopy={mockOnCopy}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
