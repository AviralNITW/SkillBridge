import React, { useState } from 'react';
import { Award, BookOpen, Clock } from 'lucide-react';

interface Deliverable {
  id: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  submissionUrl: string;
  status: 'assigned' | 'submitted' | 'reviewed';
}

interface StudentCertData {
  id: string;
  studentName: string;
  internshipTitle: string;
  company: string;
  status: 'eligible' | 'issued';
}

interface MentorDashboardProps {
  deliverables: Deliverable[];
  certificates: StudentCertData[];
  onGradeSubmission: (id: string, score: number, feedback: string) => void;
  onIssueCertificate: (id: string) => void;
}

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  deliverables,
  certificates,
  onGradeSubmission,
  onIssueCertificate
}) => {
  // Local state for grading
  const [selectedDelivId, setSelectedDelivId] = useState<string | null>(null);
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState('');

  const activeGradingItem = deliverables.find(d => d.id === selectedDelivId);

  const handleSubmitGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDelivId) {
      onGradeSubmission(selectedDelivId, score, feedback);
      setSelectedDelivId(null);
      setFeedback('');
      setScore(85);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Welcome Banner */}
      <div>
        <h2 style={{ fontSize: '26px' }}>Mentor Workspace</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Review tasks, evaluate student deliverables, and sign credentials for credit compliance.</p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', borderRadius: '10px' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assigned Students</p>
            <h4 style={{ fontSize: '22px' }}>{certificates.length}</h4>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Grading</p>
            <h4 style={{ fontSize: '22px' }}>{deliverables.filter(d => d.status === 'submitted').length}</h4>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderRadius: '10px' }}>
            <Award size={20} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Signed Credentials</p>
            <h4 style={{ fontSize: '22px' }}>{certificates.filter(c => c.status === 'issued').length}</h4>
          </div>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px' }}>
        
        {/* Deliverables Grading Queue */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px' }}>Deliverables Evaluation Queue</h3>
          {deliverables.filter(d => d.status === 'submitted').length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '40px 0', textAlign: 'center' }}>
              ✓ All submissions graded! There are no tasks pending review.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deliverables.filter(d => d.status === 'submitted').map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{d.studentName}</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Task: {d.taskTitle}</p>
                    <a href={d.submissionUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>
                      View Deliverable Link
                    </a>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedDelivId(d.id)}>
                    Grade Task
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Grading Modal Form (Inline) */}
          {activeGradingItem && (
            <form onSubmit={handleSubmitGrade} className="glass-card animate-fade-in" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--accent-primary)', marginTop: '20px' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Grading: {activeGradingItem.studentName} - {activeGradingItem.taskTitle}</h4>
              <div className="form-group">
                <label className="form-label">Performance Score (0 - 100)</label>
                <input type="number" min={0} max={100} className="form-input" value={score} onChange={e => setScore(Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Qualitative Feedback</label>
                <textarea className="form-input" rows={3} placeholder="Feedback on architecture, code quality, or alignment..." value={feedback} onChange={e => setFeedback(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedDelivId(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Submit Grade</button>
              </div>
            </form>
          )}
        </div>

        {/* Certificate Issuance Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Verified Credentials Manager</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {certificates.map(cert => (
              <div key={cert.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 600 }}>{cert.studentName}</h5>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cert.internshipTitle} ({cert.company})</p>
                </div>
                {cert.status === 'eligible' ? (
                  <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--accent-emerald)' }} onClick={() => onIssueCertificate(cert.id)}>
                    Sign & Issue
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: 600 }}>Issued ✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
