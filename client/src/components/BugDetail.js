import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import AttachmentList from './AttachmentList';

function BugDetail() {
  const { projectKey, bugId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetchBug();
  }, [projectKey, bugId]);

  const fetchBug = async () => {
    try {
      const res = await axios.get(`/api/bugs/${projectKey}/${bugId}`);
      const bugData = res.data;
      setBug(bugData);
      
      // Parse attachments
      const bugAttachments = bugData.attachments ? 
        (typeof bugData.attachments === 'string' ? JSON.parse(bugData.attachments) : bugData.attachments) : [];
      setAttachments(bugAttachments);
      
      // AUTO-REDIRECT TO EDIT MODE if bug is not Closed
      // This ensures bugs always open in edit mode unless they're closed
      if (bugData.status !== 'Closed') {
        navigate(`/projects/${projectKey}/bugs/${bugId}/edit`, { replace: true });
        return;
      }
      
    } catch (error) {
      console.error('Error fetching bug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await axios.put(`/api/bugs/${projectKey}/${bugId}`, { status: newStatus });
      setBug(res.data);
      
      // If reopened, redirect to edit mode
      if (newStatus !== 'Closed') {
        navigate(`/projects/${projectKey}/bugs/${bugId}/edit`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/bugs/${projectKey}/${bugId}/comment`, { comment });
      setBug(res.data);
      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this bug?')) return;

    try {
      await axios.delete(`/api/bugs/${projectKey}/${bugId}`);
      navigate(`/projects/${projectKey}/bugs`);
    } catch (error) {
      console.error('Error deleting bug:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  if (loading) {
    return <div className="loading">Loading bug details...</div>;
  }

  if (!bug) {
    return (
      <div className="empty-state">
        <h3>Bug not found</h3>
        <Link to={`/projects/${projectKey}/bugs`} className="btn btn-primary">Back to Bugs</Link>
      </div>
    );
  }

  // This view is only shown for CLOSED bugs
  // Non-closed bugs are auto-redirected to edit mode
  return (
    <div>
      <div className="bug-detail-header">
        <div className="bug-detail-title">
          <Link to={`/projects/${projectKey}/bugs`} className="btn btn-secondary btn-sm">← Back</Link>
          <span className="project-badge">{projectKey}</span>
          <h1>{bug.bugId}: {bug.title}</h1>
          <span className={`badge badge-${bug.status?.toLowerCase().replace(' ', '-')}`}>
            {bug.status}
          </span>
          {bug.status === 'Closed' && (
            <span className="badge" style={{ backgroundColor: '#6c757d', marginLeft: '0.5rem' }}>
              Read-Only
            </span>
          )}
        </div>
        <div className="bug-detail-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => handleStatusChange('Reopened')}
          >
            Reopen Bug
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Basic Info</h3>
          <div className="detail-item">
            <span className="detail-label">Project</span>
            <span className="detail-value">{bug.projectName || projectKey}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Client</span>
            <span className="detail-value">{bug.client || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Module</span>
            <span className="detail-value">{bug.module || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Environment</span>
            <span className="detail-value">{bug.environment || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Target Version</span>
            <span className="detail-value">{bug.targetFixVersion || '-'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3>Priority & Severity</h3>
          <div className="detail-item">
            <span className="detail-label">Severity</span>
            <span className={`badge badge-${bug.severity?.toLowerCase()}`}>{bug.severity}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Priority</span>
            <span className={`badge badge-${bug.priority?.toLowerCase()}`}>{bug.priority}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Due/SLA</span>
            <span className="detail-value">{bug.dueSLA || '-'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3>Assignment</h3>
          <div className="detail-item">
            <span className="detail-label">Reporter</span>
            <span className="detail-value">{bug.reporter}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Assignee</span>
            <span className="detail-value">{bug.assignee || 'Unassigned'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">QA Owner</span>
            <span className="detail-value">{bug.qaOwner || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">QA Status</span>
            <span className={`badge badge-${bug.qaStatus?.toLowerCase().replace(' ', '-')}`}>
              {bug.qaStatus}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Action Required By</span>
            <span className="detail-value">
              {bug.arb && bug.arb.length > 0 ? (
                <div className="arb-badges">
                  {bug.arb.map((person, idx) => (
                    <span key={idx} className="arb-badge">{person}</span>
                  ))}
                </div>
              ) : (
                '-'
              )}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h3>Dates</h3>
          <div className="detail-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(bug.created)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Updated</span>
            <span className="detail-value">{formatDate(bug.lastUpdated)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Closed Date</span>
            <span className="detail-value">{formatDate(bug.closedDate)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Closure Reason</span>
            <span className="detail-value">{bug.closureReason || '-'}</span>
          </div>
        </div>

        <div className="detail-section description-section">
          <h3>Description</h3>
          <div className="description-content">
            {bug.description || 'No description provided.'}
          </div>
        </div>

        {bug.attachmentLinks && (
          <div className="detail-section">
            <h3>External Links</h3>
            <div className="description-content">
              {bug.attachmentLinks}
            </div>
          </div>
        )}
      </div>

      {/* FILE ATTACHMENTS - Click to open in browser */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📎 Attachments
          {attachments.length > 0 && (
            <span style={{
              backgroundColor: 'var(--primary-color, #4a90e2)',
              color: 'white',
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '10px'
            }}>
              {attachments.length}
            </span>
          )}
        </h3>
        <AttachmentList
          bugId={bugId}
          attachments={attachments}
          canDelete={false}  // Read-only for closed bugs
        />
      </div>

      {/* Activity Log */}
      <div className="activity-section">
        <h2>Activity Log</h2>
        <div className="card">
          <div className="activity-list">
            {bug.activityLog?.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p>No activity yet</p>
              </div>
            ) : (
              [...(bug.activityLog || [])].reverse().map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-avatar">
                    {getInitials(activity.user)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-user">{activity.user}</span>
                      <span className="activity-time">{formatDate(activity.timestamp)}</span>
                    </div>
                    <div className={`activity-message ${activity.action === 'comment' ? 'comment' : ''} ${activity.action === 'commit' ? 'commit' : ''}`}>
                      {activity.action === 'comment' ? activity.message : 
                       activity.action === 'commit' ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: activity.message.replace(
                            /(https?:\/\/[^\s]+)/g, 
                            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                          )
                        }} />
                      ) : (
                        <em>{activity.message}</em>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Form - disabled for closed bugs */}
          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              className="form-control"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BugDetail;
