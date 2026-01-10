import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MultiSelect from './MultiSelect';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import './ReportGenerator.css';

function ReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
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
      console.log('[ReportGenerator] Projects received:', res.data);
      
      const projectList = res.data || [];
      setProjects(projectList);
      
      // Extract keys - use 'key' field (what the API returns)
      const keys = projectList.map(p => p.projectKey || p.key);
      console.log('[ReportGenerator] Extracted project keys:', keys);
      
      setSelectedProjects(keys);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    }
  };

  const fetchReportData = async () => {
    if (selectedProjects.length === 0) {
      setError('Please select at least one project');
      return;
    }
    
    setLoading(true);
    setError('');
    
    console.log('[ReportGenerator] Fetching report data with:', {
      reportType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      projects: selectedProjects
    });
    
    try {
      const res = await axios.post('/api/analytics/report-data', {
        reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        projects: selectedProjects
      });
      
      console.log('[ReportGenerator] Report data received:', res.data);
      console.log('[ReportGenerator] currentSnapshot:', res.data?.currentSnapshot);
      
      if (res.data) {
        setReportData(res.data);
        setPreviewMode(true);
      } else {
        setError('No data received from server');
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.response?.data?.error || 'Failed to generate report preview');
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

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `BugTracker_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF report');
    } finally {
      setGenerating(false);
    }
  };

  const COLORS = {
    status: ['#3b82f6', '#8b5cf6', '#10b981', '#6b7280', '#f59e0b'],
    severity: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
    priority: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
    projects: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
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

  // MultiSelect helpers
  const projectOptions = projects.map(p => {
    const key = p.projectKey || p.key;
    return `${key} - ${p.name}`;
  });

  const selectedDisplay = selectedProjects.map(key => {
    const project = projects.find(p => (p.projectKey || p.key) === key);
    return project ? `${key} - ${project.name}` : key;
  });

  const handleProjectChange = (newSelected) => {
    // Extract just the project key (before " - ")
    const keys = newSelected.map(item => {
      const key = item.split(' - ')[0];
      return key;
    });
    console.log('[ReportGenerator] Selected project keys:', keys);
    setSelectedProjects(keys);
  };

  const selectAllProjects = () => {
    setSelectedProjects(projects.map(p => p.projectKey || p.key));
  };

  const clearAllProjects = () => {
    setSelectedProjects([]);
  };

  // Safe data accessors
  const summary = reportData?.summary || {};
  const currentSnapshot = reportData?.currentSnapshot || {};
  const statusDist = Array.isArray(reportData?.statusDistribution) ? reportData.statusDistribution : [];
  const severityDist = Array.isArray(reportData?.currentSeverityDistribution) ? reportData.currentSeverityDistribution : 
                       Array.isArray(reportData?.severityDistribution) ? reportData.severityDistribution : [];
  const priorityDist = Array.isArray(reportData?.currentPriorityDistribution) ? reportData.currentPriorityDistribution :
                       Array.isArray(reportData?.priorityDistribution) ? reportData.priorityDistribution : [];
  const dailyActivity = Array.isArray(reportData?.dailyActivity) ? reportData.dailyActivity : [];
  const projectHealth = Array.isArray(reportData?.projectHealth) ? reportData.projectHealth : [];
  const projectComparison = Array.isArray(reportData?.projectComparison) ? reportData.projectComparison : [];
  const assigneePerformance = Array.isArray(reportData?.assigneePerformance) ? reportData.assigneePerformance : [];
  const criticalBugs = Array.isArray(reportData?.criticalBugs) ? reportData.criticalBugs : [];
  const activitySummary = reportData?.activitySummary || {};
  const weekOverWeek = reportData?.weekOverWeek || null;
  const arbTrend = Array.isArray(reportData?.arbTrend) ? reportData.arbTrend : [];

  return (
    <div className="report-generator">
      <div className="dashboard-header">
        <h1>📊 Report Generator</h1>
        <p>Generate comprehensive weekly or monthly reports for project management</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Configuration Card */}
      <div className="card">
        <h3 className="card-title">Report Configuration</h3>
        
        <div className="report-config-grid">
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <div className="report-type-buttons">
              <button 
                type="button"
                className={`report-type-btn ${reportType === 'weekly' ? 'active' : ''}`}
                onClick={() => setReportType('weekly')}
              >
                📅 Weekly Report
              </button>
              <button 
                type="button"
                className={`report-type-btn ${reportType === 'monthly' ? 'active' : ''}`}
                onClick={() => setReportType('monthly')}
              >
                🗓️ Monthly Report
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date Range</label>
            <div className="date-range-inputs">
              <div className="date-field">
                <span className="date-label">From</span>
                <input 
                  type="date" 
                  className="form-control"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                />
              </div>
              <div className="date-field">
                <span className="date-label">To</span>
                <input 
                  type="date" 
                  className="form-control"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label className="form-label">
            Projects to Include
            <span className="project-count-badge">
              {selectedProjects.length === projects.length 
                ? 'All Selected' 
                : `${selectedProjects.length} of ${projects.length}`}
            </span>
          </label>
          
          <div className="project-selection-actions">
            <button type="button" className="btn btn-sm btn-secondary" onClick={selectAllProjects}>✓ Select All</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={clearAllProjects}>✕ Clear All</button>
          </div>

          <MultiSelect
            options={projectOptions}
            selected={selectedDisplay}
            onChange={handleProjectChange}
            placeholder="Search and select projects..."
          />
        </div>

        <div className="report-actions">
          <button 
            className="btn btn-primary btn-lg"
            onClick={fetchReportData}
            disabled={loading || selectedProjects.length === 0}
          >
            {loading ? '⏳ Generating...' : '👁️ Generate Preview'}
          </button>
          {reportData && (
            <button 
              className="btn btn-success btn-lg"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? '⏳ Creating PDF...' : '📥 Download PDF Report'}
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

          {/* ==================== SECTION 1: Current Snapshot ==================== */}
          <div className="card">
            <h3>📈 Current Bug Status (Selected Projects)</h3>
            <p className="section-subtitle">Real-time snapshot of all bugs in selected projects</p>
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-value">{safeNum(currentSnapshot.totalBugs)}</div>
                <div className="stat-label">Total Bugs</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-value">{safeNum(currentSnapshot.open)}</div>
                <div className="stat-label">Open</div>
              </div>
              <div className="stat-card" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6' }}>
                <div className="stat-value" style={{ color: '#8b5cf6' }}>{safeNum(currentSnapshot.inProgress)}</div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{safeNum(currentSnapshot.resolved) + safeNum(currentSnapshot.closed)}</div>
                <div className="stat-label">Resolved/Closed</div>
              </div>
              <div className="stat-card critical">
                <div className="stat-value">{safeNum(currentSnapshot.critical)}</div>
                <div className="stat-label">Critical</div>
              </div>
              <div className="stat-card" style={{ background: 'rgba(249, 115, 22, 0.15)', borderColor: '#f97316' }}>
                <div className="stat-value" style={{ color: '#f97316' }}>{safeNum(currentSnapshot.high)}</div>
                <div className="stat-label">High Severity</div>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: Period Activity ==================== */}
          <div className="card summary-card">
            <h3>📊 Period Activity Summary</h3>
            <p className="section-subtitle">Bugs created and resolved during {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</p>
            <div className="summary-metrics">
              <div className="summary-metric">
                <span className="metric-value">{safeNum(summary.totalBugsCreated)}</span>
                <span className="metric-label">Bugs Filed</span>
              </div>
              <div className="summary-metric success">
                <span className="metric-value">{safeNum(summary.totalBugsResolved)}</span>
                <span className="metric-label">Bugs Resolved</span>
              </div>
              <div className="summary-metric warning">
                <span className="metric-value">{safeNum(summary.netChange)}</span>
                <span className="metric-label">Net Change</span>
              </div>
              <div className="summary-metric">
                <span className="metric-value">{safeNum(summary.avgResolutionTime)}d</span>
                <span className="metric-label">Avg Resolution</span>
              </div>
              <div className="summary-metric">
                <span className="metric-value">
                  {typeof summary.resolutionRate === 'number' ? summary.resolutionRate.toFixed(1) : '0'}%
                </span>
                <span className="metric-label">Resolution Rate</span>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 3: Distribution Charts ==================== */}
          <div className="charts-grid three-col">
            {/* Status Distribution */}
            <div className="card chart-card">
              <h3>📊 Status Distribution</h3>
              <div style={{ width: '100%', height: 220 }}>
                {statusDist.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" 
                           label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={{ stroke: '#94a3b8' }}>
                        {statusDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS.status[index % COLORS.status.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">No data available</div>}
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="card chart-card">
              <h3>🎯 Severity Distribution</h3>
              <div style={{ width: '100%', height: 220 }}>
                {severityDist.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                           label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={{ stroke: '#94a3b8' }}>
                        {severityDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS.severity[index % COLORS.severity.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">No data available</div>}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="card chart-card">
              <h3>⚡ Priority Distribution</h3>
              <div style={{ width: '100%', height: 220 }}>
                {priorityDist.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={priorityDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                           label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={{ stroke: '#94a3b8' }}>
                        {priorityDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS.priority[index % COLORS.priority.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">No data available</div>}
              </div>
            </div>
          </div>

          {/* ==================== SECTION 4: Trend Charts ==================== */}
          <div className="charts-grid two-col">
            {/* Daily Bug Activity */}
            <div className="card chart-card">
              <h3>📆 Daily Bug Activity</h3>
              <div style={{ width: '100%', height: 280 }}>
                {dailyActivity.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart data={dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => v ? v.slice(5) : ''} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                      <Legend />
                      <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Created" />
                      <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">No activity data available</div>}
              </div>
            </div>

            {/* ARB Trend / Resolution Trend */}
            <div className="card chart-card">
              <h3>📈 Resolution Trend</h3>
              <div style={{ width: '100%', height: 280 }}>
                {arbTrend.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={arbTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => v ? v.slice(5) : ''} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} formatter={(val) => `${val}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Resolution Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">No trend data available</div>}
              </div>
            </div>
          </div>

          {/* ==================== SECTION 5: Bugs by Project ==================== */}
          {projectHealth.length > 0 && (
            <div className="card chart-card">
              <h3>📁 Bugs by Project</h3>
              <div style={{ width: '100%', height: Math.max(300, projectHealth.length * 45) }}>
                <ResponsiveContainer>
                  <BarChart data={projectHealth} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="projectKey" stroke="#94a3b8" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    <Legend />
                    <Bar dataKey="open" stackId="a" fill="#3b82f6" name="Open" />
                    <Bar dataKey="inProgress" stackId="a" fill="#8b5cf6" name="In Progress" />
                    <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" />
                    <Bar dataKey="closed" stackId="a" fill="#6b7280" name="Closed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ==================== SECTION 6: Project Health Table ==================== */}
          {projectHealth.length > 0 && (
            <div className="card">
              <h3>🏥 Project Health Summary</h3>
              <table className="bug-table report-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Total</th>
                    <th>Open</th>
                    <th>In Progress</th>
                    <th>Resolved</th>
                    <th>Critical</th>
                    <th>Health</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectHealth.map((project, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="project-badge">{project.projectKey || '-'}</span>
                        <span className="project-name-small">{project.projectName || ''}</span>
                      </td>
                      <td>{safeNum(project.total)}</td>
                      <td className="text-warning">{safeNum(project.open)}</td>
                      <td style={{ color: '#8b5cf6' }}>{safeNum(project.inProgress)}</td>
                      <td className="text-success">{safeNum(project.resolved)}</td>
                      <td className="text-danger">{safeNum(project.critical)}</td>
                      <td>
                        <span className={`health-score ${(project.healthScore || 0) >= 70 ? 'good' : (project.healthScore || 0) >= 40 ? 'medium' : 'low'}`}>
                          {typeof project.healthScore === 'number' ? project.healthScore.toFixed(0) : '0'}/100
                        </span>
                      </td>
                      <td>
                        <span className={`status-indicator ${(project.healthScore || 0) >= 70 ? 'healthy' : (project.healthScore || 0) >= 40 ? 'warning' : 'critical'}`}>
                          {(project.healthScore || 0) >= 70 ? '✅ Healthy' : (project.healthScore || 0) >= 40 ? '⚠️ Attention' : '🔴 Critical'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================== SECTION 7: Team Performance ==================== */}
          {assigneePerformance.length > 0 && (
            <div className="card">
              <h3>👥 Team Performance</h3>
              <table className="bug-table report-table">
                <thead>
                  <tr>
                    <th>Assignee</th>
                    <th>Assigned</th>
                    <th>Open/In Progress</th>
                    <th>Resolved</th>
                    <th>Resolution Rate</th>
                    <th>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {assigneePerformance.slice(0, 10).map((user, idx) => (
                    <tr key={idx}>
                      <td><strong>{user.assignee || 'Unassigned'}</strong></td>
                      <td>{safeNum(user.assigned)}</td>
                      <td className="text-warning">{safeNum(user.openInProgress)}</td>
                      <td className="text-success">{safeNum(user.resolved)}</td>
                      <td>
                        <span className={`rate-badge ${(user.resolutionRate || 0) >= 70 ? 'good' : (user.resolutionRate || 0) >= 40 ? 'medium' : 'low'}`}>
                          {typeof user.resolutionRate === 'number' ? user.resolutionRate.toFixed(0) : '0'}%
                        </span>
                      </td>
                      <td>{typeof user.avgResolutionTime === 'number' ? user.avgResolutionTime.toFixed(1) : '0'}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================== SECTION 8: Critical Bugs ==================== */}
          {criticalBugs.length > 0 && (
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
                    <th>Age</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalBugs.slice(0, 15).map((bug, idx) => (
                    <tr key={idx}>
                      <td><span className="bug-id">{bug.bugId || '-'}</span></td>
                      <td className="bug-title">{bug.title || '-'}</td>
                      <td><span className="project-badge">{bug.projectKey || '-'}</span></td>
                      <td><span className={`badge badge-${(bug.severity || '').toLowerCase()}`}>{bug.severity || '-'}</span></td>
                      <td><span className={`badge badge-${(bug.priority || '').toLowerCase()}`}>{bug.priority || '-'}</span></td>
                      <td>{bug.assignee || '-'}</td>
                      <td className={safeNum(bug.age) > 7 ? 'text-danger' : safeNum(bug.age) > 3 ? 'text-warning' : ''}>{safeNum(bug.age)}d</td>
                      <td><span className={`badge badge-${(bug.status || '').toLowerCase().replace(' ', '-')}`}>{bug.status || '-'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticalBugs.length > 15 && (
                <p className="more-items">... and {criticalBugs.length - 15} more critical/high priority bugs</p>
              )}
            </div>
          )}

          {/* ==================== SECTION 9: Week over Week ==================== */}
          {reportType === 'weekly' && weekOverWeek && (
            <div className="card">
              <h3>📊 Week over Week Comparison</h3>
              <div className="wow-comparison">
                <div className="wow-metric">
                  <span className="wow-label">Bugs Filed</span>
                  <span className="wow-current">{safeNum(weekOverWeek.currentWeek?.created)}</span>
                  <span className={`wow-change ${(weekOverWeek.createdChange || 0) >= 0 ? 'up' : 'down'}`}>
                    {(weekOverWeek.createdChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(weekOverWeek.createdChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {safeNum(weekOverWeek.previousWeek?.created)} last week</span>
                </div>
                <div className="wow-metric">
                  <span className="wow-label">Bugs Resolved</span>
                  <span className="wow-current">{safeNum(weekOverWeek.currentWeek?.resolved)}</span>
                  <span className={`wow-change ${(weekOverWeek.resolvedChange || 0) >= 0 ? 'up good' : 'down'}`}>
                    {(weekOverWeek.resolvedChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(weekOverWeek.resolvedChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {safeNum(weekOverWeek.previousWeek?.resolved)} last week</span>
                </div>
                <div className="wow-metric">
                  <span className="wow-label">Resolution Rate</span>
                  <span className="wow-current">{typeof weekOverWeek.currentWeek?.rate === 'number' ? weekOverWeek.currentWeek.rate.toFixed(1) : '0'}%</span>
                  <span className={`wow-change ${(weekOverWeek.rateChange || 0) >= 0 ? 'up good' : 'down'}`}>
                    {(weekOverWeek.rateChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(weekOverWeek.rateChange || 0).toFixed(1)}%
                  </span>
                  <span className="wow-prev">vs {typeof weekOverWeek.previousWeek?.rate === 'number' ? weekOverWeek.previousWeek.rate.toFixed(1) : '0'}% last week</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 10: Activity Summary ==================== */}
          <div className="card">
            <h3>📝 Activity Summary</h3>
            <div className="activity-summary">
              <div className="activity-stat">
                <span className="activity-icon">📝</span>
                <span className="activity-count">{safeNum(activitySummary.comments)}</span>
                <span className="activity-label">Comments Added</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">🔄</span>
                <span className="activity-count">{safeNum(activitySummary.statusChanges)}</span>
                <span className="activity-label">Status Changes</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">👤</span>
                <span className="activity-count">{safeNum(activitySummary.reassignments)}</span>
                <span className="activity-label">Reassignments</span>
              </div>
              <div className="activity-stat">
                <span className="activity-icon">🔗</span>
                <span className="activity-count">{safeNum(activitySummary.commits)}</span>
                <span className="activity-label">Commits Linked</span>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="download-section">
            <button className="btn btn-success btn-xl" onClick={generatePDF} disabled={generating}>
              {generating ? '⏳ Generating...' : '📥 Download Professional PDF Report'}
            </button>
            <p className="download-note">
              The PDF includes all charts, tables, and metrics shown above with professional formatting and branding.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportGenerator;
