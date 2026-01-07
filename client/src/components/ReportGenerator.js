import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

function ReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: getDefaultStartDate('weekly'),
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  function getDefaultStartDate(type) {
    const today = new Date();
    if (type === 'weekly') {
      today.setDate(today.getDate() - 7);
    } else {
      today.setMonth(today.getMonth() - 1);
    }
    return today.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setDateRange({
      startDate: getDefaultStartDate(reportType),
      endDate: new Date().toISOString().split('T')[0]
    });
  }, [reportType]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(res.data);
      setSelectedProjects(res.data.map(p => p.projectKey || p.key));
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/analytics/report-data', {
        reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        projects: selectedProjects
      });
      setReportData(res.data);
      setPreviewMode(true);
    } catch (error) {
      console.error('Error fetching report data:', error);
      alert('Failed to generate report preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const res = await axios.post('/api/analytics/generate-report', {
        reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        projects: selectedProjects,
        reportData
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `BugTracker_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const COLORS = {
    status: ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280'],
    severity: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
    priority: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
    chart: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const safeNum = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return 0;
  };

  const toggleProject = (projectKey) => {
    if (selectedProjects.includes(projectKey)) {
      setSelectedProjects(selectedProjects.filter(p => p !== projectKey));
    } else {
      setSelectedProjects([...selectedProjects, projectKey]);
    }
  };

  return (
    <div className="report-generator">
      <div className="dashboard-header">
        <h1>📊 Report Generator</h1>
        <p>Generate comprehensive weekly or monthly reports for project management</p>
      </div>

      {/* Configuration Panel */}
      <div className="card report-config">
        <h3 className="card-title">Report Configuration</h3>
        
        <div className="config-grid">
          <div className="config-section">
            <label>Report Type</label>
            <div className="report-type-selector">
              <button 
                className={`type-btn ${reportType === 'weekly' ? 'active' : ''}`}
                onClick={() => setReportType('weekly')}
              >
                📅 Weekly Report
              </button>
              <button 
                className={`type-btn ${reportType === 'monthly' ? 'active' : ''}`}
                onClick={() => setReportType('monthly')}
              >
                🗓️ Monthly Report
              </button>
            </div>
          </div>

          <div className="config-section">
            <label>Date Range</label>
            <div className="date-range">
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
              <span>to</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
            </div>
          </div>

          <div className="config-section">
            <label>Projects to Include</label>
            <div className="project-selector">
              {projects.map(project => (
                <label key={project.id} className="project-checkbox">
                  <input 
                    type="checkbox"
                    checked={selectedProjects.includes(project.projectKey || project.key)}
                    onChange={() => toggleProject(project.projectKey || project.key)}
                  />
                  <span className="project-badge">{project.projectKey || project.key}</span>
                  <span className="project-name">{project.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="config-actions">
          <button 
            className="btn btn-primary btn-lg"
            onClick={fetchReportData}
            disabled={loading || selectedProjects.length === 0}
          >
            {loading ? '⏳ Generating Preview...' : '👁️ Generate Preview'}
          </button>
          {reportData && (
            <button 
              className="btn btn-success btn-lg"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? '⏳ Generating PDF...' : '📥 Download PDF Report'}
            </button>
          )}
        </div>
      </div>

      {/* Report Preview */}
      {previewMode && reportData && (
        <div className="report-preview">
          <div className="preview-header">
            <h2>📋 Report Preview</h2>
            <span className="preview-badge">
              {reportType === 'weekly' ? 'Weekly' : 'Monthly'} Report: {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </span>
          </div>

          {/* Executive Summary */}
          <div className="card summary-card">
            <h3>📌 Executive Summary</h3>
            <div className="summary-content">
              <div className="summary-metrics">
                <div className="summary-metric">
                  <span className="metric-value">{safeNum(reportData.summary?.totalBugsCreated)}</span>
                  <span className="metric-label">Bugs Filed</span>
                </div>
                <div className="summary-metric success">
                  <span className="metric-value">{safeNum(reportData.summary?.totalBugsResolved)}</span>
                  <span className="metric-label">Bugs Resolved</span>
                </div>
                <div className="summary-metric warning">
                  <span className="metric-value">{safeNum(reportData.summary?.netChange)}</span>
                  <span className="metric-label">Net Change</span>
                </div>
                <div className="summary-metric">
                  <span className="metric-value">{safeNum(reportData.summary?.avgResolutionTime)}d</span>
                  <span className="metric-label">Avg Resolution</span>
                </div>
                <div className="summary-metric critical">
                  <span className="metric-value">{safeNum(reportData.summary?.criticalBugs)}</span>
                  <span className="metric-label">Critical Bugs</span>
                </div>
                <div className="summary-metric">
                  <span className="metric-value">
                    {reportData.summary?.resolutionRate ? `${reportData.summary.resolutionRate.toFixed(1)}%` : '0%'}
                  </span>
                  <span className="metric-label">Resolution Rate</span>
                </div>
              </div>
              <div className="summary-text">
                <p><strong>Period:</strong> {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}</p>
                <p><strong>Projects Covered:</strong> {selectedProjects.join(', ')}</p>
                <p><strong>Highlights:</strong> {reportData.summary?.highlights || 'No significant highlights for this period.'}</p>
              </div>
            </div>
          </div>

          {/* ARB Rate Trend */}
          <div className="card chart-card">
            <h3>📈 Bug Resolution Rate (ARB) Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={reportData.arbTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="created" fill="#3b82f6" name="Bugs Created" />
                <Bar yAxisId="left" dataKey="resolved" fill="#10b981" name="Bugs Resolved" />
                <Line yAxisId="right" type="monotone" dataKey="resolutionRate" stroke="#f59e0b" strokeWidth={2} name="Resolution Rate %" dot={{ fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bug Filed vs Resolved per Project */}
          <div className="card chart-card">
            <h3>📊 Bug Filed vs Resolved per Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.projectComparison || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="projectName" stroke="#94a3b8" width={120} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Bar dataKey="created" fill="#3b82f6" name="Bugs Filed" />
                <Bar dataKey="resolved" fill="#10b981" name="Bugs Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Assignee Performance */}
          <div className="card">
            <h3>👥 Assignee Bug Resolution Status</h3>
            <table className="bug-table report-table">
              <thead>
                <tr>
                  <th>Assignee</th>
                  <th>Assigned</th>
                  <th>Resolved</th>
                  <th>Open</th>
                  <th>In Progress</th>
                  <th>Resolution Rate</th>
                  <th>Avg Resolution Time</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.assigneePerformance || []).map((user, idx) => (
                  <tr key={idx}>
                    <td><strong>{user.username}</strong></td>
                    <td>{safeNum(user.assigned)}</td>
                    <td className="text-success">{safeNum(user.resolved)}</td>
                    <td className="text-warning">{safeNum(user.open)}</td>
                    <td>{safeNum(user.inProgress)}</td>
                    <td>
                      <span className={`rate-badge ${user.resolutionRate >= 70 ? 'good' : user.resolutionRate >= 40 ? 'medium' : 'low'}`}>
                        {user.resolutionRate?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td>{user.avgResolutionTime ? `${user.avgResolutionTime.toFixed(1)}d` : '-'}</td>
                    <td>
                      <div className="performance-bar">
                        <div 
                          className="performance-fill" 
                          style={{ 
                            width: `${Math.min(user.resolutionRate || 0, 100)}%`,
                            backgroundColor: user.resolutionRate >= 70 ? '#10b981' : user.resolutionRate >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Severity and Priority Distribution */}
          <div className="charts-grid two-col">
            <div className="card chart-card">
              <h3>🔴 Severity Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reportData.severityDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#94a3b8' }}
                  >
                    {(reportData.severityDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS.severity[index % COLORS.severity.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart-card">
              <h3>⚡ Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reportData.priorityDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#94a3b8' }}
                  >
                    {(reportData.priorityDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS.priority[index % COLORS.priority.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Activity */}
          <div className="card chart-card">
            <h3>📆 Daily Bug Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={reportData.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => v ? v.slice(5) : ''} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Created" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Project Health Summary */}
          <div className="card">
            <h3>🏥 Project Health Summary</h3>
            <table className="bug-table report-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Total Bugs</th>
                  <th>Open</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Critical</th>
                  <th>Health Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.projectHealth || []).map((project, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="project-badge">{project.projectKey}</span>
                      <span className="project-name-small">{project.projectName}</span>
                    </td>
                    <td>{safeNum(project.total)}</td>
                    <td className="text-warning">{safeNum(project.open)}</td>
                    <td>{safeNum(project.inProgress)}</td>
                    <td className="text-success">{safeNum(project.resolved)}</td>
                    <td className="text-danger">{safeNum(project.critical)}</td>
                    <td>
                      <span className={`health-score ${project.healthScore >= 70 ? 'good' : project.healthScore >= 40 ? 'medium' : 'low'}`}>
                        {project.healthScore?.toFixed(0) || 0}/100
                      </span>
                    </td>
                    <td>
                      <span className={`status-indicator ${project.healthScore >= 70 ? 'healthy' : project.healthScore >= 40 ? 'warning' : 'critical'}`}>
                        {project.healthScore >= 70 ? '✅ Healthy' : project.healthScore >= 40 ? '⚠️ Needs Attention' : '🔴 Critical'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Critical & High Priority Bugs */}
          <div className="card">
            <h3>🚨 Critical & High Priority Bugs (Requires Attention)</h3>
            <table className="bug-table report-table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Age (Days)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.criticalBugs || []).slice(0, 15).map((bug, idx) => (
                  <tr key={idx}>
                    <td><span className="bug-id">{bug.bugId}</span></td>
                    <td className="bug-title">{bug.title}</td>
                    <td><span className="project-badge">{bug.projectKey}</span></td>
                    <td><span className={`badge badge-${bug.severity?.toLowerCase()}`}>{bug.severity}</span></td>
                    <td><span className={`badge badge-${bug.priority?.toLowerCase()}`}>{bug.priority}</span></td>
                    <td>{bug.assignee || '-'}</td>
                    <td className={bug.age > 7 ? 'text-danger' : bug.age > 3 ? 'text-warning' : ''}>{bug.age || 0}</td>
                    <td><span className={`badge badge-${bug.status?.toLowerCase().replace(' ', '-')}`}>{bug.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(reportData.criticalBugs || []).length > 15 && (
              <p className="more-items">... and {reportData.criticalBugs.length - 15} more critical bugs</p>
            )}
          </div>

          {/* Week over Week Comparison (for weekly reports) */}
          {reportType === 'weekly' && reportData.weekOverWeek && (
            <div className="card">
              <h3>📊 Week over Week Comparison</h3>
              <div className="wow-comparison">
                <div className="wow-metric">
                  <span className="wow-label">Bugs Filed</span>
                  <span className="wow-current">{safeNum(reportData.weekOverWeek.currentWeek?.created)}</span>
                  <span className={`wow-change ${reportData.weekOverWeek.createdChange >= 0 ? 'up' : 'down'}`}>
                    {reportData.weekOverWeek.createdChange >= 0 ? '▲' : '▼'} {Math.abs(reportData.weekOverWeek.createdChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {safeNum(reportData.weekOverWeek.previousWeek?.created)} last week</span>
                </div>
                <div className="wow-metric">
                  <span className="wow-label">Bugs Resolved</span>
                  <span className="wow-current">{safeNum(reportData.weekOverWeek.currentWeek?.resolved)}</span>
                  <span className={`wow-change ${reportData.weekOverWeek.resolvedChange >= 0 ? 'up good' : 'down'}`}>
                    {reportData.weekOverWeek.resolvedChange >= 0 ? '▲' : '▼'} {Math.abs(reportData.weekOverWeek.resolvedChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {safeNum(reportData.weekOverWeek.previousWeek?.resolved)} last week</span>
                </div>
                <div className="wow-metric">
                  <span className="wow-label">Resolution Rate</span>
                  <span className="wow-current">{reportData.weekOverWeek.currentWeek?.rate?.toFixed(1) || 0}%</span>
                  <span className={`wow-change ${reportData.weekOverWeek.rateChange >= 0 ? 'up good' : 'down'}`}>
                    {reportData.weekOverWeek.rateChange >= 0 ? '▲' : '▼'} {Math.abs(reportData.weekOverWeek.rateChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {reportData.weekOverWeek.previousWeek?.rate?.toFixed(1) || 0}% last week</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity Summary */}
          <div className="card">
            <h3>📝 Recent Activity Summary</h3>
            <div className="activity-summary">
              <div className="activity-stat">
                <span className="activity-icon">📝</span>
                <span className="activity-count">{safeNum(reportData.activitySummary?.comments)}</span>
                <span className="activity-label">Comments Added</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">🔄</span>
                <span className="activity-count">{safeNum(reportData.activitySummary?.statusChanges)}</span>
                <span className="activity-label">Status Changes</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">👤</span>
                <span className="activity-count">{safeNum(reportData.activitySummary?.reassignments)}</span>
                <span className="activity-label">Reassignments</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">🔗</span>
                <span className="activity-count">{safeNum(reportData.activitySummary?.commits)}</span>
                <span className="activity-label">Commits Linked</span>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="download-section">
            <button 
              className="btn btn-success btn-xl"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? '⏳ Generating Professional PDF...' : '📥 Download Professional PDF Report'}
            </button>
            <p className="download-note">
              The PDF report will include all charts, tables, and metrics shown above with professional formatting and a confidential footer on each page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportGenerator;
