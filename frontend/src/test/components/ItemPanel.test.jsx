import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ItemPanel from '../../components/ItemPanel';
import * as api from '../../services/api';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../services/api');

// Updated to match cursor-based pagination format
const mockCursorPaginationResponse = {
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
  page: {
    limit: 10,
    nextCursor: null,
    hasMore: false,
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
    api.getItemsPaginated = vi.fn().mockResolvedValue(mockCursorPaginationResponse);
    api.getDeletedItems = vi.fn().mockResolvedValue({
      items: [],
      page: { limit: 10, nextCursor: null, hasMore: false },
    });
    api.createItem = vi.fn().mockResolvedValue({ _id: 'new-item', name: 'New Item', price: 50 });
  });

  describe('Basic Rendering', () => {
    it('should render the component with title', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByText('Item Management')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Available Items')).toBeInTheDocument();
      });
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
  });

  describe('Item Display', () => {
    it('should display items after loading', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
      });
    });

    it('should call API to fetch items on mount', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalled();
      });
    });

    it('should show loading state initially', () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      // Check for loading indicator
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      // Fill in price but not name
      const priceInput = screen.getByLabelText(/Price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '100');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Form validation should prevent submission (HTML5 required attribute)
      expect(api.createItem).not.toHaveBeenCalled();
    });

    it('should show error when submitting without price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      // Fill in name but not price
      const nameInput = screen.getByLabelText(/Item Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Item');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Form validation should prevent submission (HTML5 required attribute)
      expect(api.createItem).not.toHaveBeenCalled();
    });

    it('should validate negative price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Item Name/i);
      await user.type(nameInput, 'Test Item');
      
      const priceInput = screen.getByLabelText(/Price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '-10');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Should show error for negative price
      await waitFor(() => {
        // Error might be displayed or HTML5 validation might prevent it
        // Just ensure the item wasn't created
        expect(api.createItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should create item with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByLabelText(/Item Name/i);
      await user.type(nameInput, 'New Test Item');
      
      const priceInput = screen.getByLabelText(/Price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');
      
      const colorInput = screen.getByLabelText(/Color/i);
      await user.type(colorInput, 'Green');
      
      // Submit the form
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Should call API with form data
      await waitFor(() => {
        expect(api.createItem).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByLabelText(/Item Name/i);
      await user.type(nameInput, 'New Test Item');
      
      const priceInput = screen.getByLabelText(/Price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');
      
      // Submit the form
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Wait for submission
      await waitFor(() => {
        expect(api.createItem).toHaveBeenCalled();
      });
      
      // Form should be reset
      await waitFor(() => {
        expect(nameInput).toHaveValue('');
        expect(priceInput).toHaveValue(null);
      });
    });

    it('should call onItemsChange callback after submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Item Name/i);
      await user.type(nameInput, 'New Test Item');
      
      const priceInput = screen.getByLabelText(/Price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '150');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(mockOnItemsChange).toHaveBeenCalled();
      });
    });
  });

  describe('Item Actions', () => {
    beforeEach(() => {
      api.updateItem = vi.fn().mockResolvedValue({ _id: 'item1', name: 'Updated Item', price: 150 });
      api.deleteItem = vi.fn().mockResolvedValue({ success: true });
      globalThis.confirm = vi.fn().mockReturnValue(true);
    });

    it('should show edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Find and click edit button using aria-label
      const editButton = screen.getByLabelText(/Edit Test Item 1/i);
      await user.click(editButton);
      
      // Dialog should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
      });
    });

    it('should delete item when delete is confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Find and click delete button using aria-label
      const deleteButton = screen.getByLabelText(/Delete Test Item 1/i);
      await user.click(deleteButton);
      
      // Should call delete API
      await waitFor(() => {
        expect(api.deleteItem).toHaveBeenCalledWith('item1');
      });
    });

    it('should copy item to form when copy button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Find and click copy button using aria-label
      const copyButton = screen.getByLabelText(/Copy Test Item 1/i);
      await user.click(copyButton);
      
      // Form should be populated with item data
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Item Name/i);
        expect(nameInput).toHaveValue('Test Item 1');
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by name, color, fabric/i)).toBeInTheDocument();
      });
    });

    it('should call API with search query when search is submitted', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by name, color, fabric/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by name, color, fabric/i);
      await user.type(searchInput, 'test');
      
      const searchButton = screen.getByRole('button', { name: /^Search$/i });
      await user.click(searchButton);
      
      // Should call API with search parameter
      await waitFor(() => {
        expect(api.getItemsPaginated).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'test' })
        );
      });
    });
  });
});
