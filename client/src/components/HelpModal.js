import React, { useState, useEffect } from 'react';

function HelpModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'projects', title: 'Projects', icon: '📁' },
    { id: 'bugs', title: 'Bug Management', icon: '🐛' },
    { id: 'fields', title: 'Field Reference', icon: '📝' },
    { id: 'workflow', title: 'Workflow', icon: '🔄' },
    { id: 'tips', title: 'Tips & Tricks', icon: '💡' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
  ];

  // Styles
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    },
    modal: {
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '1100px',
      height: '85vh',
      maxHeight: '800px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
      overflow: 'hidden',
    },
    header: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
      padding: '24px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'white',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: '14px',
      marginTop: '6px',
    },
    closeButton: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '10px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'white',
      fontSize: '20px',
      transition: 'all 0.2s',
    },
    body: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    },
    sidebar: {
      width: '220px',
      background: '#1e293b',
      borderRight: '1px solid #334155',
      padding: '16px 12px',
      overflowY: 'auto',
    },
    navItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 14px',
      borderRadius: '10px',
      border: 'none',
      background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'transparent',
      color: isActive ? 'white' : '#94a3b8',
      fontSize: '14px',
      fontWeight: isActive ? '600' : '500',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left',
      marginBottom: '4px',
      transition: 'all 0.2s',
    }),
    navIcon: {
      fontSize: '18px',
    },
    content: {
      flex: 1,
      padding: '24px 30px',
      overflowY: 'auto',
      background: '#0f172a',
    },
    sectionTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#f1f5f9',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    sectionSubtitle: {
      color: '#94a3b8',
      fontSize: '15px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #334155',
    },
    card: {
      background: '#1e293b',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid #334155',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#f1f5f9',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    cardText: {
      color: '#94a3b8',
      fontSize: '14px',
      lineHeight: '1.7',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    },
    highlightCard: (color) => ({
      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${color}40`,
      borderTop: `3px solid ${color}`,
    }),
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    listItem: {
      color: '#94a3b8',
      fontSize: '14px',
      padding: '8px 0',
      paddingLeft: '24px',
      position: 'relative',
      lineHeight: '1.6',
    },
    bullet: {
      position: 'absolute',
      left: '8px',
      color: '#4f46e5',
    },
    badge: (color) => ({
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: color,
      color: 'white',
      marginRight: '8px',
    }),
    fieldRow: {
      display: 'flex',
      padding: '14px 16px',
      background: '#0f172a',
      borderRadius: '8px',
      marginBottom: '8px',
      alignItems: 'flex-start',
      gap: '16px',
    },
    fieldName: {
      minWidth: '140px',
      fontWeight: '600',
      color: '#f1f5f9',
      fontSize: '14px',
    },
    fieldDesc: {
      color: '#94a3b8',
      fontSize: '14px',
      flex: 1,
    },
    required: {
      color: '#ef4444',
      marginLeft: '2px',
    },
    statusFlow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
      marginTop: '16px',
    },
    statusItem: (color) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#1e293b',
      borderRadius: '10px',
      minWidth: '100px',
      border: `2px solid ${color}`,
    }),
    statusDot: (color) => ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: color,
      marginBottom: '6px',
    }),
    statusName: {
      fontWeight: '600',
      color: '#f1f5f9',
      fontSize: '13px',
    },
    arrow: {
      color: '#4f46e5',
      fontSize: '20px',
      fontWeight: 'bold',
    },
    tipCard: {
      background: 'linear-gradient(135deg, #4f46e520 0%, #4f46e508 100%)',
      borderRadius: '12px',
      padding: '16px 20px',
      border: '1px solid #4f46e540',
      display: 'flex',
      gap: '14px',
      marginBottom: '12px',
    },
    tipIcon: {
      fontSize: '24px',
      flexShrink: 0,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontWeight: '600',
      color: '#a78bfa',
      fontSize: '14px',
      marginBottom: '4px',
    },
    tipText: {
      color: '#94a3b8',
      fontSize: '13px',
      lineHeight: '1.6',
    },
    faqItem: {
      background: '#1e293b',
      borderRadius: '10px',
      marginBottom: '10px',
      border: '1px solid #334155',
      overflow: 'hidden',
    },
    faqQuestion: {
      padding: '16px 20px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: '600',
      color: '#f1f5f9',
      fontSize: '14px',
    },
    faqAnswer: {
      padding: '0 20px 16px',
      color: '#94a3b8',
      fontSize: '14px',
      lineHeight: '1.7',
      borderTop: '1px solid #334155',
      paddingTop: '16px',
    },
    kbd: {
      display: 'inline-block',
      padding: '3px 8px',
      background: '#0f172a',
      border: '1px solid #475569',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e2e8f0',
      marginRight: '4px',
      boxShadow: '0 2px 0 #334155',
    },
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <>
            <h2 style={styles.sectionTitle}>🚀 Getting Started</h2>
            <p style={styles.sectionSubtitle}>Welcome to BugTracker! Let's get you up and running quickly.</p>
            
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>What is BugTracker?</h3>
              <p style={styles.cardText}>
                BugTracker is a powerful yet simple bug tracking system designed to help teams efficiently 
                track, manage, and resolve software issues. It supports multiple projects, customizable 
                workflows, and seamless team collaboration.
              </p>
            </div>

            <div style={styles.grid}>
              <div style={styles.highlightCard('#8b5cf6')}>
                <h4 style={{...styles.cardTitle, color: '#a78bfa'}}>👤 For Team Members</h4>
                <ul style={styles.list}>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>View and filter bugs assigned to you</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Create new bug reports</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Update bug status and add comments</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Attach files and screenshots</li>
                </ul>
              </div>
              
              <div style={styles.highlightCard('#10b981')}>
                <h4 style={{...styles.cardTitle, color: '#34d399'}}>👑 For Administrators</h4>
                <ul style={styles.list}>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Create and manage projects</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Add and remove team members</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>Configure GitHub integration</li>
                  <li style={styles.listItem}><span style={styles.bullet}>•</span>View analytics and reports</li>
                </ul>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🧭 Quick Navigation</h3>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#4f46e5')}>Dashboard</span>
                <span style={styles.fieldDesc}>Your personal overview with assigned bugs and statistics</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#4f46e5')}>Projects</span>
                <span style={styles.fieldDesc}>Browse all projects you have access to</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#4f46e5')}>My Bugs</span>
                <span style={styles.fieldDesc}>Quick access to bugs assigned to or reported by you</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#ef4444')}>Users</span>
                <span style={styles.fieldDesc}>User management (Admin only)</span>
              </div>
            </div>
          </>
        );

      case 'projects':
        return (
          <>
            <h2 style={styles.sectionTitle}>📁 Projects</h2>
            <p style={styles.sectionSubtitle}>Organize your bugs by project for better management.</p>
            
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Creating a New Project</h3>
              <p style={styles.cardText}>Only administrators can create new projects. Follow these steps:</p>
              <div style={{marginTop: '16px'}}>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #4f46e5'}}>
                  <span style={styles.badge('#4f46e5')}>Step 1</span>
                  <span style={styles.fieldDesc}>Navigate to <strong>Projects</strong> in the navigation bar</span>
                </div>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #4f46e5'}}>
                  <span style={styles.badge('#4f46e5')}>Step 2</span>
                  <span style={styles.fieldDesc}>Click the <strong>"New Project"</strong> button in the top-right</span>
                </div>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #4f46e5'}}>
                  <span style={styles.badge('#4f46e5')}>Step 3</span>
                  <span style={styles.fieldDesc}>Fill in project details and select team members</span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📋 Project Fields</h3>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Project Name<span style={styles.required}>*</span></span>
                <span style={styles.fieldDesc}>A descriptive name (e.g., "Mobile App v2.0")</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Project Key<span style={styles.required}>*</span></span>
                <span style={styles.fieldDesc}>2-5 letter unique identifier. Used as bug ID prefix (e.g., "MOB" → MOB-0001)</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Description</span>
                <span style={styles.fieldDesc}>Brief description of the project's purpose and scope</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Client</span>
                <span style={styles.fieldDesc}>The client or stakeholder this project is for</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Team Members</span>
                <span style={styles.fieldDesc}>Users who will have access to this project</span>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>💡</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Pro Tip: Project Key</div>
                <div style={styles.tipText}>
                  Choose a memorable, short project key (2-4 characters). It becomes part of every bug ID!
                  Examples: API, WEB, IOS, AND
                </div>
              </div>
            </div>
          </>
        );

      case 'bugs':
        return (
          <>
            <h2 style={styles.sectionTitle}>🐛 Bug Management</h2>
            <p style={styles.sectionSubtitle}>Learn how to create, update, and track bugs effectively.</p>
            
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Creating a Bug Report</h3>
              <div style={{marginTop: '12px'}}>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #f59e0b'}}>
                  <span style={styles.badge('#f59e0b')}>1</span>
                  <span style={styles.fieldDesc}><strong>Select a Project</strong> - Navigate to the target project</span>
                </div>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #f59e0b'}}>
                  <span style={styles.badge('#f59e0b')}>2</span>
                  <span style={styles.fieldDesc}><strong>Click "New Bug"</strong> - Found in the project's bug list</span>
                </div>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #f59e0b'}}>
                  <span style={styles.badge('#f59e0b')}>3</span>
                  <span style={styles.fieldDesc}><strong>Fill Details</strong> - Clear title, description, severity, priority</span>
                </div>
                <div style={{...styles.fieldRow, borderLeft: '3px solid #f59e0b'}}>
                  <span style={styles.badge('#f59e0b')}>4</span>
                  <span style={styles.fieldDesc}><strong>Attach Evidence</strong> - Screenshots, logs, relevant files</span>
                </div>
              </div>
            </div>

            <div style={{...styles.card, background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%)', borderColor: '#f59e0b40'}}>
              <h3 style={{...styles.cardTitle, color: '#fbbf24'}}>⚠️ Writing Good Bug Reports</h3>
              <p style={styles.cardText}>A well-written bug report saves time. Always include:</p>
              <ul style={{...styles.list, marginTop: '12px'}}>
                <li style={styles.listItem}><span style={styles.bullet}>•</span><strong>Steps to reproduce</strong> - Exact steps to trigger the bug</li>
                <li style={styles.listItem}><span style={styles.bullet}>•</span><strong>Expected behavior</strong> - What should happen</li>
                <li style={styles.listItem}><span style={styles.bullet}>•</span><strong>Actual behavior</strong> - What actually happens</li>
                <li style={styles.listItem}><span style={styles.bullet}>•</span><strong>Environment</strong> - Browser, OS, device info</li>
              </ul>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📊 Bug Status Lifecycle</h3>
              <div style={styles.statusFlow}>
                <div style={styles.statusItem('#3b82f6')}>
                  <div style={styles.statusDot('#3b82f6')}></div>
                  <div style={styles.statusName}>Open</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={styles.statusItem('#f59e0b')}>
                  <div style={styles.statusDot('#f59e0b')}></div>
                  <div style={styles.statusName}>In Progress</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={styles.statusItem('#8b5cf6')}>
                  <div style={styles.statusDot('#8b5cf6')}></div>
                  <div style={styles.statusName}>Resolved</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={styles.statusItem('#10b981')}>
                  <div style={styles.statusDot('#10b981')}></div>
                  <div style={styles.statusName}>Closed</div>
                </div>
              </div>
              <p style={{...styles.cardText, marginTop: '16px', fontSize: '13px'}}>
                <span style={styles.badge('#ef4444')}>Reopened</span> - Bug reappeared or fix didn't work
              </p>
            </div>
          </>
        );

      case 'fields':
        return (
          <>
            <h2 style={styles.sectionTitle}>📝 Field Reference</h2>
            <p style={styles.sectionSubtitle}>Complete guide to all bug fields and their meanings.</p>
            
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🔴 Severity Levels</h3>
              <p style={{...styles.cardText, marginBottom: '12px'}}>How badly does the bug affect the system?</p>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#ef4444')}>Critical</span>
                <span style={styles.fieldDesc}>System crash, data loss, security breach</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#f97316')}>High</span>
                <span style={styles.fieldDesc}>Major feature broken, no workaround available</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#f59e0b')}>Medium</span>
                <span style={styles.fieldDesc}>Feature impaired, workaround exists</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#10b981')}>Low</span>
                <span style={styles.fieldDesc}>Minor issue, cosmetic problems</span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🎯 Priority Levels</h3>
              <p style={{...styles.cardText, marginBottom: '12px'}}>How urgently does it need to be fixed?</p>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#ef4444')}>Critical</span>
                <span style={styles.fieldDesc}>Fix immediately, blocks release</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#f97316')}>High</span>
                <span style={styles.fieldDesc}>Fix in current sprint</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#f59e0b')}>Medium</span>
                <span style={styles.fieldDesc}>Fix in next sprint</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#10b981')}>Low</span>
                <span style={styles.fieldDesc}>Fix when time permits</span>
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🌐 Environment</h3>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'}}>
                  <span style={styles.badge('#3b82f6')}>Development</span>
                  <span style={styles.badge('#8b5cf6')}>Testing</span>
                  <span style={styles.badge('#f59e0b')}>Staging</span>
                  <span style={styles.badge('#ef4444')}>Production</span>
                </div>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>✅ QA Status</h3>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'}}>
                  <span style={styles.badge('#64748b')}>Not Started</span>
                  <span style={styles.badge('#3b82f6')}>Testing</span>
                  <span style={styles.badge('#10b981')}>Passed</span>
                  <span style={styles.badge('#ef4444')}>Failed</span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🏁 Closure Reasons</h3>
              <p style={{...styles.cardText, marginBottom: '12px'}}>When closing a bug, select the appropriate reason:</p>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#10b981')}>Fixed</span>
                <span style={styles.fieldDesc}>Bug was successfully fixed</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#64748b')}>Won't Fix</span>
                <span style={styles.fieldDesc}>Decided not to fix (out of scope, too costly)</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#8b5cf6')}>Duplicate</span>
                <span style={styles.fieldDesc}>Already reported in another bug</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#f59e0b')}>Cannot Reproduce</span>
                <span style={styles.fieldDesc}>Unable to recreate the issue</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.badge('#3b82f6')}>By Design</span>
                <span style={styles.fieldDesc}>The behavior is intentional</span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📋 Other Fields</h3>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Assignee</span>
                <span style={styles.fieldDesc}>Developer responsible for fixing the bug</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>QA Owner</span>
                <span style={styles.fieldDesc}>QA engineer responsible for verification</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Target Version</span>
                <span style={styles.fieldDesc}>Release version for the fix (e.g., "v2.1.0")</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Due SLA</span>
                <span style={styles.fieldDesc}>Deadline based on service level agreement</span>
              </div>
              <div style={styles.fieldRow}>
                <span style={styles.fieldName}>Module</span>
                <span style={styles.fieldDesc}>Specific component affected (e.g., "Authentication")</span>
              </div>
            </div>
          </>
        );

      case 'workflow':
        return (
          <>
            <h2 style={styles.sectionTitle}>🔄 Workflow</h2>
            <p style={styles.sectionSubtitle}>Recommended workflows for different team roles.</p>
            
            <div style={styles.highlightCard('#3b82f6')}>
              <h3 style={{...styles.cardTitle, color: '#60a5fa'}}>📝 Reporter Workflow</h3>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', alignItems: 'center'}}>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>🔍</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Discover</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>📝</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Report</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>📎</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Attach</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>👀</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Monitor</div>
                </div>
              </div>
            </div>

            <div style={{...styles.highlightCard('#f59e0b'), marginTop: '16px'}}>
              <h3 style={{...styles.cardTitle, color: '#fbbf24'}}>💻 Developer Workflow</h3>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', alignItems: 'center'}}>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>📋</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Review</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>🔧</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>In Progress</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>💻</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Implement</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>✅</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Resolve</div>
                </div>
              </div>
            </div>

            <div style={{...styles.highlightCard('#10b981'), marginTop: '16px'}}>
              <h3 style={{...styles.cardTitle, color: '#34d399'}}>🧪 QA Workflow</h3>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', alignItems: 'center'}}>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>📥</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Pick Up</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>🧪</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Test</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>📊</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Record</div>
                </div>
                <span style={styles.arrow}>→</span>
                <div style={{textAlign: 'center', padding: '12px', background: '#1e293b', borderRadius: '10px', minWidth: '90px'}}>
                  <div style={{fontSize: '24px', marginBottom: '4px'}}>🏁</div>
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>Close/Reopen</div>
                </div>
              </div>
            </div>
          </>
        );

      case 'tips':
        return (
          <>
            <h2 style={styles.sectionTitle}>💡 Tips & Tricks</h2>
            <p style={styles.sectionSubtitle}>Get the most out of BugTracker with these pro tips.</p>
            
            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>📝</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Use Descriptive Titles</div>
                <div style={styles.tipText}>Include the what and where: "Login button unresponsive on Safari mobile" beats "Button broken"</div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>📸</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Always Attach Screenshots</div>
                <div style={styles.tipText}>A picture is worth a thousand words. Visual evidence helps developers understand issues instantly.</div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>🔍</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Search Before Creating</div>
                <div style={styles.tipText}>Check if the bug already exists to avoid duplicates. Use filters and search functions.</div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>⏱️</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Update Status Promptly</div>
                <div style={styles.tipText}>Keep bug status current so the team always knows the true state of affairs.</div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>💬</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Use Comments for Updates</div>
                <div style={styles.tipText}>Add comments to track progress, ask questions, and document decisions for future reference.</div>
              </div>
            </div>

            <div style={styles.tipCard}>
              <span style={styles.tipIcon}>🔗</span>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Reference Related Bugs</div>
                <div style={styles.tipText}>Mention related bug IDs in comments (e.g., "Related to BT-0042") to create connections.</div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>⌨️ Quick Keyboard Tips</h3>
              <div style={styles.fieldRow}>
                <span><span style={styles.kbd}>Tab</span></span>
                <span style={styles.fieldDesc}>Navigate between form fields</span>
              </div>
              <div style={styles.fieldRow}>
                <span><span style={styles.kbd}>Ctrl</span> + <span style={styles.kbd}>Enter</span></span>
                <span style={styles.fieldDesc}>Submit forms quickly</span>
              </div>
              <div style={styles.fieldRow}>
                <span><span style={styles.kbd}>Esc</span></span>
                <span style={styles.fieldDesc}>Close dialogs and modals</span>
              </div>
            </div>
          </>
        );

      case 'faq':
        return (
          <>
            <h2 style={styles.sectionTitle}>❓ FAQ</h2>
            <p style={styles.sectionSubtitle}>Quick answers to commonly asked questions.</p>
            
            <FAQ question="How do I reset my password?">
              Click the 🔒 icon next to your username in the navigation bar. Enter your current password 
              and new password to update it.
            </FAQ>

            <FAQ question="Can I delete a bug?">
              Bug deletion is restricted to administrators to maintain audit trails. If you created a bug 
              by mistake, mark it as "Closed" with the reason "Duplicate" or contact an admin.
            </FAQ>

            <FAQ question="How do I attach files to a bug?">
              When creating or editing a bug, use the file upload section at the bottom of the form. 
              You can drag and drop files or click to browse. Supported formats include images, PDFs, and text files.
            </FAQ>

            <FAQ question="What does ARB mean?">
              ARB stands for "Affected Resource Browser" - it allows you to tag specific resources, 
              components, or areas affected by the bug for better organization.
            </FAQ>

            <FAQ question="How do I filter bugs by multiple criteria?">
              Use the filter panel on the bug list page. You can combine multiple filters 
              (status, severity, priority, assignee). Filters are applied together with AND logic.
            </FAQ>

            <FAQ question="How does GitHub integration work?">
              Administrators can link a project to a GitHub repository. When you make commits with bug IDs 
              in the message (e.g., "BT-0001: Fixed issue - Author: john"), the commit info automatically 
              appears in the bug's activity log.
            </FAQ>

            <FAQ question="Can I export bug data?">
              Currently, bug data can be exported through the API. A CSV export feature is planned for 
              a future release. Contact your administrator for bulk data exports.
            </FAQ>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>
              <span>📖</span>
              BugTracker User Manual
            </h1>
            <p style={styles.subtitle}>Everything you need to know to track and manage bugs effectively</p>
          </div>
          <button 
            style={styles.closeButton} 
            onClick={onClose}
            onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Sidebar */}
          <nav style={styles.sidebar}>
            {sections.map(section => (
              <button
                key={section.id}
                style={styles.navItem(activeSection === section.id)}
                onClick={() => setActiveSection(section.id)}
                onMouseOver={e => {
                  if (activeSection !== section.id) {
                    e.target.style.background = '#334155';
                    e.target.style.color = '#f1f5f9';
                  }
                }}
                onMouseOut={e => {
                  if (activeSection !== section.id) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#94a3b8';
                  }
                }}
              >
                <span style={styles.navIcon}>{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main style={styles.content}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

// FAQ Component
function FAQ({ question, children }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '10px',
      marginBottom: '10px',
      border: '1px solid #334155',
      overflow: 'hidden',
    }}>
      <div 
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: '600',
          color: '#f1f5f9',
          fontSize: '14px',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <span style={{
          color: '#4f46e5',
          fontSize: '18px',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>+</span>
      </div>
      {isOpen && (
        <div style={{
          padding: '0 20px 16px',
          color: '#94a3b8',
          fontSize: '14px',
          lineHeight: '1.7',
          borderTop: '1px solid #334155',
          paddingTop: '16px',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default HelpModal;
