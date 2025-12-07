import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { CurrencyProvider, useCurrency } from '../../contexts/CurrencyContext';

describe('CurrencyContext', () => {
  describe('useCurrency hook', () => {
    it('should throw error when used outside CurrencyProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = () => {};
      
      expect(() => {
        renderHook(() => useCurrency());
      }).toThrow('useCurrency must be used within a CurrencyProvider');
      
      console.error = consoleError;
    });

    it('should provide currency context', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      expect(result.current.currency).toBeDefined();
      expect(result.current.setCurrency).toBeDefined();
      expect(result.current.currencies).toBeDefined();
      expect(result.current.formatPrice).toBeDefined();
    });
  });

  describe('CurrencyProvider', () => {
    it('should render children', () => {
      render(
        <CurrencyProvider>
          <div>Test Child</div>
        </CurrencyProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should default to INR currency', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      expect(result.current.currency.code).toBe('INR');
      expect(result.current.currency.symbol).toBe('₹');
      expect(result.current.currency.name).toBe('Indian Rupee');
      expect(result.current.currency.locale).toBe('en-IN');
    });

    it('should provide list of available currencies', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      expect(result.current.currencies).toHaveLength(5);
      expect(result.current.currencies[0].code).toBe('INR');
      expect(result.current.currencies[1].code).toBe('USD');
      expect(result.current.currencies[2].code).toBe('EUR');
      expect(result.current.currencies[3].code).toBe('GBP');
      expect(result.current.currencies[4].code).toBe('JPY');
    });

    it('should allow changing currency', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const usdCurrency = result.current.currencies.find(c => c.code === 'USD');

      act(() => {
        result.current.setCurrency(usdCurrency);
      });

      expect(result.current.currency.code).toBe('USD');
      expect(result.current.currency.symbol).toBe('$');
    });

    it('should format prices correctly for INR', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const formatted = result.current.formatPrice(1000);
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('₹');
    });

    it('should format prices correctly for USD', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const usdCurrency = result.current.currencies.find(c => c.code === 'USD');

      act(() => {
        result.current.setCurrency(usdCurrency);
      });

      const formatted = result.current.formatPrice(1000.50);
      expect(formatted).toContain('1,000.50');
      expect(formatted).toContain('$');
    });

    it('should format prices correctly for JPY (no decimals)', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const jpyCurrency = result.current.currencies.find(c => c.code === 'JPY');

      act(() => {
        result.current.setCurrency(jpyCurrency);
      });

      const formatted = result.current.formatPrice(1000);
      expect(formatted).toContain('1,000');
      expect(formatted).not.toContain('.00');
    });

    it('should format prices correctly for EUR', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const eurCurrency = result.current.currencies.find(c => c.code === 'EUR');

      act(() => {
        result.current.setCurrency(eurCurrency);
      });

      const formatted = result.current.formatPrice(1000);
      expect(formatted).toContain('1');
      expect(formatted).toContain('€');
    });

    it('should format prices correctly for GBP', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const gbpCurrency = result.current.currencies.find(c => c.code === 'GBP');

      act(() => {
        result.current.setCurrency(gbpCurrency);
      });

      const formatted = result.current.formatPrice(1000);
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('£');
    });

    it('should update formatPrice when currency changes', () => {
      const { result } = renderHook(() => useCurrency(), {
        wrapper: CurrencyProvider,
      });

      const formattedInr = result.current.formatPrice(100);
      expect(formattedInr).toContain('₹');

      const usdCurrency = result.current.currencies.find(c => c.code === 'USD');

      act(() => {
        result.current.setCurrency(usdCurrency);
      });

      const formattedUsd = result.current.formatPrice(100);
      expect(formattedUsd).toContain('$');
      expect(formattedUsd).not.toContain('₹');
    });
  });
});
