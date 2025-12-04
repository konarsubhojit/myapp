import { createContext, useContext, useState } from 'react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
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

  const formatPrice = (amount) => {
    return `${currency.symbol}${amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, currencies: CURRENCIES, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}
