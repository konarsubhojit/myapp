import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../../ErrorBoundary';
import rollbar from '../../rollbar';

vi.mock('../../rollbar', () => ({
  default: {
    error: vi.fn(),
  },
}));

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: vi.fn() } as any;

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry for the inconvenience/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('logs error to Rollbar when error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(rollbar.error).toHaveBeenCalledWith(
      'React ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({ info: expect.any(Object) })
    );
  });

  it('reloads the page when Try Again button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click Try Again button
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainButton);

    // Verify window.location.reload was called
    expect(window.location.reload).toHaveBeenCalled();
  });
});
