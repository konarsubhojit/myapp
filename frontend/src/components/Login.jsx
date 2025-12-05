import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function Login() {
  const { loginWithMicrosoft, loading, error } = useAuth();

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
          <button
            className="login-button microsoft"
            onClick={loginWithMicrosoft}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 21 21"
            >
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
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
