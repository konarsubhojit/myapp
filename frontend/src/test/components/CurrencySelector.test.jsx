import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurrencySelector from '../../components/CurrencySelector';
import { useCurrency } from '../../contexts/CurrencyContext';

vi.mock('../../contexts/CurrencyContext');

describe('CurrencySelector', () => {
  const mockSetCurrency = vi.fn();
  const mockCurrencies = [
    { code: 'USD', symbol: '$', rate: 1 },
    { code: 'EUR', symbol: '€', rate: 0.85 },
    { code: 'GBP', symbol: '£', rate: 0.73 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({
      currency: { code: 'USD', symbol: '$', rate: 1 },
      setCurrency: mockSetCurrency,
      currencies: mockCurrencies,
    });
  });

  it('should render currency selector with label', () => {
    render(<CurrencySelector />);
    expect(screen.getByLabelText('Currency:')).toBeInTheDocument();
  });

  it('should display all currency options', () => {
    render(<CurrencySelector />);
    
    expect(screen.getByRole('option', { name: '$ USD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '€ EUR' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '£ GBP' })).toBeInTheDocument();
  });

  it('should show current selected currency', () => {
    render(<CurrencySelector />);
    const select = screen.getByLabelText('Currency:');
    expect(select.value).toBe('USD');
  });

  it('should call setCurrency when selection changes', async () => {
    const user = userEvent.setup();
    render(<CurrencySelector />);
    
    const select = screen.getByLabelText('Currency:');
    await user.selectOptions(select, 'EUR');
    
    expect(mockSetCurrency).toHaveBeenCalledWith({ code: 'EUR', symbol: '€', rate: 0.85 });
  });

  it('should render with default currency selected', () => {
    render(<CurrencySelector />);
    
    const select = screen.getByLabelText('Currency:');
    expect(select.value).toBe('USD');
    expect(mockSetCurrency).not.toHaveBeenCalled();
  });
});
