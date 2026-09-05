import React, { useState } from 'react';
import { User, Briefcase, GraduationCap, School, X, ShieldCheck } from 'lucide-react';

interface AuthOverlayProps {
  onClose: () => void;
  onAuthenticate: (role: string) => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onClose, onAuthenticate }) => {
  const [selectedRole, setSelectedRole] = useState<string>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Simulate Clerk auth token generation and role assignment
      onAuthenticate(selectedRole);
    } else {
      alert('Please fill out all credentials');
    }
  };

  return (
    <div className="auth-overlay animate-fade-in">
      <div className="auth-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '20px' }}>{isSignUp ? 'Create SkillBridge Account' : 'Log In to SkillBridge'}</h3>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', textAlign: 'left' }}>
          Authentication powered by <strong>Clerk Auth</strong>. Please select your system role to customize your workspace dashboard.
        </p>

        {/* Role Selection Option */}
        <div style={{ textAlign: 'left', marginBottom: '10px' }}>
          <label className="form-label">Choose Role</label>
        </div>
        <div className="role-selector-grid">
          {[
            { id: 'student', title: 'Student', icon: <User size={18} /> },
            { id: 'mentor', title: 'Mentor', icon: <GraduationCap size={18} /> },
            { id: 'school', title: 'School', icon: <School size={18} /> },
            { id: 'company', title: 'Company', icon: <Briefcase size={18} /> }
          ].map(role => (
            <div 
              key={role.id} 
              className={`role-select-card ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              {role.icon}
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{role.title}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              className="form-input" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="form-input" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-blue-grad" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
            {isSignUp ? 'Sign Up with Clerk' : 'Sign In with Clerk'}
          </button>
        </form>

        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>{' '}
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Log In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
