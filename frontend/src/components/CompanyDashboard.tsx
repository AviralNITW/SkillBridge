import React, { useState } from 'react';
import { Plus, Briefcase, Users, FileText, CheckCircle, XCircle } from 'lucide-react';

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
  studentName: string;
  studentSkills: string[];
  employabilityScore: number;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed';
  appliedDate: string;
  resumeUrl: string;
}

interface CompanyDashboardProps {
  opportunities: Opportunity[];
  applications: Application[];
  onPostOpportunity: (opp: Omit<Opportunity, 'id' | 'company'>) => void;
  onUpdateStatus: (appId: string, status: Application['status']) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  opportunities,
  applications,
  onPostOpportunity,
  onUpdateStatus
}) => {
  // Local states for posting job form
  const [showPostForm, setShowPostForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Internship');
  const [mode, setMode] = useState('Remote');
  const [stipend, setStipend] = useState(5000);
  const [skillsStr, setSkillsStr] = useState('');

  // Selected applicant for split screen review
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    applications.length > 0 ? applications[0].id : null
  );

  const handleSubmitOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && desc) {
      onPostOpportunity({
        title,
        description: desc,
        category,
        mode,
        stipend: Number(stipend),
        skills: skillsStr.split(',').map(s => s.trim()).filter(Boolean)
      });
      setTitle('');
      setDesc('');
      setSkillsStr('');
      setShowPostForm(false);
    }
  };

  const selectedApp = applications.find(app => app.id === (selectedAppId || (applications.length > 0 ? applications[0].id : null)));

  return (
    <div className="animate-fade-in" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      {/* Top Banner Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '26px' }}>DP World Recruitment Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage opportunity listings, review student credentials, and shortlist candidates.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPostForm(!showPostForm)}>
          <Plus size={18} /> {showPostForm ? 'Close Form' : 'Post New Opportunity'}
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', borderRadius: '10px' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Postings</p>
            <h4 style={{ fontSize: '22px' }}>{opportunities.length}</h4>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)', borderRadius: '10px' }}>
            <Users size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Applications</p>
            <h4 style={{ fontSize: '22px' }}>{applications.length}</h4>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '10px' }}>
            <FileText size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Reviews</p>
            <h4 style={{ fontSize: '22px' }}>{applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length}</h4>
          </div>
        </div>
      </div>

      {/* Post Opportunity Form Toggle */}
      {showPostForm && (
        <form onSubmit={handleSubmitOpp} className="glass-card animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '10px' }}>Post New Job/Internship</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Opportunity Title</label>
            <input type="text" className="form-input" placeholder="e.g. Backend Dev Intern" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Internship">Internship</option>
              <option value="Apprenticeship">Apprenticeship</option>
              <option value="Project">Project</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Job Description</label>
            <textarea className="form-input" rows={4} placeholder="Roles, projects to be executed, requirements..." value={desc} onChange={e => setDesc(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Stipend (INR/mo, 0 if unpaid)</label>
            <input type="number" className="form-input" value={stipend} onChange={e => setStipend(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Mode</label>
            <select className="form-input" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Required Skills (Comma separated)</label>
            <input type="text" className="form-input" placeholder="e.g. React, Node.js, REST API" value={skillsStr} onChange={e => setSkillsStr(e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowPostForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Post Opportunity</button>
          </div>
        </form>
      )}

      {/* Split Pane Recruiter Reviewer */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '30px', minHeight: '500px' }}>
        
        {/* Left Side: Applicants List */}
        <div className="glass-card" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Applicants</h3>
          {applications.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', margin: '40px 0' }}>No applications received yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '450px' }}>
              {applications.map(app => (
                <div 
                  key={app.id} 
                  style={{
                    background: selectedApp?.id === app.id ? 'rgba(79,70,229,0.1)' : 'rgba(255,255,255,0.02)',
                    border: selectedApp?.id === app.id ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedAppId(app.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{app.studentName}</h5>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                      Score: {app.employabilityScore}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{app.opportunityTitle}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.appliedDate}</span>
                    <span className={`badge badge-${app.status}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Selected Applicant Detailed View */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedApp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', marginBottom: '4px' }}>{selectedApp.studentName}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Applied for: <strong>{selectedApp.opportunityTitle}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => onUpdateStatus(selectedApp.id, 'under_review')}>
                    Under Review
                  </button>
                  <button className="btn-primary" style={{ padding: '8px 12px', fontSize: '13px', background: 'var(--accent-emerald)', color: 'white' }} onClick={() => onUpdateStatus(selectedApp.id, 'accepted')}>
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }} onClick={() => onUpdateStatus(selectedApp.id, 'rejected')}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Qualifications & Skills</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {selectedApp.studentSkills.map((skill, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 10px', fontSize: '12px' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>Employability Quotient:</strong> {selectedApp.employabilityScore}/100. High match probability based on academic alignment.
                  </p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <FileText size={48} color="var(--accent-secondary)" style={{ marginBottom: '12px' }} />
                  <h5 style={{ fontSize: '14px', marginBottom: '4px' }}>resume_academic_v1.pdf</h5>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Verified PDF • 2.4 MB</p>
                  <a href={selectedApp.resumeUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    View Uploaded Resume
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, color: 'var(--text-muted)' }}>
              <Users size={48} style={{ marginBottom: '12px' }} />
              <p>Select an applicant from the left sidebar to view their credentials.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
