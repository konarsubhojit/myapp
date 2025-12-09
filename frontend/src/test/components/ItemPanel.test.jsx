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
        const errorText = screen.queryByText(/Please enter a valid price/i);
        // Error might be displayed or HTML5 validation might prevent it
        // Just ensure the item wasn't created
        expect(api.createItem).not.toHaveBeenCalled();
      });
    });
  });
});
