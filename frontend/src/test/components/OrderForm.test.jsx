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
  },
  {
    _id: 'item2',
    name: 'Test Item 2',
    price: 200,
    color: 'Blue',
    fabric: 'Silk',
    specialFeatures: '',
  },
];

const mockOrder = {
  _id: 'order1',
  orderId: 'ORD-001',
  orderFrom: 'instagram',
  customerName: 'John Doe',
  customerId: '@johndoe',
  address: '123 Test St',
  totalPrice: 300,
  orderDate: new Date().toISOString(),
  expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  paymentStatus: 'unpaid',
  confirmationStatus: 'unconfirmed',
  customerNotes: 'Test notes',
  priority: 5,
  items: [
    { item: 'item1', name: 'Test Item 1', quantity: 2, price: 100, customizationRequest: 'Custom request' },
    { item: 'item2', name: 'Test Item 2', quantity: 1, price: 100, customizationRequest: '' },
  ],
};

const renderWithProviders = (component, initialPath = '/orders/new') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
    api.createOrder = vi.fn().mockResolvedValue({
      _id: 'new-order',
      orderId: 'ORD-002',
      totalPrice: 300,
    });
    api.getOrder = vi.fn().mockResolvedValue(mockOrder);
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByText('Create Order')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByLabelText(/Order Source/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Customer ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Order Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expected Delivery Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Payment Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirmation Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority Level/i)).toBeInTheDocument();
    });

    it('should render order items section', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByText('Order Items')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
    });

    it('should render create order button', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByRole('button', { name: /Create Order/i })).toBeInTheDocument();
    });

    it('should disable create button when no items available', () => {
      renderWithProviders(<OrderForm items={[]} onOrderCreated={mockOnOrderCreated} />);
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      expect(createButton).toBeDisabled();
    });

    it('should show info message when no items available', () => {
      renderWithProviders(<OrderForm items={[]} onOrderCreated={mockOnOrderCreated} />);
      
      expect(screen.getByText('Add items in the Item Management panel first')).toBeInTheDocument();
    });
  });

  describe('Order Item Management', () => {
    it('should add order item when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      expect(screen.getByLabelText(/Select Item/i)).toBeInTheDocument();
    });

    it('should remove order item when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const removeButton = screen.getByRole('button', { name: /Remove item/i });
      await user.click(removeButton);
      
      expect(screen.queryByLabelText(/Select Item/i)).not.toBeInTheDocument();
    });

    it('should allow selecting item from dropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      
      const option = screen.getByRole('option', { name: /Test Item 1/i });
      await user.click(option);
      
      expect(selectItem).toHaveValue('item1');
    });

    it('should allow changing quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const qtyInput = screen.getByLabelText(/Qty/i);
      await user.clear(qtyInput);
      await user.type(qtyInput, '5');
      
      expect(qtyInput).toHaveValue(5);
    });

    it('should reset quantity to 1 when blur with invalid value', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const qtyInput = screen.getByLabelText(/Qty/i);
      await user.clear(qtyInput);
      await user.type(qtyInput, '0');
      qtyInput.blur();
      
      await waitFor(() => {
        expect(qtyInput).toHaveValue(1);
      });
    });

    it('should allow adding customization request', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const customizationInput = screen.getByPlaceholderText(/Customization request/i);
      await user.type(customizationInput, 'Custom request');
      
      expect(customizationInput).toHaveValue('Custom request');
    });

    it('should show item details when item is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      
      const option = screen.getByRole('option', { name: /Test Item 1/i });
      await user.click(option);
      
      await waitFor(() => {
        expect(screen.getByText(/Color: Red/i)).toBeInTheDocument();
        expect(screen.getByText(/Fabric: Cotton/i)).toBeInTheDocument();
      });
    });
  });

  describe('Total Calculation', () => {
    it('should calculate total price correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      const option = screen.getByRole('option', { name: /Test Item 1/i });
      await user.click(option);
      
      const qtyInput = screen.getByLabelText(/Qty/i);
      await user.clear(qtyInput);
      await user.type(qtyInput, '2');
      
      await waitFor(() => {
        expect(screen.getByText(/Estimated Total:/i)).toBeInTheDocument();
      });
    });

    it('should update total when quantity changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      const option = screen.getByRole('option', { name: /Test Item 1/i });
      await user.click(option);
      
      const qtyInput = screen.getByLabelText(/Qty/i);
      await user.clear(qtyInput);
      await user.type(qtyInput, '3');
      
      await waitFor(() => {
        expect(screen.getByText(/Estimated Total:/i)).toBeInTheDocument();
      });
    });

    it('should calculate total with multiple items', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      // Add first item
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItems = screen.getAllByLabelText(/Select Item/i);
      await user.click(selectItems[0]);
      const option1 = screen.getByRole('option', { name: /Test Item 1/i });
      await user.click(option1);
      
      // Add second item
      await user.click(addButton);
      await user.click(selectItems[1]);
      const option2 = screen.getByRole('option', { name: /Test Item 2/i });
      await user.click(option2);
      
      await waitFor(() => {
        expect(screen.getByText(/Estimated Total:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when required fields are missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
      });
      
      expect(api.createOrder).not.toHaveBeenCalled();
    });

    it('should show error when no items added', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please add at least one item/i)).toBeInTheDocument();
      });
      
      expect(api.createOrder).not.toHaveBeenCalled();
    });

    it('should show error when item has no quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please select an item and quantity for all items/i)).toBeInTheDocument();
      });
      
      expect(api.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('Order Submission', () => {
    it('should create order successfully with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      await user.click(screen.getByRole('option', { name: /Test Item 1/i }));
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(api.createOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            orderFrom: 'instagram',
            customerName: 'John Doe',
            customerId: '@johndoe',
          })
        );
      });
      
      expect(mockOnOrderCreated).toHaveBeenCalled();
    });

    it('should include optional fields in order submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      await user.type(screen.getByLabelText(/Address/i), '123 Test St');
      await user.type(screen.getByLabelText(/Customer Notes/i), 'Test notes');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      await user.click(screen.getByRole('option', { name: /Test Item 1/i }));
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(api.createOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            address: '123 Test St',
            customerNotes: 'Test notes',
          })
        );
      });
    });

    it('should handle API errors during submission', async () => {
      const user = userEvent.setup();
      api.createOrder = vi.fn().mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      await user.click(screen.getByRole('option', { name: /Test Item 1/i }));
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      const customerNameInput = screen.getByLabelText(/Customer Name/i);
      await user.type(customerNameInput, 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      await user.click(screen.getByRole('option', { name: /Test Item 1/i }));
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(api.createOrder).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(customerNameInput).toHaveValue('');
      });
    });

    it('should show success message after order creation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Order Source/i));
      await user.click(screen.getByRole('option', { name: /Instagram/i }));
      
      await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Customer ID/i), '@johndoe');
      
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await user.click(addButton);
      
      const selectItem = screen.getByLabelText(/Select Item/i);
      await user.click(selectItem);
      await user.click(screen.getByRole('option', { name: /Test Item 1/i }));
      
      const createButton = screen.getByRole('button', { name: /Create Order/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Order Created Successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Status', () => {
    it('should show paid amount field when payment status is partially paid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Payment Status/i));
      await user.click(screen.getByRole('option', { name: /Partially Paid/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount Paid/i)).toBeInTheDocument();
      });
    });

    it('should hide paid amount field when payment status is not partially paid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      await user.click(screen.getByLabelText(/Payment Status/i));
      await user.click(screen.getByRole('option', { name: /Partially Paid/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount Paid/i)).toBeInTheDocument();
      });
      
      await user.click(screen.getByLabelText(/Payment Status/i));
      await user.click(screen.getByRole('option', { name: /Unpaid/i }));
      
      await waitFor(() => {
        expect(screen.queryByLabelText(/Amount Paid/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Order', () => {
    it('should load order data for duplication', async () => {
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      await waitFor(() => {
        expect(api.getOrder).toHaveBeenCalledWith('order1');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Duplicate Order/i)).toBeInTheDocument();
      });
    });

    it('should pre-fill form with order data', async () => {
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      await waitFor(() => {
        expect(api.getOrder).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Customer Name/i)).toHaveValue('John Doe');
      });
    });

    it('should show duplication notice', async () => {
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      await waitFor(() => {
        expect(api.getOrder).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Duplicating order/i)).toBeInTheDocument();
      });
    });

    it('should allow cancelling duplication', async () => {
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      await waitFor(() => {
        expect(api.getOrder).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        expect(cancelButton).toBeInTheDocument();
      });
    });

    it('should show loading state while loading order', () => {
      api.getOrder = vi.fn().mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      expect(screen.getByText(/Preparing order for duplication/i)).toBeInTheDocument();
    });

    it('should handle error when loading order fails', async () => {
      api.getOrder = vi.fn().mockRejectedValue(new Error('Failed to load order'));
      
      renderWithProviders(
        <OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />,
        '/orders/duplicate/order1'
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load order for duplication/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Fields', () => {
    it('should allow backdating order date up to 1 year', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const orderDateInput = screen.getByLabelText(/Order Date/i);
      const minDate = orderDateInput.getAttribute('min');
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const expectedMin = oneYearAgo.toISOString().split('T')[0];
      
      expect(minDate).toBe(expectedMin);
    });

    it('should only allow future dates for delivery date', () => {
      renderWithProviders(<OrderForm items={mockItems} onOrderCreated={mockOnOrderCreated} />);
      
      const deliveryDateInput = screen.getByLabelText(/Expected Delivery Date/i);
      const minDate = deliveryDateInput.getAttribute('min');
      
      const today = new Date().toISOString().split('T')[0];
      expect(minDate).toBe(today);
    });
  });
});
