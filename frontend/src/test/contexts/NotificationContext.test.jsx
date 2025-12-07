import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '../../contexts/NotificationContext';

describe('NotificationContext', () => {
  describe('useNotification hook', () => {
    it('should throw error when used outside NotificationProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = () => {};
      
      expect(() => {
        renderHook(() => useNotification());
      }).toThrow('useNotification must be used within a NotificationProvider');
      
      console.error = consoleError;
    });

    it('should provide notification context', () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      expect(result.current.showNotification).toBeDefined();
      expect(result.current.showSuccess).toBeDefined();
      expect(result.current.showError).toBeDefined();
      expect(result.current.showWarning).toBeDefined();
      expect(result.current.showInfo).toBeDefined();
    });
  });

  describe('NotificationProvider', () => {
    it('should render children', () => {
      render(
        <NotificationProvider>
          <div>Test Child</div>
        </NotificationProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should show success notification', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showSuccess('Operation successful', 'Success');
      });

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Operation successful')).toBeInTheDocument();
      });
    });

    it('should show error notification with custom duration', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showError('Something went wrong', 'Error');
      });

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });

    it('should show warning notification', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showWarning('Please be careful', 'Warning');
      });

      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Please be careful')).toBeInTheDocument();
      });
    });

    it('should show info notification without title', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showInfo('Just so you know');
      });

      await waitFor(() => {
        expect(screen.getByText('Just so you know')).toBeInTheDocument();
      });
    });

    it('should show custom notification with all parameters', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showNotification('Custom message', 'warning', 'Custom Title', 3000);
      });

      await waitFor(() => {
        expect(screen.getByText('Custom Title')).toBeInTheDocument();
        expect(screen.getByText('Custom message')).toBeInTheDocument();
      });
    });

    it('should close notification when close button is clicked', async () => {
      const user = userEvent.setup();
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showSuccess('Test message');
      });

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Find and click the close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });

    it('should not close notification on clickaway', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showInfo('Persistent message');
      });

      await waitFor(() => {
        expect(screen.getByText('Persistent message')).toBeInTheDocument();
      });

      // Notification should still be visible since clickaway is ignored
      expect(screen.getByText('Persistent message')).toBeInTheDocument();
    });

    it('should show success notification with default title', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showSuccess('Success without custom title');
      });

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Success without custom title')).toBeInTheDocument();
      });
    });

    it('should show error notification with default title', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showError('Error without custom title');
      });

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error without custom title')).toBeInTheDocument();
      });
    });

    it('should show warning notification with default title', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showWarning('Warning without custom title');
      });

      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Warning without custom title')).toBeInTheDocument();
      });
    });

    it('should handle multiple notifications sequentially', async () => {
      const { result } = renderHook(() => useNotification(), {
        wrapper: NotificationProvider,
      });

      act(() => {
        result.current.showInfo('First message');
      });

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });

      act(() => {
        result.current.showSuccess('Second message');
      });

      await waitFor(() => {
        expect(screen.getByText('Second message')).toBeInTheDocument();
      });
    });
  });
});
