import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UrlSyncResult {
  searchParams: URLSearchParams;
  updateUrl: (params: Record<string, string>, options?: { replace?: boolean }) => void;
  getParam: (key: string, defaultValue?: string) => string;
  getIntParam: (key: string, defaultValue?: number) => number;
  getBoolParam: (key: string, defaultValue?: boolean) => boolean;
}

/**
 * Custom hook for synchronizing component state with URL parameters
 */
export const useUrlSync = (): UrlSyncResult => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateUrl = useCallback((
    params: Record<string, string>, 
    options: { replace?: boolean } = { replace: true }
  ): void => {
    setSearchParams(params, options);
  }, [setSearchParams]);

  const getParam = useCallback((key: string, defaultValue = ''): string => {
    return searchParams.get(key) ?? defaultValue;
  }, [searchParams]);

  const getIntParam = useCallback((key: string, defaultValue = 0): number => {
    const value = Number.parseInt(searchParams.get(key) ?? '', 10);
    return Number.isNaN(value) ? defaultValue : value;
  }, [searchParams]);

  const getBoolParam = useCallback((key: string, defaultValue = false): boolean => {
    const value = searchParams.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }, [searchParams]);

  return {
    searchParams,
    updateUrl,
    getParam,
    getIntParam,
    getBoolParam,
  };
};
