import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ItemPanel from '../../components/ItemPanel';
import * as api from '../../services/api';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../services/api');

const mockItems = [
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
];

const mockDeletedItems = [
  {
    _id: 'item3',
    name: 'Deleted Item',
    price: 150,
    color: 'Green',
    fabric: 'Polyester',
    imageUrl: 'https://example.com/image3.jpg',
    deletedAt: new Date().toISOString(),
  },
];

const mockPaginationResponse = {
  items: mockItems,
  pagination: {
    total: 2,
    page: 1,
    limit: 10,
    pages: 1,
  },
};

const mockDeletedPaginationResponse = {
  items: mockDeletedItems,
  pagination: {
    total: 1,
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
    api.getItems = vi.fn().mockResolvedValue(mockPaginationResponse);
    api.getDeletedItems = vi.fn().mockResolvedValue(mockDeletedPaginationResponse);
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

    it('should render form fields', () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Fabric/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Special Features/i)).toBeInTheDocument();
    });

    it('should render add item button', () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
    });

    it('should display items after loading', async () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      api.getItems = vi.fn().mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display no items message when list is empty', async () => {
      api.getItems = vi.fn().mockResolvedValue({
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
        expect(api.getItems).toHaveBeenCalled();
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
        expect(api.getItems).toHaveBeenCalled();
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
        expect(api.getItems).toHaveBeenCalled();
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
        expect(api.getItems).toHaveBeenCalled();
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
        expect(api.getItems).toHaveBeenCalled();
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
        expect(api.getItems).toHaveBeenCalled();
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

  describe('Item Editing', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Item')).toBeInTheDocument();
    });

    it('should pre-fill edit form with item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test Item 1');
        const priceInput = screen.getByDisplayValue('100');
        const colorInput = screen.getByDisplayValue('Red');
        
        expect(nameInput).toBeInTheDocument();
        expect(priceInput).toBeInTheDocument();
        expect(colorInput).toBeInTheDocument();
      });
    });

    it('should update item successfully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Item 1');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Item');
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(api.updateItem).toHaveBeenCalledWith(
          'item1',
          expect.objectContaining({
            name: 'Updated Item',
          })
        );
      });
      
      expect(mockOnItemsChange).toHaveBeenCalled();
    });

    it('should close edit modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should validate edit form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Item 1');
      await user.clear(nameInput);
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please fill in name and price/i)).toBeInTheDocument();
      });
      
      expect(api.updateItem).not.toHaveBeenCalled();
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

  describe('Item Copy', () => {
    it('should copy item data to form when copy button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
      await user.click(copyButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Item Name/i)).toHaveValue('Test Item 1');
        expect(screen.getByLabelText(/Color/i)).toHaveValue('Red');
        expect(screen.getByLabelText(/Fabric/i)).toHaveValue('Cotton');
      });
    });

    it('should show copy mode notice when item is copied', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
      await user.click(copyButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Creating variant of/i)).toBeInTheDocument();
      });
    });

    it('should cancel copy mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
      await user.click(copyButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Creating variant of/i)).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Creating variant of/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      expect(screen.getByPlaceholderText(/Search by name, color, fabric/i)).toBeInTheDocument();
    });

    it('should update search input value when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      const searchInput = screen.getByPlaceholderText(/Search by name, color, fabric/i);
      await user.type(searchInput, 'test');
      
      expect(searchInput).toHaveValue('test');
    });

    it('should call search when search button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      vi.clearAllMocks();
      
      const searchInput = screen.getByPlaceholderText(/Search by name, color, fabric/i);
      await user.type(searchInput, 'test');
      
      const searchButtons = screen.getAllByRole('button', { name: /Search/i });
      await user.click(searchButtons[0]);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test',
          })
        );
      });
    });

    it('should show clear button when search is active', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const searchInput = screen.getByPlaceholderText(/Search by name, color, fabric/i);
      await user.type(searchInput, 'test');
      
      const searchButtons = screen.getAllByRole('button', { name: /Search/i });
      await user.click(searchButtons[0]);
      
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Clear/i })[0]).toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      vi.clearAllMocks();
      
      const searchInput = screen.getByPlaceholderText(/Search by name, color, fabric/i);
      await user.type(searchInput, 'test');
      
      const searchButtons = screen.getAllByRole('button', { name: /Search/i });
      await user.click(searchButtons[0]);
      
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Clear/i })[0]).toBeInTheDocument();
      });
      
      const clearButton = screen.getAllByRole('button', { name: /Clear/i })[0];
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '',
          })
        );
      });
    });
  });

  describe('Deleted Items', () => {
    it('should toggle deleted items section', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const showDeletedButton = screen.getByRole('button', { name: /Show Deleted/i });
      await user.click(showDeletedButton);
      
      await waitFor(() => {
        expect(api.getDeletedItems).toHaveBeenCalled();
      });
      
      expect(screen.getByText('🗑️ Deleted Items')).toBeInTheDocument();
    });

    it('should restore deleted item', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const showDeletedButton = screen.getByRole('button', { name: /Show Deleted/i });
      await user.click(showDeletedButton);
      
      await waitFor(() => {
        expect(screen.getByText('Deleted Item')).toBeInTheDocument();
      });
      
      const restoreButton = screen.getByRole('button', { name: /Restore/i });
      await user.click(restoreButton);
      
      await waitFor(() => {
        expect(api.restoreItem).toHaveBeenCalledWith('item3');
      });
      
      expect(mockOnItemsChange).toHaveBeenCalled();
    });

    it('should permanently delete item image when confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const showDeletedButton = screen.getByRole('button', { name: /Show Deleted/i });
      await user.click(showDeletedButton);
      
      await waitFor(() => {
        expect(screen.getByText('Deleted Item')).toBeInTheDocument();
      });
      
      const removeImageButton = screen.getByRole('button', { name: /Remove Image/i });
      await user.click(removeImageButton);
      
      await waitFor(() => {
        expect(globalThis.confirm).toHaveBeenCalled();
        expect(api.permanentlyDeleteItem).toHaveBeenCalledWith('item3');
      });
    });

    it('should hide deleted items section when hide button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const showDeletedButton = screen.getByRole('button', { name: /Show Deleted/i });
      await user.click(showDeletedButton);
      
      await waitFor(() => {
        expect(screen.getByText('🗑️ Deleted Items')).toBeInTheDocument();
      });
      
      const hideDeletedButton = screen.getByRole('button', { name: /Hide Deleted/i });
      await user.click(hideDeletedButton);
      
      await waitFor(() => {
        expect(screen.queryByText('🗑️ Deleted Items')).not.toBeInTheDocument();
      });
    });

    it('should show message when no deleted items found', async () => {
      const user = userEvent.setup();
      api.getDeletedItems = vi.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 0 },
      });
      
      renderWithProviders(<ItemPanel onItemsChange={mockOnItemsChange} />);
      
      await waitFor(() => {
        expect(api.getItems).toHaveBeenCalled();
      });
      
      const showDeletedButton = screen.getByRole('button', { name: /Show Deleted/i });
      await user.click(showDeletedButton);
      
      await waitFor(() => {
        expect(screen.getByText('No deleted items found')).toBeInTheDocument();
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
