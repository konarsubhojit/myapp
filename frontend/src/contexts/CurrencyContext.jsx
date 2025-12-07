import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
];

const CurrencyContext = createContext(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(CURRENCIES[0]); // INR as default

  const formatPrice = useCallback((amount) => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    }).format(amount);
  }, [currency]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    currencies: CURRENCIES,
    formatPrice
  }), [currency, setCurrency, formatPrice]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
