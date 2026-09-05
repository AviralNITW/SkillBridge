import React from 'react';
import { ShieldCheck, ArrowRight, Search, BarChart2, CheckSquare, Star, Award, Globe, GraduationCap, Users, Building, FileText } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: string) => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole, onOpenAuth }) => {
  return (
    <div className="landing-page animate-fade-in">
      
      {/* Hero Section */}
      <section id="home" className="hero-section">
        
        {/* Left Side Info */}
        <div className="hero-left">
          <div className="nep-badge">
            <ShieldCheck size={14} /> NEP 2020 Aligned
          </div>
          
          <h1 className="hero-h1">
            Bridge Learning to<br />
            <span className="grad-text">Real Opportunities</span>
          </h1>
          
          <p className="hero-sub">
            SkillBridge connects students with internships, apprenticeships, industry projects, mentors, and verified certificates to build future-ready careers.
          </p>
          
          <div className="hero-ctas">
            <button className="btn-primary-hero" onClick={onOpenAuth}>
              Get Started for Free <ArrowRight size={16} />
            </button>
            <button className="btn-secondary-hero" onClick={() => onSelectRole('student')}>
              Explore Opportunities <ArrowRight size={16} />
            </button>
          </div>
          
          {/* Trusted Companies */}
          <div className="trust-bar">
            <p className="trust-label">Trusted by 500+ institutions & leading companies</p>
            <div className="trust-logos">
              <span className="trust-logo">Google</span>
              <span className="trust-logo" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/></svg> Microsoft
              </span>
              <span className="trust-logo">Deloitte.</span>
              <span className="trust-logo">tcs</span>
              <span className="trust-logo">Infosys</span>
              <span className="trust-logo">wipro</span>
            </div>
          </div>
        </div>

        {/* Right Side Visual Orbit */}
        <div className="hero-right">
          <div className="orbit-wrap">
            <div className="orbit-scene">
              <div className="orbit-ring r1"></div>
              <div className="orbit-ring r2"></div>
              <div className="orbit-ring r3"></div>
            </div>

            {/* Glowing neon side rail lines representing the bridge */}
            <svg style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', overflow: 'visible', pointerEvents: 'none' }} width="480" height="200" viewBox="0 0 480 200" fill="none">
              <path d="M 20 200 Q 240 80 460 200" stroke="rgba(255,255,255,0.02)" strokeWidth="36" strokeLinecap="round" />
              <path d="M 20 200 Q 240 80 460 200" stroke="url(#roadGrad)" strokeWidth="20" strokeLinecap="round" />
              <path d="M 28 195 Q 240 85 452 195" stroke="#6366f1" strokeWidth="2.5" filter="drop-shadow(0 0 5px #6366f1)" />
              <path d="M 38 190 Q 240 90 442 190" stroke="#06b6d4" strokeWidth="1.5" filter="drop-shadow(0 0 5px #06b6d4)" />
              <defs>
                <linearGradient id="roadGrad" x1="50%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
                </linearGradient>
              </defs>
            </svg>

            <div className="orbit-glow-path"></div>
            
            <div className="orbit-people">
              {/* Walking people silhouettes */}
              <svg width="100" height="40" viewBox="0 0 100 40">
                <g transform="translate(10, 10) scale(0.6)"><circle cx="10" cy="5" r="3" fill="#fff" opacity="0.8" /><path d="M7,8 L13,8 L11,18 L9,18 Z" fill="#fff" opacity="0.8" /><line x1="8" y1="18" x2="6" y2="24" stroke="#fff" strokeWidth="2" opacity="0.8" /><line x1="12" y1="18" x2="14" y2="24" stroke="#fff" strokeWidth="2" opacity="0.8" /></g>
                <g transform="translate(45, 12) scale(0.6)"><circle cx="10" cy="5" r="3" fill="#fff" opacity="0.8" /><path d="M7,8 L13,8 L11,18 L9,18 Z" fill="#fff" opacity="0.8" /><line x1="9" y1="18" x2="9" y2="25" stroke="#fff" strokeWidth="2" opacity="0.8" /><line x1="11" y1="18" x2="12" y2="25" stroke="#fff" strokeWidth="2" opacity="0.8" /></g>
                <g transform="translate(80, 5) scale(0.4)"><circle cx="10" cy="5" r="3" fill="#fff" opacity="0.9" /><path d="M7,8 L13,8 L11,18 L9,18 Z" fill="#fff" opacity="0.9" /><line x1="8" y1="18" x2="7" y2="24" stroke="#fff" strokeWidth="2" opacity="0.9" /><line x1="12" y1="18" x2="13" y2="24" stroke="#fff" strokeWidth="2" opacity="0.9" /></g>
              </svg>
            </div>

            <div className="orbit-center">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" fill="#fff" />
                <path d="M16 8L22 11.5V14.5L16 11L11.5 13.5V18.5L16 21L20.5 18.5V16H23.5V20.5L16 25L8.5 20.5V11.5L16 8Z" fill="#3b82f6" />
              </svg>
            </div>

            {/* Orbiting Nodes */}
            <div className="orbit-node" style={{ top: '8%', left: '50%', transform: 'translateX(-50%)', borderColor: 'rgba(168,85,247,0.4)' }}>
              <div className="orbit-node-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                <GraduationCap size={14} />
              </div>
              <div className="orbit-node-text">
                <strong>Mentors</strong>
                <span>Guide & Evaluate</span>
              </div>
            </div>

            <div className="orbit-node" style={{ top: '30%', left: '-10px', borderColor: 'rgba(6,182,212,0.4)' }}>
              <div className="orbit-node-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                <Users size={14} />
              </div>
              <div className="orbit-node-text">
                <strong>Students</strong>
                <span>Learn & Grow</span>
              </div>
            </div>

            <div className="orbit-node" style={{ top: '30%', right: '-10px', borderColor: 'rgba(245,158,11,0.4)' }}>
              <div className="orbit-node-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <Building size={14} />
              </div>
              <div className="orbit-node-text">
                <strong>Companies</strong>
                <span>Hire & Collaborate</span>
              </div>
            </div>

            <div className="orbit-node" style={{ bottom: '25%', left: '-5%', borderColor: 'rgba(37,99,235,0.4)' }}>
              <div className="orbit-node-icon" style={{ background: 'rgba(37,99,235,0.15)', color: '#3b82f6' }}>
                <Building size={14} />
              </div>
              <div className="orbit-node-text">
                <strong>Institutions</strong>
                <span>Nurture & Track</span>
              </div>
            </div>

            <div className="orbit-node" style={{ bottom: '25%', right: '-5%', borderColor: 'rgba(168,85,247,0.4)' }}>
              <div className="orbit-node-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                <Award size={14} />
              </div>
              <div className="orbit-node-text">
                <strong>Certificates</strong>
                <span>Verify & Showcase</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="metrics-section">
        <div className="metrics-inner">
          <div className="metric-cell">
            <div className="metric-icon-wrap" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="metric-num">120K+</div>
              <div className="metric-label">Students Empowered</div>
            </div>
          </div>

          <div className="metric-cell">
            <div className="metric-icon-wrap" style={{ background: 'rgba(37,99,235,0.1)', color: '#3b82f6' }}>
              <Building size={24} />
            </div>
            <div>
              <div className="metric-num">18K+</div>
              <div className="metric-label">Opportunities Available</div>
            </div>
          </div>

          <div className="metric-cell">
            <div className="metric-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <Award size={24} />
            </div>
            <div>
              <div className="metric-num">45K+</div>
              <div className="metric-label">Certificates Issued</div>
            </div>
          </div>

          <div className="metric-cell">
            <div className="metric-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <BarChart2 size={24} />
            </div>
            <div>
              <div className="metric-num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                92% <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 9-11 4 4 6-8"/><path d="M14 2h8v8"/></svg>
              </div>
              <div className="metric-label">Employability Growth</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="opportunities" className="section-wrap">
        <div className="section-header">
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-sub">Powerful features designed to accelerate your career journey</p>
        </div>

        <div className="features-grid">
          {[
            { icon: <Search size={20} color="var(--accent-purple)" />, title: 'Opportunity Marketplace', desc: 'Discover internships, apprenticeships and projects tailored for you.' },
            { icon: <BarChart2 size={20} color="var(--accent-blue)" />, title: 'Internship Tracking', desc: 'Track applications and progress in real-time.' },
            { icon: <CheckSquare size={20} color="var(--accent-green)" />, title: 'Task Management', desc: 'Complete tasks, submit deliverables and get feedback.' },
            { icon: <Star size={20} color="var(--accent-gold)" />, title: 'Assessments & Evaluation', desc: 'Skill assessments and mentor evaluations to measure growth.' },
            { icon: <Award size={20} color="var(--accent-purple)" />, title: 'Digital Certificates', desc: 'Earn verifiable certificates with QR code authentication.' },
            { icon: <Globe size={20} color="var(--accent-cyan)" />, title: 'Public Portfolio', desc: 'Showcase your skills, projects and certificates to the world.' }
          ].map((feat, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon-box" style={{ background: `rgba(255,255,255,0.03)` }}>
                {feat.icon}
              </div>
              <h4 className="feature-title">{feat.title}</h4>
              <p className="feature-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles / Audience Section */}
      <section id="institutions" className="audience-section">
        <div className="audience-inner">
          <div className="section-header">
            <h2 className="section-title">A Platform for Everyone</h2>
            <p className="section-sub">Join a community that empowers every role in the ecosystem</p>
          </div>

          <div className="role-cards-grid">
            <div className="role-card">
              <div className="role-card-label">For Students</div>
              <h4 className="role-card-title">Build skills</h4>
              <p className="role-card-desc">Gain experience and kickstart your career.</p>
              <button className="role-card-btn blue" onClick={() => onSelectRole('student')}>Join Now</button>
              <img src="/student.png" alt="Student" className="role-card-img" />
            </div>

            <div className="role-card">
              <div className="role-card-label">For Institutions</div>
              <h4 className="role-card-title">Track progress</h4>
              <p className="role-card-desc">Track student progress and improve placement outcomes.</p>
              <button className="role-card-btn blue" onClick={() => onSelectRole('school')}>Join Now</button>
              <img src="/institution.png" alt="Institution" className="role-card-img" />
            </div>

            <div className="role-card">
              <div className="role-card-label">For Companies</div>
              <h4 className="role-card-title">Hire talent</h4>
              <p className="role-card-desc">Find, assess and hire top student talent.</p>
              <button className="role-card-btn orange" onClick={() => onSelectRole('company')}>Join Now</button>
              <img src="/company.png" alt="Company" className="role-card-img" />
            </div>

            <div className="role-card">
              <div className="role-card-label">For Mentors</div>
              <h4 className="role-card-title">Make impact</h4>
              <p className="role-card-desc">Guide students, evaluate skills and make an impact.</p>
              <button className="role-card-btn green" onClick={() => onSelectRole('mentor')}>Join Now</button>
              <img src="/mentor.png" alt="Mentor" className="role-card-img" />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
