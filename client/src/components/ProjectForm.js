import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function ProjectForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(projectId);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    client: '',
    status: 'active',
    members: []
  });

  useEffect(() => {
    fetchUsers();
    if (isEditing) {
      fetchProject();
    }
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}`);
      setFormData({
        name: res.data.name || '',
        key: res.data.key || '',
        description: res.data.description || '',
        client: res.data.client || '',
        status: res.data.status || 'active',
        members: res.data.members || []
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate key from name if not editing and key field not touched
      ...(name === 'name' && !isEditing ? {
        key: value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5)
      } : {})
    }));
  };

  const handleMemberToggle = (username) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(username)
        ? prev.members.filter(m => m !== username)
        : [...prev.members, username]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isEditing) {
        await axios.put(`/api/projects/${projectId}`, formData);
        navigate(`/projects/${projectId}`);
      } else {
        const res = await axios.post('/api/projects', formData);
        navigate(`/projects/${res.data.key}/bugs`);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save project');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEditing ? 'Edit Project' : 'Create New Project'}</h1>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Bug Tracker System"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Project Key *</label>
              <input
                type="text"
                name="key"
                className="form-control"
                value={formData.key}
                onChange={handleChange}
                placeholder="e.g., BTS"
                maxLength="5"
                required
                disabled={isEditing}
                style={{ textTransform: 'uppercase' }}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Used as prefix for bug IDs (e.g., BTS-0001)
              </small>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the project..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client</label>
              <input
                type="text"
                name="client"
                className="form-control"
                value={formData.client}
                onChange={handleChange}
                placeholder="Client name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Team Members</label>
            <div className="member-selector">
              {users.map(user => (
                <label key={user.id} className="member-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.members.includes(user.username)}
                    onChange={() => handleMemberToggle(user.username)}
                  />
                  <span className="member-avatar small">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                  <span>{user.username}</span>
                  <span className="member-role">({user.role})</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project')}
            </button>
            <Link to="/projects" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;
