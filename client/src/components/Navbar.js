import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import HelpModal from './HelpModal';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  const helpButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
  };

  return (
    <>
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
          {/* Help Button - Opens Modal */}
          <button 
            style={helpButtonStyle}
            onClick={() => setShowHelp(true)}
            onMouseOver={e => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={e => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
            }}
            title="User Manual & Help"
          >
            <span style={{ fontSize: '1rem' }}>📖</span>
            <span>Help</span>
          </button>
          
          <span className="user-info">
            {user?.username} 
            <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
              {user?.role}
            </span>
          </span>
          <Link to="/change-password" className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} title="Change Password">
            🔒
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}

export default Navbar;
