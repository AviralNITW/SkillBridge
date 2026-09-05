import React, { useState } from 'react';
import { ShieldAlert, Activity, Server, Database, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  ip: string;
  time: string;
}

export const AdminDashboard: React.FC = () => {
  const [logs] = useState<AuditLog[]>([
    { id: '1', user: 'admin@skillbridge.com', action: 'Approved Company: DP World Logistics', ip: '192.168.1.104', time: '2026-06-20 14:20:00' },
    { id: '2', user: 'student@example.com', action: 'Registered: Student Aviral Mishra', ip: '192.168.1.112', time: '2026-06-20 14:15:32' },
    { id: '3', user: 'mentor@gmail.com', action: 'Issued Certificate ID: SB-7294-A82', ip: '10.0.4.82', time: '2026-06-20 13:58:12' },
    { id: '4', user: 'recruiter@dpworld.com', action: 'Posted Opportunity: Frontend Intern', ip: '192.168.10.15', time: '2026-06-20 13:22:45' }
  ]);

  const [cacheHitRate, setCacheHitRate] = useState(94);
  const [cpuUsage, setCpuUsage] = useState(34);
  const [dbConn, setDbConn] = useState(12);

  const triggerMockReload = () => {
    setCacheHitRate(Math.floor(Math.random() * 8) + 90);
    setCpuUsage(Math.floor(Math.random() * 20) + 20);
    setDbConn(Math.floor(Math.random() * 5) + 10);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Welcome Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px' }}>System Administrator Panel</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Monitor infrastructure metrics, audit trails, and moderate account activities.</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', gap: '6px' }} onClick={triggerMockReload}>
          <RefreshCw size={16} /> Hot Reload Metrics
        </button>
      </div>

      {/* Grid: Health indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Express API Server CPU</span>
            <Activity size={18} color="var(--accent-secondary)" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: 800 }}>{cpuUsage}%</h3>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cpuUsage}%`, background: 'var(--accent-secondary)' }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Redis Cache Hit Rate</span>
            <Server size={18} color="var(--accent-purple)" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: 800 }}>{cacheHitRate}%</h3>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cacheHitRate}%`, background: 'var(--accent-purple)' }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>PostgreSQL Pool Connections</span>
            <Database size={18} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: 800 }}>{dbConn} active</h3>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(dbConn/50)*100}%`, background: 'var(--accent-emerald)' }} />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="var(--accent-rose)" /> Security Audit Logs (Retention 365 Days)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Operator</th>
                <th>Action Captured</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>SB-0{log.id}</td>
                  <td style={{ fontWeight: 600 }}>{log.user}</td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      background: log.action.includes('Approved') ? 'rgba(16, 185, 129, 0.1)' : log.action.includes('Registered') ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: log.action.includes('Approved') ? 'var(--accent-emerald)' : log.action.includes('Registered') ? 'var(--accent-secondary)' : 'var(--text-primary)'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.ip}</td>
                  <td>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
