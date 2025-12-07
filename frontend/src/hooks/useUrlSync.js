import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for synchronizing component state with URL parameters
 * @returns {Object} - URL synchronization utilities
 */
export const useUrlSync = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateUrl = useCallback((params, options = { replace: true }) => {
    setSearchParams(params, options);
  }, [setSearchParams]);

  const getParam = useCallback((key, defaultValue = null) => {
    return searchParams.get(key) || defaultValue;
  }, [searchParams]);

  const getIntParam = useCallback((key, defaultValue = 0) => {
    const value = Number.parseInt(searchParams.get(key), 10);
    return Number.isNaN(value) ? defaultValue : value;
  }, [searchParams]);

  const getBoolParam = useCallback((key, defaultValue = false) => {
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
