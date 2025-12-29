import React, { useState } from 'react';
import { useAuth } from '../App';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="login-title">
          <img src="/bugtracker/imgs/logo_small.png" alt="BugTracker" style={{ height: '100px', marginBottom: '10px' }} />
          <h1>BugTracker</h1>
          <p>Sign in to your account</p>
        </div>

        {/* Confidentiality Notice */}
        <div className="confidentiality-notice">
          <p>⚠️ <strong>CONFIDENTIAL SYSTEM</strong></p>
          <p>This system is the property of Greenfield Oil and Trading Services. 
             Authorized users only. All activities are monitored and logged.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="powered-by-login">
          Powered by <a href="https://turneratech.com" target="_blank" rel="noopener noreferrer">TurneraTech.com</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
