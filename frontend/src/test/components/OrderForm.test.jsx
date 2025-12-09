import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderForm from '../../components/OrderForm';
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

const renderWithProviders = (component, initialRoute = '/orders/new') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <NotificationProvider>
        <CurrencyProvider>
          <Routes>
            <Route path="/orders/new" element={component} />
            <Route path="/orders/duplicate/:orderId" element={component} />
          </Routes>
        </CurrencyProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('OrderForm', () => {
  const mockOnOrderCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component with title', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByRole('heading', { name: 'Create Order' })).toBeInTheDocument();
    });

    it('should render with no items available message', () => {
      renderWithProviders(<OrderForm items={[]} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByText('Add items in the Item Management panel first')).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByLabelText(/Order Source/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Customer ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Order Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expected Delivery Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirmation Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Payment Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority Level/i)).toBeInTheDocument();
    });

    it('should render order items section', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByText('Order Items')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByRole('button', { name: /Create Order/i })).toBeInTheDocument();
    });

    it('should disable submit button when no items available', () => {
      renderWithProviders(<OrderForm items={[]} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByRole('button', { name: /Create Order/i })).toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('should add an item to the order when Add Item button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      // Should show item selection dropdown
      expect(screen.getByLabelText(/Select Item/i)).toBeInTheDocument();
    });

    it('should allow adding multiple items', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      
      // Add first item
      await user.click(addButton);
      await waitFor(() => {
        expect(screen.getAllByLabelText(/Select Item/i)).toHaveLength(1);
      });
      
      // Add second item
      await user.click(addButton);
      await waitFor(() => {
        expect(screen.getAllByLabelText(/Select Item/i)).toHaveLength(2);
      });
    });

    it('should remove an item from the order when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Select Item/i)).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: /Remove item/i });
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.queryByLabelText(/Select Item/i)).not.toBeInTheDocument();
      });
    });

    it('should update customer name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const customerNameInput = screen.getByLabelText(/Customer Name/i);
      await user.type(customerNameInput, 'John Doe');
      
      expect(customerNameInput).toHaveValue('John Doe');
    });

    it('should update order source field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const orderSourceSelect = screen.getByLabelText(/Order Source/i);
      await user.click(orderSourceSelect);
      
      const instagramOption = screen.getByRole('option', { name: /Instagram/i });
      await user.click(instagramOption);
      
      await waitFor(() => {
        expect(orderSourceSelect).toHaveTextContent('Instagram');
      });
    });

    it('should show paid amount field when payment status is partially_paid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const paymentStatusSelect = screen.getByLabelText(/Payment Status/i);
      await user.click(paymentStatusSelect);
      
      const partiallyPaidOption = screen.getByRole('option', { name: /Partially Paid/i });
      await user.click(partiallyPaidOption);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount Paid/i)).toBeInTheDocument();
      });
    });
  });
});
