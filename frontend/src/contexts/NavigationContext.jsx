import { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext();

export const VIEWS = {
  PRIORITY: 'priority',
  NEW_ORDER: 'new-order',
  DUPLICATE_ORDER: 'duplicate-order',
  ITEMS: 'items',
  HISTORY: 'history',
  SALES: 'sales',
  ORDER_DETAILS: 'order-details',
  EDIT_ORDER: 'edit-order',
};

export function NavigationProvider({ children }) {
  const [currentView, setCurrentView] = useState(VIEWS.PRIORITY);
  const [viewData, setViewData] = useState(null);

  const navigateTo = useCallback((view, data = null) => {
    setCurrentView(view);
    setViewData(data);
  }, []);

  const goBack = useCallback(() => {
    // Default back navigation logic
    if (currentView === VIEWS.ORDER_DETAILS || currentView === VIEWS.EDIT_ORDER) {
      navigateTo(VIEWS.HISTORY);
    } else if (currentView === VIEWS.DUPLICATE_ORDER) {
      navigateTo(VIEWS.NEW_ORDER);
    } else {
      navigateTo(VIEWS.PRIORITY);
    }
  }, [currentView, navigateTo]);

  const value = {
    currentView,
    viewData,
    navigateTo,
    goBack,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
