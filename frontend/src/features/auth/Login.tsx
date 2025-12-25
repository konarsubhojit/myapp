import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import PreviewIcon from '@mui/icons-material/Preview';
import { useAuth } from './AuthContext';
import { APP_VERSION } from '../../config/version';

function Login() {
  const { handleGoogleSuccess, handleGoogleError, loading, error, enableGuestMode } = useAuth();

  const onGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      handleGoogleSuccess({ credential: credentialResponse.credential });
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 2,
        }}
        component="output"
        aria-live="polite"
        aria-label="Checking authentication"
      >
        <Card sx={{ maxWidth: 400, width: '100%', p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Checking authentication...
          </Typography>
        </Card>
      </Box>
    );
  }

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
          maxWidth: 400, 
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        aria-labelledby="login-title"
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box textAlign="center" mb={4}>
            <Typography 
              id="login-title"
              variant="h5" 
              component="h1" 
              fontWeight={600} 
              gutterBottom
            >
              Order Management System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to continue
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              role="alert"
            >
              {error}
            </Alert>
          )}

          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center"
            gap={2}
          >
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
            />
            
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PreviewIcon />}
              onClick={enableGuestMode}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'rgba(102, 126, 234, 0.05)',
                }
              }}
            >
              Continue as Guest (View Only)
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography 
            variant="caption" 
            color="text.secondary" 
            display="block" 
            textAlign="center"
          >
            By signing in, you agree to our terms of service and privacy policy.
          </Typography>
          
          <Typography 
            variant="caption" 
            color="text.disabled" 
            display="block" 
            textAlign="center"
            sx={{ mt: 2 }}
          >
            Version {APP_VERSION}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
