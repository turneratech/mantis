import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

function BugList({ showMyBugs = false }) {
  const { projectKey } = useParams();
  const [bugs, setBugs] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    priority: '',
    search: ''
  });

  useEffect(() => {
    fetchBugs();
    if (projectKey) {
      fetchProject();
    }
  }, [projectKey, showMyBugs]);

  const fetchProject = async () => {
    try {
      const res = await axios.get('/api/projects');
      const proj = res.data.find(p => p.key.toLowerCase() === projectKey.toLowerCase());
      setProject(proj);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchBugs = async () => {
    try {
      let res;
      if (showMyBugs) {
        res = await axios.get('/api/bugs/my-bugs');
      } else if (projectKey) {
        res = await axios.get(`/api/bugs/project/${projectKey}`);
      } else {
        res = await axios.get('/api/bugs/all');
      }
      setBugs(res.data);
    } catch (error) {
      console.error('Error fetching bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const filteredBugs = bugs.filter(bug => {
    if (filters.status && bug.status !== filters.status) return false;
    if (filters.severity && bug.severity !== filters.severity) return false;
    if (filters.priority && bug.priority !== filters.priority) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!bug.title?.toLowerCase().includes(search) &&
          !bug.bugId?.toLowerCase().includes(search) &&
          !bug.client?.toLowerCase().includes(search) &&
          !bug.module?.toLowerCase().includes(search) &&
          !bug.projectName?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading bugs...</div>;
  }

  const pageTitle = showMyBugs 
    ? 'My Bugs' 
    : project 
      ? `${project.name} - Bugs` 
      : 'All Bugs';

  return (
    <div>
      <div className="page-header">
        <div>
          {projectKey && (
            <Link to="/projects" className="btn btn-secondary btn-sm" style={{ marginBottom: '0.5rem' }}>
              &#8592; Back to Projects
            </Link>
          )}
          <h1 className="page-title">{pageTitle} ({filteredBugs.length})</h1>
        </div>
        {projectKey && (
          <Link to={`/projects/${projectKey}/bugs/new`} className="btn btn-primary">+ New Bug</Link>
        )}
      </div>

      <div className="filters">
        <input
          type="text"
          name="search"
          className="form-control"
          placeholder="Search bugs..."
          value={filters.search}
          onChange={handleFilterChange}
        />
        <select
          name="status"
          className="form-control"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
          <option value="Reopened">Reopened</option>
        </select>
        <select
          name="severity"
          className="form-control"
          value={filters.severity}
          onChange={handleFilterChange}
        >
          <option value="">All Severity</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select
          name="priority"
          className="form-control"
          value={filters.priority}
          onChange={handleFilterChange}
        >
          <option value="">All Priority</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="card">
        {filteredBugs.length === 0 ? (
          <div className="empty-state">
            <h3>No bugs found</h3>
            <p>
              {projectKey 
                ? 'Create your first bug for this project.'
                : 'Try adjusting your filters or create a new bug.'}
            </p>
          </div>
        ) : (
          <table className="bug-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                {!projectKey && <th>Project</th>}
                <th>Status</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Created</th>
                <th>Due/SLA</th>
              </tr>
            </thead>
            <tbody>
              {filteredBugs.map(bug => (
                <tr key={bug.bugId}>
                  <td>
                    <Link 
                      to={`/projects/${bug.projectKey || projectKey}/bugs/${bug.bugId}`} 
                      className="bug-id"
                    >
                      {bug.bugId}
                    </Link>
                  </td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bug.title}
                  </td>
                  {!projectKey && (
                    <td>
                      <Link 
                        to={`/projects/${bug.projectKey}/bugs`}
                        className="project-badge"
                      >
                        {bug.projectKey}
                      </Link>
                    </td>
                  )}
                  <td>
                    <span className={`badge badge-${bug.status?.toLowerCase().replace(' ', '-')}`}>
                      {bug.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${bug.severity?.toLowerCase()}`}>
                      {bug.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${bug.priority?.toLowerCase()}`}>
                      {bug.priority}
                    </span>
                  </td>
                  <td>{bug.assignee || '-'}</td>
                  <td>{formatDate(bug.created)}</td>
                  <td>{bug.dueSLA || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BugList;
