import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  });

  // Check if current user is godmode
  const isGodMode = currentUser?.role === 'godmode';
  
  // Check if current user has elevated privileges
  const hasElevatedPrivileges = currentUser?.role === 'godmode' || currentUser?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        axios.get('/api/auth/users'),
        axios.get('/api/projects')
      ]);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation: Only godmode can create godmode/admin users
    if (!isGodMode && (formData.role === 'godmode' || formData.role === 'admin')) {
      setError('Only super users can create admin or super user accounts');
      return;
    }

    try {
      await axios.post('/api/auth/register', formData);
      setShowModal(false);
      setFormData({ username: '', password: '', role: 'user' });
      fetchData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (userId, userRole, username) => {
    // Prevent deletion of godmode users by non-godmode users
    if (userRole === 'godmode' && !isGodMode) {
      alert('Only super users can delete other super user accounts');
      return;
    }
    
    // Prevent deletion of the default admin by regular admins
    if (username === 'admin' && !isGodMode) {
      alert('The default admin account cannot be deleted');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/auth/users/${userId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const openProjectModal = (user) => {
    setSelectedUser(user);
    setShowProjectModal(true);
  };

  const handleProjectAssignment = async (projectId, isAssigned) => {
    if (!selectedUser) return;

    try {
      if (isAssigned) {
        await axios.delete(`/api/projects/${projectId}/members/${selectedUser.username}`);
      } else {
        await axios.post(`/api/projects/${projectId}/members`, {
          username: selectedUser.username
        });
      }
      fetchData();
    } catch (error) {
      console.error('Error updating project assignment:', error);
    }
  };

  const getUserProjects = (username) => {
    return projects.filter(p => p.members?.includes(username));
  };

  // Get badge class for role
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'godmode':
        return 'badge-godmode';
      case 'admin':
        return 'badge-critical';
      default:
        return 'badge-medium';
    }
  };

  // Get display name for role
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'godmode':
        return '⚡ GOD MODE';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  // Check if user can be deleted
  const canDeleteUser = (targetUser) => {
    // Godmode users can delete anyone except themselves
    if (isGodMode) {
      return targetUser.id !== currentUser.id;
    }
    // Admins can only delete regular users
    if (currentUser?.role === 'admin') {
      return targetUser.role === 'user' && targetUser.username !== 'admin';
    }
    return false;
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management ({users.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

      <div className="card">
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Projects</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const userProjects = getUserProjects(user.username);
              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.username}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {userProjects.length > 0 ? (
                        userProjects.map(p => (
                          <span key={p.id} className="project-badge">{p.key}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>No projects</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openProjectModal(user)}
                      >
                        Assign Projects
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(user.id, user.role, user.username)}
                        disabled={!canDeleteUser(user)}
                        title={!canDeleteUser(user) ? 'Cannot delete this user' : 'Delete user'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New User</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  {/* Only godmode users can create admin/godmode users */}
                  {isGodMode && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="godmode">⚡ God Mode (Super User)</option>
                    </>
                  )}
                </select>
                {!isGodMode && (
                  <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Only super users can create admin accounts
                  </small>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {showProjectModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Projects to {selectedUser.username}</h2>
            <div className="project-assignment-list">
              {projects.map(project => {
                const isAssigned = project.members?.includes(selectedUser.username);
                return (
                  <label key={project.id} className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => handleProjectAssignment(project.id, isAssigned)}
                    />
                    <span className="project-badge">{project.key}</span>
                    <span>{project.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowProjectModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
