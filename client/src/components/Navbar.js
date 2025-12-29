import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src="/bugtracker/imgs/logo_small.png" alt="BugTracker" style={{ height: '28px', marginRight: '8px', verticalAlign: 'middle' }} />
        BugTracker
      </Link>
      
      <div className="navbar-nav">
        <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </Link>
        <Link to="/projects" className={isActive('/projects')}>
          Projects
        </Link>
        <Link to="/my-bugs" className={isActive('/my-bugs')}>
          My Bugs
        </Link>
        {user?.role === 'admin' && (
          <Link to="/users" className={isActive('/users')}>
            Users
          </Link>
        )}
      </div>

      <div className="navbar-user">
        <span className="user-info">
          {user?.username} 
          <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
            {user?.role}
          </span>
        </span>
        <Link to="/change-password" className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }}>
          🔑
        </Link>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
