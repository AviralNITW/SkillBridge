import React, { useState } from 'react';
import { Download, Users, FileText, CheckCircle, Search } from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string;
  department: string;
  cgpa: number;
  skillsCount: number;
  internshipStatus: string;
  employabilityScore: number;
}

export const SchoolDashboard: React.FC = () => {
  const [students] = useState<StudentProfile[]>([
    { id: '1', name: 'Aviral Mishra', department: 'Computer Science', cgpa: 9.1, skillsCount: 8, internshipStatus: 'Active - Geopolitical intelligence', employabilityScore: 88 },
    { id: '2', name: 'Rohan Sharma', department: 'Information Technology', cgpa: 8.4, skillsCount: 5, internshipStatus: 'Under Review - DP World', employabilityScore: 72 },
    { id: '3', name: 'Ananya Gupta', department: 'Computer Science', cgpa: 9.5, skillsCount: 12, internshipStatus: 'Completed - IBM AI Lab', employabilityScore: 95 },
    { id: '4', name: 'Kabir Singh', department: 'Electronics', cgpa: 7.2, skillsCount: 3, internshipStatus: 'Not Placed', employabilityScore: 50 },
    { id: '5', name: 'Priya Patel', department: 'Electrical', cgpa: 8.0, skillsCount: 4, internshipStatus: 'Under Review - Amazon', employabilityScore: 68 }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const filteredStudents = students.filter(st => 
    st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Upper Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Enrolled Students</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>120</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderRadius: '12px' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Placement Rate</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>80%</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)', borderRadius: '12px' }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Verified Certs</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>164</h3>
          </div>
        </div>
      </div>

      {/* Middle Split Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '30px' }}>
        
        {/* Student Progress Monitoring Grid */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ fontSize: '20px' }}>Student Lifecycle Monitor</h3>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search students..." 
                className="form-input"
                style={{ paddingLeft: '36px', padding: '6px 12px 6px 36px', fontSize: '13px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>CGPA</th>
                  <th>Skills</th>
                  <th>Status</th>
                  <th>Employability Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td>{student.department}</td>
                    <td>{student.cgpa}</td>
                    <td>{student.skillsCount} Verified</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: student.internshipStatus.includes('Active') ? 'rgba(79, 70, 229, 0.15)' : student.internshipStatus.includes('Completed') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: student.internshipStatus.includes('Active') ? '#818cf8' : student.internshipStatus.includes('Completed') ? '#34d399' : 'var(--text-secondary)'
                      }}>
                        {student.internshipStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                          <div style={{ height: '100%', width: `${student.employabilityScore}%`, background: 'var(--accent-secondary)' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{student.employabilityScore}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Exporter Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '18px' }}>Academic Reports</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Export institution performance statistics, student portfolios, and certificate indices compiled into credit reports for NEP compliance validation.
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleExport}>
              <Download size={18} /> Export Credit Data (CSV)
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={handleExport}>
              <Download size={18} /> Export PDF Handout
            </button>

            {exportSuccess && (
              <span className="animate-fade-in" style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600, textAlign: 'center' }}>
                ✓ Export successfully generated. Ready for download.
              </span>
            )}
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Industry Partners</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'DP World', activeCount: '12 active interns', category: 'Logistics Tech' },
                { name: 'Geopolitical Intelligence Group', activeCount: '4 active interns', category: 'Analytics' },
                { name: 'IBM Developer Labs', activeCount: '25 active interns', category: 'Enterprise Tech' }
              ].map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.category}</p>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--accent-secondary)' }}>{p.activeCount}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
