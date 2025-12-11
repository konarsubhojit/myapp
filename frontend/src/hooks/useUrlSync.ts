import { useCallback, useMemo } from 'react';

interface UrlSyncResult {
  searchParams: URLSearchParams;
  updateUrl: (params: URLSearchParams, options?: { replace?: boolean }) => void;
  getParam: (key: string, defaultValue?: string) => string;
  getIntParam: (key: string, defaultValue?: number) => number;
  getBoolParam: (key: string, defaultValue?: boolean) => boolean;
}

/**
 * Custom hook for synchronizing component state with URL parameters
 * Uses native browser History API instead of React Router
 */
export const useUrlSync = (): UrlSyncResult => {
  // Get current URL search params
  const searchParams = useMemo(() => {
    return new URLSearchParams(window.location.search);
  }, []);

  const updateUrl = useCallback((
    params: URLSearchParams, 
    options: { replace?: boolean } = { replace: true }
  ): void => {
    const url = new URL(window.location.href);
    url.search = params.toString();
    
    if (options.replace) {
      window.history.replaceState({}, '', url.toString());
    } else {
      window.history.pushState({}, '', url.toString());
    }
  }, []);

  const getParam = useCallback((key: string, defaultValue = ''): string => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? defaultValue;
  }, []);

  const getIntParam = useCallback((key: string, defaultValue = 0): number => {
    const params = new URLSearchParams(window.location.search);
    const value = Number.parseInt(params.get(key) ?? '', 10);
    return Number.isNaN(value) ? defaultValue : value;
  }, []);

  const getBoolParam = useCallback((key: string, defaultValue = false): boolean => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }, []);

  return {
    searchParams,
    updateUrl,
    getParam,
    getIntParam,
    getBoolParam,
  };
};
