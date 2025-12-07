import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlSync } from '../../hooks/useUrlSync';

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('useUrlSync', () => {
  it('should provide URL sync utilities', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    expect(result.current.searchParams).toBeDefined();
    expect(result.current.updateUrl).toBeDefined();
    expect(result.current.getParam).toBeDefined();
    expect(result.current.getIntParam).toBeDefined();
    expect(result.current.getBoolParam).toBeDefined();
  });

  it('should get param with default value when not set', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getParam('missing', 'default');
    expect(value).toBe('default');
  });

  it('should get param value when set', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?test=value']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getParam('test');
    expect(value).toBe('value');
  });

  it('should get int param with default value when not set', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getIntParam('page', 1);
    expect(value).toBe(1);
  });

  it('should get int param value when set', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?page=5']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getIntParam('page', 1);
    expect(value).toBe(5);
  });

  it('should return default for invalid int param', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?page=invalid']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getIntParam('page', 1);
    expect(value).toBe(1);
  });

  it('should get bool param with default value when not set', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getBoolParam('active', false);
    expect(value).toBe(false);
  });

  it('should get bool param as true when set to "true"', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?active=true']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getBoolParam('active', false);
    expect(value).toBe(true);
  });

  it('should get bool param as false when set to "false"', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?active=false']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getBoolParam('active', true);
    expect(value).toBe(false);
  });

  it('should get bool param as false for any other value', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?active=yes']}>
          {children}
        </MemoryRouter>
      )
    });

    const value = result.current.getBoolParam('active', true);
    expect(value).toBe(false);
  });

  it('should update URL with new params', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    act(() => {
      result.current.updateUrl({ test: 'value', page: '2' });
    });

    expect(result.current.getParam('test')).toBe('value');
    expect(result.current.getParam('page')).toBe('2');
  });

  it('should update URL with replace option by default', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    act(() => {
      result.current.updateUrl({ first: 'value1' });
    });

    act(() => {
      result.current.updateUrl({ second: 'value2' });
    });

    expect(result.current.getParam('first')).toBeNull();
    expect(result.current.getParam('second')).toBe('value2');
  });

  it('should handle multiple params', () => {
    const { result } = renderHook(() => useUrlSync(), { 
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?page=1&limit=10&sort=name']}>
          {children}
        </MemoryRouter>
      )
    });

    expect(result.current.getIntParam('page')).toBe(1);
    expect(result.current.getIntParam('limit')).toBe(10);
    expect(result.current.getParam('sort')).toBe('name');
  });

  it('should return null for getParam when param is not set and no default provided', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getParam('missing');
    expect(value).toBeNull();
  });

  it('should return 0 for getIntParam when param is not set and no default provided', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getIntParam('missing');
    expect(value).toBe(0);
  });

  it('should return false for getBoolParam when param is not set and no default provided', () => {
    const { result } = renderHook(() => useUrlSync(), { wrapper });

    const value = result.current.getBoolParam('missing');
    expect(value).toBe(false);
  });
});
