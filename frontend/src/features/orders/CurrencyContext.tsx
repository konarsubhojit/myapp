import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, type ReactElement } from 'react';
import type { Currency } from '../../types';

const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
];

// Get default currency from environment variable or fallback to INR
const DEFAULT_CURRENCY_CODE = import.meta.env.VITE_DEFAULT_CURRENCY || 'INR';

interface CurrencyContextType {
  currency: Currency;
  currencies: Currency[];
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  readonly children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps): ReactElement {
  // Find currency from environment variable or fallback to first currency
  const defaultCurrency = CURRENCIES.find(c => c.code === DEFAULT_CURRENCY_CODE) || CURRENCIES[0];
  if (!defaultCurrency) {
    throw new Error('No currencies available');
  }
  const [currency] = useState<Currency>(defaultCurrency);

  const formatPrice = useCallback((amount: number): string => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    }).format(amount);
  }, [currency]);

  const contextValue = useMemo((): CurrencyContextType => ({
    currency,
    currencies: CURRENCIES,
    formatPrice
  }), [currency, formatPrice]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}
