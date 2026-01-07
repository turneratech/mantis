import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ProjectForm from './components/ProjectForm';
import BugList from './components/BugList';
import BugDetail from './components/BugDetail';
import BugForm from './components/BugForm';
import UserManagement from './components/UserManagement';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChangePassword from './components/ChangePassword';
import ReportGenerator from './components/ReportGenerator';


// For subdirectory deployment
axios.defaults.baseURL = '/bugtracker';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper function to check if user has elevated privileges
const hasElevatedPrivileges = (user) => {
  return user && (user.role === 'godmode' || user.role === 'admin');
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // adminOnly routes are accessible by both admin and godmode roles
  if (adminOnly && !hasElevatedPrivileges(user)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <BrowserRouter basename="/bugtracker">
        <div className="app">
          {user && <Navbar />}
          <main className="main-content">
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              
              {/* Dashboard - AdminDashboard for godmode/admin, regular Dashboard for users */}
              <Route path="/" element={
                <ProtectedRoute>
                  {hasElevatedPrivileges(user) ? <AdminDashboard /> : <Dashboard />}
                </ProtectedRoute>
              } />

              {/* Projects */}
              <Route path="/projects" element={
                <ProtectedRoute>
                  <ProjectList />
                </ProtectedRoute>
              } />
              <Route path="/projects/new" element={
                <ProtectedRoute adminOnly>
                  <ProjectForm />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId" element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/edit" element={
                <ProtectedRoute adminOnly>
                  <ProjectForm />
                </ProtectedRoute>
              } />

              {/* Bugs */}
              <Route path="/projects/:projectKey/bugs" element={
                <ProtectedRoute>
                  <BugList />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectKey/bugs/new" element={
                <ProtectedRoute>
                  <BugForm />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectKey/bugs/:bugId" element={
                <ProtectedRoute>
                  <BugDetail />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectKey/bugs/:bugId/edit" element={
                <ProtectedRoute>
                  <BugForm />
                </ProtectedRoute>
              } />

              {/* My Bugs */}
              <Route path="/my-bugs" element={
                <ProtectedRoute>
                  <BugList showMyBugs />
                </ProtectedRoute>
              } />

              {/* User Management - accessible by admin and godmode */}
              <Route path="/users" element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              } />
              
              {/* Change Password */}
              <Route path="/change-password" element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              } />

              {/* Report Generator - accessible by admin and godmode */}
              <Route path="/reports" element={
                <ProtectedRoute adminOnly>
                  <ReportGenerator />
                </ProtectedRoute>
              } />

            </Routes>
          </main>
          {user && <Footer />}
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
