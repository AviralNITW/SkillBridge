import React, { useState } from 'react';
import { Award, Briefcase, FileText, Plus, Clock, Trash2, Search } from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  company: string;
  category: string;
  mode: string;
  stipend: number;
  skills: string[];
}

interface Application {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  company: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed';
  appliedDate: string;
}

interface StudentTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  score?: number;
  feedback?: string;
  submissionUrl?: string;
}

interface StudentDashboardProps {
  opportunities: Opportunity[];
  applications: Application[];
  tasks: StudentTask[];
  onApply: (opportunityId: string) => void;
  onSubmitTask: (taskId: string, url: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  opportunities,
  applications,
  tasks,
  onApply,
  onSubmitTask
}) => {
  // Local state for interactive features
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js', 'FastAPI']);
  const [newSkill, setNewSkill] = useState('');
  
  const [projects, setProjects] = useState([
    { title: 'GeoStockLive Pipeline', desc: 'Real-time geopolitical intelligence dashboard pipeline.', github: 'https://github.com/student/geostock', live: 'https://geostock.live' },
    { title: 'Instagram Clone', desc: 'Fullstack react app with image posts and comments.', github: 'https://github.com/student/insta-clone', live: '' }
  ]);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projGithub, setProjGithub] = useState('');
  const [projLive, setProjLive] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [taskUrl, setTaskUrl] = useState<{[key: string]: string}>({});

  // Calculation logics
  const profileCompletion = Math.min(100, 30 + skills.length * 10 + projects.length * 15 + (applications.length > 0 ? 10 : 0));
  const employabilityScore = Math.min(100, 45 + skills.length * 5 + projects.length * 10 + tasks.filter(t => t.status === 'reviewed').length * 10);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projTitle.trim() && projDesc.trim()) {
      setProjects([...projects, {
        title: projTitle.trim(),
        desc: projDesc.trim(),
        github: projGithub.trim(),
        live: projLive.trim()
      }]);
      setProjTitle('');
      setProjDesc('');
      setProjGithub('');
      setProjLive('');
    }
  };

  const filteredOpportunities = opportunities.filter(opp => 
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ padding: '30px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      {/* Left Column: Core Workflows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Main Banner / Welcome */}
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back, Aviral! 👋</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You have active mentorship tasks waiting and {opportunities.length} potential matches to check out today.</p>
        </div>

        {/* Dynamic Analytics Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase' }}>Employability Score</h4>
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 12px' }}>
              {/* SVG Ring Progress */}
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="var(--accent-secondary)" strokeWidth="8" 
                        strokeDasharray={`${2 * Math.PI * 45}`} 
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - employabilityScore / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 55 55)" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '22px', fontWeight: 800 }}>
                {employabilityScore}%
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Based on profile, skills & tasks</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase' }}>Profile Completion</h4>
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 12px' }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="var(--accent-purple)" strokeWidth="8" 
                        strokeDasharray={`${2 * Math.PI * 45}`} 
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - profileCompletion / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 55 55)" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '22px', fontWeight: 800 }}>
                {profileCompletion}%
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Complete projects to reach 100%</p>
          </div>
        </div>

        {/* Assigned Mentorship Tasks */}
        <div className="glass-card">
          <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock color="var(--accent-amber)" size={20} /> Active Mentorship Tasks
          </h3>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No active tasks assigned yet. Complete internships to receive tasks.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tasks.map(task => (
                <div key={task.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ fontSize: '16px' }}>{task.title}</h4>
                    <span className={`badge badge-${task.status}`}>
                      {task.status === 'assigned' ? 'Awaiting Submission' : task.status === 'submitted' ? 'Under Evaluation' : 'Reviewed'}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{task.description}</p>
                  
                  {task.status === 'assigned' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Deliverable URL (e.g. GitHub repo, PDF link)" 
                        className="form-input"
                        value={taskUrl[task.id] || ''}
                        onChange={e => setTaskUrl({...taskUrl, [task.id]: e.target.value})}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                      />
                      <button 
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => {
                          if (taskUrl[task.id]) {
                            onSubmitTask(task.id, taskUrl[task.id]);
                          }
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  )}

                  {task.status === 'submitted' && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Submitted Link: <a href={task.submissionUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>{task.submissionUrl}</a>
                    </div>
                  )}

                  {task.status === 'reviewed' && (
                    <div style={{ marginTop: '12px', background: 'rgba(16,185,129,0.05)', borderLeft: '3px solid var(--accent-emerald)', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                        <span>Score: {task.score}/100</span>
                        <span>Evaluated by Mentor</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}><strong>Feedback:</strong> {task.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opportunity Discovery Hub */}
        <div className="glass-card">
          <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase color="var(--accent-primary)" size={20} /> Discover Opportunities
          </h3>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by title, company, skills (e.g. React, Remote)..." 
              className="form-input" 
              style={{ paddingLeft: '48px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredOpportunities.map(opp => {
              const hasApplied = applications.some(app => app.opportunityId === opp.id);
              return (
                <div key={opp.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent-secondary)', fontWeight: 600 }}>{opp.category}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opp.mode}</span>
                  </div>
                  <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>{opp.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{opp.company}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', flexGrow: 1 }}>{opp.description}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {opp.skills.map((skill, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                      {opp.stipend > 0 ? `₹${opp.stipend}/mo` : 'Unpaid'}
                    </span>
                    <button 
                      className={hasApplied ? "btn-secondary" : "btn-primary"} 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={hasApplied}
                      onClick={() => onApply(opp.id)}
                    >
                      {hasApplied ? 'Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: Profile Showcase & Projects Builder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Skills Management Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="var(--accent-purple)" /> Skills Showcase
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {skills.map((skill, idx) => (
              <span key={idx} style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: '#d8b4fe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {skill}
                <Trash2 
                  size={12} 
                  style={{ cursor: 'pointer', opacity: 0.7 }} 
                  onClick={() => handleRemoveSkill(skill)}
                />
              </span>
            ))}
          </div>
          <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Add skill..." 
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '13px' }}
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Project Management Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-secondary)" /> Projects Showcase
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {projects.map((proj, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {proj.title}
                  {proj.github && (
                    <a href={proj.github} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '11px', opacity: 0.6 }}>[GitHub]</span>
                    </a>
                  )}
                </h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{proj.desc}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Project Title" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '13px' }}
              value={projTitle}
              onChange={e => setProjTitle(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Brief Description" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '13px' }}
              value={projDesc}
              onChange={e => setProjDesc(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="GitHub Repo URL" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '13px' }}
              value={projGithub}
              onChange={e => setProjGithub(e.target.value)}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '8px', fontSize: '13px' }}>
              Add Project
            </button>
          </form>
        </div>

        {/* Application Pipeline */}
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>My Applications</h3>
          {applications.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You haven't applied to any opportunities yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {applications.map(app => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 600 }}>{app.opportunityTitle}</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{app.company}</p>
                  </div>
                  <span className={`badge badge-${app.status}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
