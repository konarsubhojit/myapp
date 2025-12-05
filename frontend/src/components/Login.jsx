import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function Login() {
  const { handleGoogleSuccess, handleGoogleError, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-loading">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Order Management System</h1>
          <p>Sign in to continue</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="login-buttons">
          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
            />
          </div>
        </div>

        <div className="login-footer">
          <p>
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
