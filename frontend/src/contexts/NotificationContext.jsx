import { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Slide from '@mui/material/Slide';

const NotificationContext = createContext(null);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    title: '',
    severity: 'info', // 'success' | 'error' | 'warning' | 'info'
    autoHideDuration: 6000,
  });

  const showNotification = useCallback((message, severity = 'info', title = '', autoHideDuration = 6000) => {
    setNotification({
      open: true,
      message,
      title,
      severity,
      autoHideDuration,
    });
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    showNotification(message, 'success', title);
  }, [showNotification]);

  const showError = useCallback((message, title = 'Error') => {
    showNotification(message, 'error', title, 8000);
  }, [showNotification]);

  const showWarning = useCallback((message, title = 'Warning') => {
    showNotification(message, 'warning', title);
  }, [showNotification]);

  const showInfo = useCallback((message, title = '') => {
    showNotification(message, 'info', title);
  }, [showNotification]);

  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ 
          '& .MuiAlert-root': { 
            minWidth: '300px',
            maxWidth: '500px',
          }
        }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
          role="alert"
          aria-live="polite"
        >
          {notification.title && <AlertTitle>{notification.title}</AlertTitle>}
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
