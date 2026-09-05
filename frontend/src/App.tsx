import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { StudentDashboard } from './components/StudentDashboard';
import { SchoolDashboard } from './components/SchoolDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { MentorDashboard } from './components/MentorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthOverlay } from './components/AuthOverlay';
import { Laptop, Moon, Sun, LogOut } from 'lucide-react';
import './App.css';

// Mock DB
const initialOpportunities = [
  { id: '1', title: 'React Frontend Developer', description: 'Collaborate on designing beautiful, responsive, and interactive user interfaces.', company: 'DP World Logistics', category: 'Internship', mode: 'Remote', stipend: 12000, skills: ['React', 'TypeScript', 'CSS Grid'] },
  { id: '2', title: 'Geopolitical Risk Analyst', description: 'Analyze geopolitical risk factors and construct real-time dashboards.', company: 'GeoStockLive Labs', category: 'Project', mode: 'Hybrid', stipend: 8000, skills: ['FastAPI', 'Python', 'Data Analytics'] },
  { id: '3', title: 'UI/UX Visual Designer', description: 'Craft wireframes, interactive animations, and gorgeous user experiences.', company: 'DP World Logistics', category: 'Internship', mode: 'On-site', stipend: 15000, skills: ['Figma', 'UI Design', 'Prototyping'] },
  { id: '4', title: 'Data Engineering Associate', description: 'Build and schedule real-time streaming pipeline frameworks.', company: 'GeoStockLive Labs', category: 'Apprenticeship', mode: 'Remote', stipend: 10000, skills: ['Redis', 'PostgreSQL', 'Docker'] }
];

const initialApplications = [
  { id: 'app1', opportunityId: '1', opportunityTitle: 'React Frontend Developer', company: 'DP World Logistics', studentName: 'Aviral Mishra', studentSkills: ['React', 'TypeScript', 'Node.js', 'FastAPI'], employabilityScore: 88, status: 'submitted', appliedDate: '2026-06-20', resumeUrl: '#' },
  { id: 'app2', opportunityId: '2', opportunityTitle: 'Geopolitical Risk Analyst', company: 'GeoStockLive Labs', studentName: 'Priya Patel', studentSkills: ['Python', 'SQL', 'FastAPI'], employabilityScore: 78, status: 'under_review', appliedDate: '2026-06-19', resumeUrl: '#' }
] as any[];

const initialTasks = [
  { id: 't1', title: 'Build Landing Hero UI', description: 'Build an interactive glassmorphic landing component matching the Figma wireframes.', dueDate: '2026-06-25', status: 'assigned' },
  { id: 't2', title: 'Verify Express API Endpoints', description: 'Write unit test routes matching the OpenAPI v1 contract specification.', dueDate: '2026-06-22', status: 'reviewed', score: 92, feedback: 'Great job handling edge exceptions and JWT validation check.', submissionUrl: 'https://github.com/student/express-api' }
] as any[];

const initialCertificates = [
  { id: 'c1', studentName: 'Aviral Mishra', internshipTitle: 'React Frontend Developer', company: 'DP World Logistics', status: 'eligible' },
  { id: 'c2', studentName: 'Ananya Gupta', internshipTitle: 'AI Research Apprentice', company: 'IBM Developer Labs', status: 'issued' }
] as any[];

function App() {
  const [activeRole, setActiveRole] = useState<string>('landing');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{ email: string; role: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Core Simulation States
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [applications, setApplications] = useState(initialApplications);
  const [tasks, setTasks] = useState(initialTasks);
  const [certificates, setCertificates] = useState(initialCertificates);

  const handleApplyOpportunity = (opportunityId: string) => {
    const opp = opportunities.find(o => o.id === opportunityId);
    if (opp) {
      const newApp = {
        id: `app_${Date.now()}`,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        company: opp.company,
        studentName: 'Aviral Mishra',
        studentSkills: ['React', 'TypeScript', 'Node.js', 'FastAPI'],
        employabilityScore: 88,
        status: 'submitted',
        appliedDate: new Date().toISOString().split('T')[0],
        resumeUrl: '#'
      };
      setApplications([newApp, ...applications]);
      alert(`Applied successfully to "${opp.title}"!`);
    }
  };

  const handlePostOpportunity = (oppData: any) => {
    const newOpp = {
      id: `opp_${Date.now()}`,
      company: 'DP World Logistics',
      ...oppData
    };
    setOpportunities([newOpp, ...opportunities]);
    alert(`Opportunity "${oppData.title}" posted successfully!`);
  };

  const handleUpdateApplicationStatus = (appId: string, status: any) => {
    setApplications(applications.map(app => 
      app.id === appId ? { ...app, status } : app
    ));

    if (status === 'accepted') {
      const activeApp = applications.find(a => a.id === appId);
      const newTask = {
        id: `task_${Date.now()}`,
        title: `Onboarding Task - ${activeApp?.opportunityTitle}`,
        description: 'Complete the workspace initialization, connect your repository, and report to your mentor.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'assigned'
      };
      setTasks([newTask, ...tasks]);
    }
  };

  const handleSubmitTask = (taskId: string, url: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'submitted', submissionUrl: url } : task
    ));
    alert('Task deliverable submitted successfully!');
  };

  const handleGradeSubmission = (taskId: string, score: number, feedback: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'reviewed', score, feedback } : task
    ));
    alert('Submission evaluated successfully.');
  };

  const handleIssueCertificate = (certId: string) => {
    setCertificates(certificates.map(cert => 
      cert.id === certId ? { ...cert, status: 'issued' } : cert
    ));
    alert('Digital Certificate signed and registered on the registry.');
  };

  const handleAuthenticate = (role: string) => {
    setAuthenticatedUser({
      email: `${role}@skillbridge.com`,
      role: role
    });
    setActiveRole(role);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    setActiveRole('landing');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Simulation/Role Dev Bar (Visible in Dev/Mock Mode at the absolute top) */}
      <div style={{
        background: '#090b16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Laptop size={12} color="var(--accent-cyan)" />
          <span>DEV SIMULATION CONTROLS (Switch Role Directly)</span>
        </div>
        <div className="sim-tabs" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <button className={`sim-btn ${activeRole === 'landing' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setActiveRole('landing')}>
            Landing
          </button>
          <button className={`sim-btn ${activeRole === 'student' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setActiveRole('student')}>
            Student
          </button>
          <button className={`sim-btn ${activeRole === 'school' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setActiveRole('school'); setAuthenticatedUser({ email: 'school@skillbridge.com', role: 'school' }); }}>
            School
          </button>
          <button className={`sim-btn ${activeRole === 'company' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setActiveRole('company'); setAuthenticatedUser({ email: 'recruiter@skillbridge.com', role: 'company' }); }}>
            Recruiter
          </button>
          <button className={`sim-btn ${activeRole === 'mentor' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setActiveRole('mentor'); setAuthenticatedUser({ email: 'mentor@skillbridge.com', role: 'mentor' }); }}>
            Mentor
          </button>
          <button className={`sim-btn ${activeRole === 'admin' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setActiveRole('admin'); setAuthenticatedUser({ email: 'admin@skillbridge.com', role: 'admin' }); }}>
            Admin
          </button>
        </div>
      </div>

      {/* Main Website Header (matching mockup nav bar) */}
      <header className="header-nav">
        <div className="logo-wrap" onClick={() => setActiveRole('landing')}>
          <div className="logo-icon">
            <img src="file:///C:/Users/HP/.gemini/antigravity-ide/brain/157dae35-71fe-460f-a654-db4c6c3b1936/media__1781946188832.jpg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          </div>
          <span className="logo-text">SkillBridge</span>
        </div>

        <nav className="nav-center">
          <button className="nav-item" onClick={() => {
            setActiveRole('landing');
            setTimeout(() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}>Home</button>
          <button className="nav-item" onClick={() => {
            setActiveRole('landing');
            setTimeout(() => document.getElementById('opportunities')?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}>Opportunities <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
          <button className="nav-item" onClick={() => {
            setActiveRole('landing');
            setTimeout(() => document.getElementById('institutions')?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}>Institutions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
          <button className="nav-item" onClick={() => {
            setActiveRole('landing');
            setTimeout(() => document.getElementById('institutions')?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}>Mentors</button>
          <button className="nav-item">Resources <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
          <button className="nav-item">About Us</button>
        </nav>

        <div className="nav-right">
          <button className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          {authenticatedUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                {authenticatedUser.email} ({authenticatedUser.role})
              </span>
              <button className="btn-login" onClick={handleLogout}>
                <LogOut size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> Log Out
              </button>
            </div>
          ) : (
            <>
              <button className="btn-login" onClick={() => setIsAuthOpen(true)}>
                Log In
              </button>
              <button className="btn-get-started" onClick={() => setIsAuthOpen(true)}>
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex' }}>
        {activeRole === 'landing' && (
          <LandingPage 
            onSelectRole={(role) => {
              setActiveRole(role);
              setAuthenticatedUser({ email: `${role}@skillbridge.com`, role });
            }} 
            onOpenAuth={() => setIsAuthOpen(true)} 
          />
        )}
        
        {activeRole === 'student' && (
          <StudentDashboard 
            opportunities={opportunities} 
            applications={applications.filter(a => a.studentName === 'Aviral Mishra')} 
            tasks={tasks}
            onApply={handleApplyOpportunity}
            onSubmitTask={handleSubmitTask}
          />
        )}
        
        {activeRole === 'school' && <SchoolDashboard />}
        
        {activeRole === 'company' && (
          <CompanyDashboard 
            opportunities={opportunities.filter(o => o.company === 'DP World Logistics')}
            applications={applications}
            onPostOpportunity={handlePostOpportunity}
            onUpdateStatus={handleUpdateApplicationStatus}
          />
        )}
        
        {activeRole === 'mentor' && (
          <MentorDashboard 
            deliverables={tasks.map(t => ({
              id: t.id,
              studentId: 'stud1',
              studentName: 'Aviral Mishra',
              taskTitle: t.title,
              submissionUrl: t.submissionUrl || '',
              status: t.status
            }))}
            certificates={certificates}
            onGradeSubmission={handleGradeSubmission}
            onIssueCertificate={handleIssueCertificate}
          />
        )}
        
        {activeRole === 'admin' && <AdminDashboard />}
      </main>

      {/* Clerk Auth Overlay Popup */}
      {isAuthOpen && (
        <AuthOverlay 
          onClose={() => setIsAuthOpen(false)}
          onAuthenticate={handleAuthenticate}
        />
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '30px 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '13px',
        color: 'var(--text-muted)',
        background: '#060814'
      }}>
        © 2026 SkillBridge SaaS Ecosystem. Powered by Clerk Auth. Developed for National Hackability & NEP-2020 Compliance.
      </footer>
    </div>
  );
}

export default App;
