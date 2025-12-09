import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ItemPanel from '../../components/ItemPanel';
import * as api from '../../services/api';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../services/api');

const mockPaginationResponse = {
  items: [
    {
      _id: 'item1',
      name: 'Test Item 1',
      price: 100,
      color: 'Red',
      fabric: 'Cotton',
      specialFeatures: 'Handmade',
      imageUrl: 'https://example.com/image1.jpg',
    },
    {
      _id: 'item2',
      name: 'Test Item 2',
      price: 200,
      color: 'Blue',
      fabric: 'Silk',
      specialFeatures: '',
      imageUrl: null,
    },
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 10,
    pages: 1,
  },
};

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        <CurrencyProvider>{component}</CurrencyProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('ItemPanel', () => {
  const mockOnItemsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getItemsPaginated = vi.fn().mockResolvedValue(mockPaginationResponse);
    api.getDeletedItemsPaginated = vi.fn().mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10, pages: 0 },
    });
    api.createItem = vi.fn().mockResolvedValue({ _id: 'new-item', name: 'New Item', price: 50 });
    api.updateItem = vi.fn().mockResolvedValue({ _id: 'item1', name: 'Updated Item', price: 150 });
    api.deleteItem = vi.fn().mockResolvedValue({ success: true });
    api.restoreItem = vi.fn().mockResolvedValue({ success: true });
    api.permanentlyDeleteItem = vi.fn().mockResolvedValue({ success: true });
    
    // Mock global confirm
    globalThis.confirm = vi.fn().mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('should render the component with title', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByText('Item Management')).toBeInTheDocument();
      expect(screen.getByText('Available Items')).toBeInTheDocument();
    });

    it('should render form fields', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Fabric/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Special Features/i)).toBeInTheDocument();
    });

    it('should render add item button', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });
    });

    it('should display items after loading', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      api.getItemsPaginated = vi.fn().mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display no items message when list is empty', async () => {
      api.getItemsPaginated = vi.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 0 },
      });
      
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should create a new item successfully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      const nameInput = screen.getByLabelText(/Item Name/i);
      const priceInput = screen.getByLabelText(/Price/i);
      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      
      await user.type(nameInput, 'New Item');
      await user.type(priceInput, '50');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(api.createItem).toHaveBeenCalled();
      });
      
      expect(mockOnItemsChange).toHaveBeenCalled();
    });

    it('should create item with all fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      await user.type(screen.getByLabelText(/Item Name/i), 'Full Item');
      await user.type(screen.getByLabelText(/Price/i), '100');
      await user.type(screen.getByLabelText(/Color/i), 'Red');
      await user.type(screen.getByLabelText(/Fabric/i), 'Cotton');
      await user.type(screen.getByLabelText(/Special Features/i), 'Embroidered');
      
      await user.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(api.createItem).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Full Item',
            price: 100,
            color: 'Red',
            fabric: 'Cotton',
            specialFeatures: 'Embroidered',
          })
        );
      });
    });

    it('should show error when name is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      const priceInput = screen.getByLabelText(/Price/i);
      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      
      await user.type(priceInput, '50');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please fill in name and price/i)).toBeInTheDocument();
      });
      
      expect(api.createItem).not.toHaveBeenCalled();
    });

    it('should show error when price is invalid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      await user.type(screen.getByLabelText(/Item Name/i), 'Test Item');
      await user.type(screen.getByLabelText(/Price/i), '-10');
      await user.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid price/i)).toBeInTheDocument();
      });
      
      expect(api.createItem).not.toHaveBeenCalled();
    });

    it('should handle API errors during creation', async () => {
      const user = userEvent.setup();
      api.createItem = vi.fn().mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      await user.type(screen.getByLabelText(/Item Name/i), 'Test Item');
      await user.type(screen.getByLabelText(/Price/i), '50');
      await user.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });
    });

    it('should reset form after successful creation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
      
      const nameInput = screen.getByLabelText(/Item Name/i);
      const priceInput = screen.getByLabelText(/Price/i);
      
      await user.type(nameInput, 'New Item');
      await user.type(priceInput, '50');
      await user.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(api.createItem).toHaveBeenCalled();
      });
      
      expect(nameInput).toHaveValue('');
      expect(priceInput).toHaveValue(null);
    });
  });

  describe('Item Deletion', () => {
    it('should delete item when confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(api.deleteItem).toHaveBeenCalledWith('item1');
      });
      
      expect(mockOnItemsChange).toHaveBeenCalled();
    });

    it('should not delete item when cancelled', async () => {
      const user = userEvent.setup();
      globalThis.confirm = vi.fn().mockReturnValue(false);
      
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);
      
      expect(api.deleteItem).not.toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by name, color, fabric/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should render pagination controls', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument();
    });
  });
});
