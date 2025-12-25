import { type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import BlockIcon from '@mui/icons-material/Block';

interface ForbiddenPageProps {
  readonly onRetry?: () => void;
  readonly message?: string;
}

function ForbiddenPage({ onRetry, message }: ForbiddenPageProps): ReactElement {
  const defaultMessage = 'Access denied. You do not have permission to access this application. Please contact an administrator if you believe this is an error.';
  
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500, 
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        role="alert"
        aria-live="assertive"
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Box 
            sx={{ 
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <BlockIcon 
              sx={{ 
                fontSize: 80,
                color: 'error.main',
              }}
              aria-hidden="true"
            />
          </Box>
          
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight={600} 
            gutterBottom
            color="error.main"
          >
            403 - Access Denied
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            {message || defaultMessage}
          </Typography>
          
          {onRetry && (
            <Button
              variant="contained"
              onClick={onRetry}
              sx={{
                bgcolor: '#5568d3',
                '&:hover': {
                  bgcolor: '#4556b8',
                }
              }}
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default ForbiddenPage;
