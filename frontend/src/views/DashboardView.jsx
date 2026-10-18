// frontend/src/views/DashboardView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  DoorOpen, 
  Coffee, 
  ClockAlert, 
  Video, 
  Calendar,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchStats = async () => {
    try {
      const res = await api.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading dashboard data...</div>;
  }

  const kpis = [
    {
      label: 'Present Today',
      value: stats?.present_count || 0,
      sub: 'Marked attendance',
      icon: UserCheck,
      color: '#10b981',
      bg: 'var(--status-present-bg)',
      tab: 'timesheet'
    },
    {
      label: 'Currently Inside',
      value: stats?.currently_inside || 0,
      sub: 'Inside office / class',
      icon: DoorOpen,
      color: '#0284c7',
      bg: 'var(--status-inside-bg)',
      tab: 'timesheet'
    },
    {
      label: 'Out on Break',
      value: stats?.out_on_break || 0,
      sub: 'Currently outside',
      icon: Coffee,
      color: '#f59e0b',
      bg: 'var(--status-late-bg)',
      tab: 'timesheet'
    },
    {
      label: 'Late Arrivals',
      value: stats?.late_count || 0,
      sub: 'Past grace period',
      icon: ClockAlert,
      color: '#f43f5e',
      bg: 'var(--status-undertime-bg)',
      tab: 'timesheet'
    },
    {
      label: 'Total Staff / Users',
      value: stats?.total_users || 0,
      sub: 'Active registered',
      icon: Users,
      color: '#8b5cf6',
      bg: 'var(--status-halfday-bg)',
      tab: 'users'
    },
    {
      label: 'CCTV Cameras',
      value: `${stats?.online_cameras || 1}/${stats?.total_cameras || 2}`,
      sub: 'RTSP Stream Online',
      icon: Video,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.15)',
      tab: 'cameras'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <TrendingUp size={26} color="var(--menu-accent)" />
            Real-Time Attendance Overview
          </h2>
          <p className="page-desc">
            Live metrics, occupancy, multi-trip status, and hardware health for {todayStr}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('monitor')}>
            <Video size={16} />
            Go to Live Camera Monitor
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-cols-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.75rem' }}>
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className="card" 
              style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onClick={() => onNavigate(kpi.tab)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {kpi.sub}
                  </div>
                </div>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: kpi.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={22} color={kpi.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        {/* Hardware Status & Gate Overview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--menu-accent)" />
              Active Camera Gate Pairings
            </h3>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onNavigate('cameras')}>
              Manage Gates <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Gate 1: Main Reception Door</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  IN: 192.168.100.113 (Port 554 RTSP) • OUT: 192.168.100.114
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-present">ONLINE</span>
                <span className="badge badge-inside">GATE ACTIVE</span>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-muted)' }}>Gate 2: Parking / Back Door</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Supports adding unlimited gates as your facility expands.
                </div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={() => onNavigate('cameras')}>
                + Add Gate Pair
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links & Info */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            System Quick Launch
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '0.85rem 1rem' }}
              onClick={() => onNavigate('timesheet')}
            >
              <span>View Full Daily Timesheet</span>
              <ArrowRight size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '0.85rem 1rem' }}
              onClick={() => onNavigate('users')}
            >
              <span>Enroll New Face / Register Staff</span>
              <ArrowRight size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '0.85rem 1rem' }}
              onClick={() => onNavigate('hr_sync')}
            >
              <span>Sync with HR Solution (hr_solution_db)</span>
              <ArrowRight size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '0.85rem 1rem' }}
              onClick={() => onNavigate('reports')}
            >
              <span>Export Monthly Attendance Reports</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
