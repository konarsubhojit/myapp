import React, { Component, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import rollbar from './rollbar';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    rollbar.error('React ErrorBoundary caught an error', error, { info });
  }

  handleReset = (): void => {
    // Reload the page to reset the application state
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={2}
          p={3}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            We're sorry for the inconvenience. The error has been logged and we'll look into it.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleReset}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
