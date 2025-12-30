import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import MultiSelect from './MultiSelect';
import FileUpload from './FileUpload';
import AttachmentList from './AttachmentList';
import { useAuth } from '../App';

function BugForm() {
  const { projectKey, bugId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(bugId);
  
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [bugReporter, setBugReporter] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: '',
    module: '',
    environment: 'Development',
    severity: 'Medium',
    priority: 'Medium',
    status: 'Open',
    assignee: '',
    targetFixVersion: '',
    dueSLA: '',
    attachmentLinks: '',
    qaOwner: '',
    qaStatus: 'Not Started',
    closureReason: '',
    arb: []
  });

  useEffect(() => {
    fetchInitialData();
  }, [projectKey, bugId]);

  const fetchInitialData = async () => {
    try {
      const usersRes = await axios.get('/api/auth/users');
      setUsers(usersRes.data);

      const projectsRes = await axios.get('/api/projects');
      const proj = projectsRes.data.find(p => p.key.toLowerCase() === projectKey.toLowerCase());
      setProject(proj);

      if (isEditing) {
        const bugRes = await axios.get(`/api/bugs/${projectKey}/${bugId}`);
        const bugData = bugRes.data;
        
        setFormData({
          title: bugData.title || '',
          description: bugData.description || '',
          client: bugData.client || '',
          module: bugData.module || '',
          environment: bugData.environment || 'Development',
          severity: bugData.severity || 'Medium',
          priority: bugData.priority || 'Medium',
          status: bugData.status || 'Open',
          assignee: bugData.assignee || '',
          targetFixVersion: bugData.targetFixVersion || '',
          dueSLA: bugData.dueSLA || '',
          attachmentLinks: bugData.attachmentLinks || '',
          qaOwner: bugData.qaOwner || '',
          qaStatus: bugData.qaStatus || 'Not Started',
          closureReason: bugData.closureReason || '',
          arb: bugData.arb || []
        });
        
        setBugReporter(bugData.reporter || '');
        
        // Try to get attachments from bug data first
        let existingAttachments = bugData.attachments ? 
          (typeof bugData.attachments === 'string' ? JSON.parse(bugData.attachments) : bugData.attachments) : [];
        
        // If no attachments in bug data, fetch from attachments API
        if (existingAttachments.length === 0) {
          try {
            const attachRes = await axios.get(`/api/attachments/${bugId}`);
            if (attachRes.data && attachRes.data.attachments) {
              existingAttachments = attachRes.data.attachments;
            }
          } catch (attachErr) {
            console.log('Could not fetch attachments:', attachErr.message);
          }
        }
        
        setAttachments(existingAttachments);
        
      } else if (proj) {
        setFormData(prev => ({
          ...prev,
          client: proj.client || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load data');
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

  // Called when files are uploaded
  const handleUploadComplete = (uploadedFiles) => {
    setAttachments(prev => [...prev, ...uploadedFiles]);
  };

  // Called when attachment is deleted
  const handleDeleteAttachment = (deletedAttachment) => {
    setAttachments(prev => prev.filter(a => a.id !== deletedAttachment.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isEditing) {
        await axios.put(`/api/bugs/${projectKey}/${bugId}`, formData);
        navigate(`/projects/${projectKey}/bugs/${bugId}`);
      } else {
        const res = await axios.post(`/api/bugs/${projectKey}`, formData);
        // Navigate to edit mode so user can add attachments
        navigate(`/projects/${projectKey}/bugs/${res.data.bugId}/edit`);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save bug');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Check if user can delete attachments
  const canDeleteAttachments = user?.role === 'admin' || user?.username === bugReporter;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link 
            to={`/projects/${projectKey}/bugs`} 
            className="btn btn-secondary btn-sm" 
            style={{ marginBottom: '0.5rem' }}
          >
            ← Back
          </Link>
          <h1 className="page-title">
            {isEditing ? `Edit ${bugId}` : `New Bug in ${project?.name || projectKey}`}
          </h1>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief description of the bug"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description, steps to reproduce, expected vs actual behavior..."
              rows="5"
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
              <label className="form-label">Module</label>
              <input
                type="text"
                name="module"
                className="form-control"
                value={formData.module}
                onChange={handleChange}
                placeholder="Application module"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Environment</label>
              <select
                name="environment"
                className="form-control"
                value={formData.environment}
                onChange={handleChange}
              >
                <option value="Development">Development</option>
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
                <option value="Testing">Testing</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select
                name="severity"
                className="form-control"
                value={formData.severity}
                onChange={handleChange}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                name="priority"
                className="form-control"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {isEditing && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-control"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Reopened">Reopened</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select
                name="assignee"
                className="form-control"
                value={formData.assignee}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.username}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">QA Owner</label>
              <select
                name="qaOwner"
                className="form-control"
                value={formData.qaOwner}
                onChange={handleChange}
              >
                <option value="">None</option>
                {users.map(u => (
                  <option key={u.id} value={u.username}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">QA Status</label>
              <select
                name="qaStatus"
                className="form-control"
                value={formData.qaStatus}
                onChange={handleChange}
              >
                <option value="Not Started">Not Started</option>
                <option value="Testing">Testing</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* ARB Multi-Select */}
          <div className="form-group">
            <label className="form-label">Action Required By (ARB)</label>
            <MultiSelect
              options={users.map(u => u.username)}
              selected={formData.arb}
              onChange={(newArb) => setFormData({ ...formData, arb: newArb })}
              placeholder="Search and select users..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Fix Version</label>
              <input
                type="text"
                name="targetFixVersion"
                className="form-control"
                value={formData.targetFixVersion}
                onChange={handleChange}
                placeholder="e.g., v1.2.0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Due/SLA Date</label>
              <input
                type="date"
                name="dueSLA"
                className="form-control"
                value={formData.dueSLA}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">External Links</label>
            <textarea
              name="attachmentLinks"
              className="form-control"
              value={formData.attachmentLinks}
              onChange={handleChange}
              placeholder="Paste URLs or references to related documents"
              rows="2"
            />
          </div>

          {/* ATTACHMENTS SECTION */}
          <div className="attachments-section">
            <label className="form-label">
              Attachments
              {attachments.length > 0 && (
                <span className="attachment-count">{attachments.length}</span>
              )}
            </label>
            
            {/* Show existing attachments */}
            <AttachmentList
              bugId={bugId}
              attachments={attachments}
              onDelete={handleDeleteAttachment}
              canDelete={canDeleteAttachments}
            />
            
            {/* Upload button */}
            <FileUpload
              bugId={bugId}
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {isEditing && formData.status === 'Closed' && (
            <div className="form-group">
              <label className="form-label">Closure Reason</label>
              <select
                name="closureReason"
                className="form-control"
                value={formData.closureReason}
                onChange={handleChange}
              >
                <option value="">Select reason</option>
                <option value="Fixed">Fixed</option>
                <option value="Won't Fix">Won't Fix</option>
                <option value="Duplicate">Duplicate</option>
                <option value="Cannot Reproduce">Cannot Reproduce</option>
                <option value="By Design">By Design</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEditing ? 'Update Bug' : 'Create Bug')}
            </button>
            <Link 
              to={`/projects/${projectKey}/bugs`} 
              className="btn btn-secondary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BugForm;

