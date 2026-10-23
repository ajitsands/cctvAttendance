// frontend/src/views/ReportsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, 
  Download, 
  Printer, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  LogIn,
  LogOut,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  RefreshCw,
  Eye,
  Building,
  Table2
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import MonthlyMatrixReport from '../components/MonthlyMatrixReport';

export default function ReportsView() {
  // Date range defaults to last 7 days
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedUser, setSelectedUser] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  
  // Tab: 'matrix' (Monthly 1..31 days matrix), 'employees' (Rollup per employee) or 'daily' (Granular daily audit trail)
  const [activeTab, setActiveTab] = useState('matrix');
  const [activeQuickRange, setActiveQuickRange] = useState('7days');
  
  const [usersList, setUsersList] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all users for filter dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.getUsers();
        setUsersList(res.data || []);
      } catch (err) {
        console.error('Failed to load users for filter:', err);
      }
    };
    loadUsers();
  }, []);

  // Fetch report data on filter change
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports({
        start_date: startDate,
        end_date: endDate,
        user_id: selectedUser,
        department,
        status
      });
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedUser, department, status]);

  // Quick Date Range Helpers
  const setQuickRange = (rangeType) => {
    setActiveQuickRange(rangeType);
    const today = new Date();
    const formatDate = (d) => d.toISOString().slice(0, 10);

    if (rangeType === 'today') {
      const s = formatDate(today);
      setStartDate(s);
      setEndDate(s);
    } else if (rangeType === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = formatDate(y);
      setStartDate(s);
      setEndDate(s);
    } else if (rangeType === '7days') {
      const s = new Date(today);
      s.setDate(s.getDate() - 7);
      setStartDate(formatDate(s));
      setEndDate(formatDate(today));
    } else if (rangeType === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (rangeType === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDate(firstDayLastMonth));
      setEndDate(formatDate(lastDayLastMonth));
    }
  };

  const resetFilters = () => {
    setSelectedUser('');
    setDepartment('');
    setStatus('');
    setQuickRange('7days');
  };

  // CSV Export: Exports active tab's dataset
  const exportCSV = () => {
    if (activeTab === 'employees') {
      if (!reportData?.employee_summaries || reportData.employee_summaries.length === 0) return;

      const headers = [
        'User Code',
        'Full Name',
        'Department',
        'Designation',
        'Total In Hours',
        'Total Out Hours',
        'Total Out Events',
        'Avg Out Time (Mins)',
        'Days Late',
        'Total Late Minutes',
        'Days Early Exit',
        'Total Early Minutes',
        'Days Present',
        'Total Days Recorded',
        'Attendance Rate %'
      ];

      const rows = reportData.employee_summaries.map(e => [
        e.user_code,
        `"${e.full_name}"`,
        `"${e.department || 'General'}"`,
        `"${e.designation || 'Staff'}"`,
        e.total_in_hours || 0,
        e.total_out_hours || 0,
        e.total_out_events || 0,
        e.avg_out_minutes || 0,
        e.total_days_late || 0,
        e.total_late_minutes || 0,
        e.total_days_early || 0,
        e.total_early_minutes || 0,
        e.days_present || 0,
        e.days_total || 0,
        `"${e.attendance_rate || 0}%"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Employee_Movement_Rollup_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (!reportData?.rows || reportData.rows.length === 0) return;

      const headers = ['Date', 'User Code', 'Name', 'Department', 'Shift', 'First IN', 'Last OUT', 'Trips Out', 'Inside Hours', 'Outside Mins', 'Late Mins', 'Early Mins', 'Status'];
      const rows = reportData.rows.map(r => [
        r.attendance_date,
        r.user_code,
        `"${r.full_name}"`,
        `"${r.department || 'General'}"`,
        `"${r.shift_name || 'Standard'}"`,
        r.first_in || '',
        r.last_out || '',
        r.total_trips_out || 0,
        r.total_hours || 0.00,
        r.total_outside_minutes || 0,
        r.late_in_mins || 0,
        r.early_out_mins || 0,
        r.status
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Daily_Attendance_Logs_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format minutes into clean human-readable (e.g. 95m -> 1h 35m)
  const formatMins = (mins) => {
    if (!mins || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Unique departments for filter
  const departments = [...new Set(usersList.map(u => u.department).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <FileBarChart size={26} color="var(--menu-accent)" />
            Executive Employee Movement & Attendance Report
          </h2>
          <p className="page-desc">
            Multi-gate rollups: In-Office Productive Hours, Break Hours, Gate Outings Count, Average Outing Duration, Late Arrivals & Early Exits.
          </p>
        </div>
        {activeTab !== 'matrix' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} /> Print Report
            </button>
            <button className="btn btn-primary" onClick={exportCSV}>
              <Download size={16} /> Export {activeTab === 'employees' ? 'Employee Rollup' : 'Daily Logs'} (CSV)
            </button>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.85rem'
      }}>
        <button 
          className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('matrix')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem' }}
        >
          <Table2 size={16} />
          <strong>Monthly Matrix (1–31 Days)</strong>
        </button>

        <button 
          className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('employees')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem' }}
        >
          <Users size={16} />
          <strong>Employee Rollup Metrics</strong> ({reportData?.employee_summaries?.length || 0})
        </button>

        <button 
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem' }}
        >
          <Calendar size={16} />
          <strong>Daily Audit Logs</strong> ({reportData?.rows?.length || 0})
        </button>
      </div>

      {/* TAB 0: Monthly Matrix Grid (1 to 31 Days) */}
      {activeTab === 'matrix' && (
        <MonthlyMatrixReport />
      )}

      {activeTab !== 'matrix' && (
        <>
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.15rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.35rem' }}>
            Quick Range:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' }
          ].map((q) => {
            const isActive = activeQuickRange === q.id;
            return (
              <button 
                key={q.id}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.3rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  border: isActive ? '1px solid #2563eb' : '1px solid var(--border-color)',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
                }} 
                onClick={() => setQuickRange(q.id)}
              >
                {q.label}
              </button>
            );
          })}

          <button 
            className="btn btn-secondary" 
            style={{ 
              fontSize: '0.75rem', 
              padding: '0.3rem 0.75rem', 
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: 'var(--radius-pill)'
            }} 
            onClick={resetFilters}
            title="Reset all filters to default"
          >
            <RefreshCw size={12} />
            Reset Filters
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label">From Date (Between)</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={e => {
                setStartDate(e.target.value);
                setActiveQuickRange('');
              }} 
            />
          </div>

          <div>
            <label className="form-label">To Date (Between)</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={e => {
                setEndDate(e.target.value);
                setActiveQuickRange('');
              }} 
            />
          </div>

          <div>
            <label className="form-label">Employee Filter</label>
            <select 
              className="select" 
              value={selectedUser} 
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">All Employees ({usersList.length})</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.user_code} - {u.full_name} ({u.department || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Department</label>
            <select 
              className="select" 
              value={department} 
              onChange={e => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Status Filter</label>
            <select 
              className="select" 
              value={status} 
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late Arrival</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Level Executive KPI Banner */}
      {reportData?.totals && (
        <div 
          className="grid-cols-5" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1.15rem', 
            marginBottom: '1.75rem' 
          }}
        >
          {/* Total In Hours */}
          <div 
            className="card" 
            style={{ 
              padding: '1.15rem 1.25rem', 
              borderLeft: '4px solid #10b981',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Hrs In
              </span>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-md)', 
                background: 'rgba(16, 185, 129, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <LogIn size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {reportData.totals.total_in_hours} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>hrs</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Productive inside office
            </div>
          </div>

          {/* Total Out Hours */}
          <div 
            className="card" 
            style={{ 
              padding: '1.15rem 1.25rem', 
              borderLeft: '4px solid #ec4899',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Hrs Out
              </span>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-md)', 
                background: 'rgba(236, 72, 153, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ec4899'
              }}>
                <LogOut size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {reportData.totals.total_out_hours} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ec4899' }}>hrs</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Breaks & transit
            </div>
          </div>

          {/* Total Out Events & Avg Out Time */}
          <div 
            className="card" 
            style={{ 
              padding: '1.15rem 1.25rem', 
              borderLeft: '4px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Out Events
              </span>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-md)', 
                background: 'rgba(245, 158, 11, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#f59e0b'
              }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {reportData.totals.total_out_events} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b' }}>trips</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Avg: <strong style={{ color: 'var(--text-main)' }}>{reportData.totals.avg_out_minutes}m</strong>/trip
            </div>
          </div>

          {/* Total Days Late */}
          <div 
            className="card" 
            style={{ 
              padding: '1.15rem 1.25rem', 
              borderLeft: '4px solid #ef4444',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Days Late
              </span>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-md)', 
                background: 'rgba(239, 68, 68, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {reportData.totals.total_days_late} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>times</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Arrived after grace
            </div>
          </div>

          {/* Total Days Early */}
          <div 
            className="card" 
            style={{ 
              padding: '1.15rem 1.25rem', 
              borderLeft: '4px solid #8b5cf6',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Days Early
              </span>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-md)', 
                background: 'rgba(139, 92, 246, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#8b5cf6'
              }}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {reportData.totals.total_days_early} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6' }}>times</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Left before shift end
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Employee Rollup Metrics (Requested View) */}
      {activeTab === 'employees' && (
        <DataTable
          data={reportData?.employee_summaries || []}
          loading={loading}
          rowKey="user_id"
          defaultSortKey="total_in_hours"
          defaultSortDir="desc"
          searchPlaceholder="Filter employees by name, code, department..."
          exportFileName={`Employee_Movement_Rollup_${startDate}_to_${endDate}`}
          emptyMessage="No employee records found in the selected date range."
          columns={[
            {
              key: 'full_name',
              label: 'Employee',
              sortable: true,
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {r.profile_photo ? (
                    <img 
                      src={r.profile_photo} 
                      alt={r.full_name} 
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '50%', 
                      background: 'var(--bg-muted)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'var(--menu-accent)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {r.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.user_code} • {r.designation || 'Staff'}
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'department',
              label: 'Department',
              sortable: true,
              render: (r) => (
                <span className="badge badge-inside" style={{ fontSize: '0.75rem' }}>
                  {r.department || 'General'}
                </span>
              )
            },
            {
              key: 'total_in_hours',
              label: 'Total Hrs In',
              sortable: true,
              render: (r) => (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                    {r.total_in_hours} hrs
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {formatMins(r.total_inside_minutes)} productive
                  </div>
                </div>
              )
            },
            {
              key: 'total_out_hours',
              label: 'Total Hrs Out',
              sortable: true,
              render: (r) => (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ec4899', fontSize: '0.95rem' }}>
                    {r.total_out_hours} hrs
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {formatMins(r.total_outside_minutes)} breaks
                  </div>
                </div>
              )
            },
            {
              key: 'total_out_events',
              label: 'Total Out Events',
              sortable: true,
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <LogOut size={14} color="#f59e0b" />
                  <strong style={{ fontSize: '0.9rem' }}>{r.total_out_events}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>trips</span>
                </div>
              )
            },
            {
              key: 'avg_out_minutes',
              label: 'Avg Out Time',
              sortable: true,
              render: (r) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                  {r.avg_out_minutes > 0 ? `${r.avg_out_minutes} mins` : '--'}
                </span>
              )
            },
            {
              key: 'total_days_late',
              label: 'Total Days Late',
              sortable: true,
              render: (r) => (
                r.total_days_late > 0 ? (
                  <span className="badge badge-late" title={`${r.total_late_minutes} mins late accumulated`}>
                    {r.total_days_late} Days (+{r.total_late_minutes}m)
                  </span>
                ) : (
                  <span className="badge badge-present" style={{ fontSize: '0.72rem' }}>
                    On-Time
                  </span>
                )
              )
            },
            {
              key: 'total_days_early',
              label: 'Total Days Early',
              sortable: true,
              render: (r) => (
                r.total_days_early > 0 ? (
                  <span className="badge badge-out" title={`${r.total_early_minutes} mins early departure`}>
                    {r.total_days_early} Days (-{r.total_early_minutes}m)
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>0</span>
                )
              )
            },
            {
              key: 'days_present',
              label: 'Attendance Rate',
              sortable: true,
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {r.days_present} / {r.days_total} Days
                  </div>
                  <div style={{ fontSize: '0.72rem', color: r.attendance_rate >= 80 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                    {r.attendance_rate}% Rate
                  </div>
                </div>
              )
            },
            {
              key: 'actions',
              label: 'Action',
              sortable: false,
              render: (r) => (
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => {
                    setSelectedUser(String(r.user_id));
                    setActiveTab('daily');
                  }}
                  title="View detailed daily logs for this employee"
                >
                  <Eye size={12} />
                  <span>Daily Logs</span>
                </button>
              )
            }
          ]}
        />
      )}

      {/* TAB 2: Daily Breakdown Audit Trail */}
      {activeTab === 'daily' && (
        <div>
          {selectedUser && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '0.5rem 1rem', 
              background: 'var(--bg-muted)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem'
            }}>
              <span>Filtering by Employee ID: <strong>{selectedUser}</strong></span>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setSelectedUser('')}
              >
                Clear Employee Filter
              </button>
            </div>
          )}

          <DataTable
            data={reportData?.rows || []}
            loading={loading}
            rowKey={(r) => `${r.user_id}-${r.attendance_date}`}
            defaultSortKey="attendance_date"
            defaultSortDir="desc"
            searchPlaceholder="Filter report rows by person, date, department, status..."
            exportFileName={`Daily_Attendance_Logs_${startDate}_to_${endDate}`}
            emptyMessage="No daily records in selected date range."
            columns={[
              {
                key: 'attendance_date',
                label: 'Date',
                sortable: true,
                render: (r) => (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.attendance_date}</span>
                )
              },
              {
                key: 'full_name',
                label: 'Personnel',
                sortable: true,
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.user_code}</div>
                  </div>
                )
              },
              {
                key: 'department',
                label: 'Department',
                sortable: true,
                render: (r) => r.department || 'General'
              },
              {
                key: 'first_in',
                label: 'First IN',
                sortable: true,
                render: (r) => (
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 700 }}>{r.first_in || '--'}</span>
                )
              },
              {
                key: 'last_out',
                label: 'Last OUT',
                sortable: true,
                render: (r) => (
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f43f5e', fontWeight: 700 }}>{r.last_out || '--'}</span>
                )
              },
              {
                key: 'total_trips_out',
                label: 'Trips Out',
                sortable: true,
                render: (r) => <strong>{r.total_trips_out || 0}</strong>
              },
              {
                key: 'total_hours',
                label: 'Hrs In',
                sortable: true,
                render: (r) => (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>{r.total_hours || '0.00'} hrs</span>
                )
              },
              {
                key: 'total_outside_minutes',
                label: 'Break Mins',
                sortable: true,
                render: (r) => (
                  <span style={{ color: '#ec4899', fontWeight: 600 }}>{r.total_outside_minutes || 0} mins</span>
                )
              },
              {
                key: 'late_in_mins',
                label: 'Late Arrival',
                sortable: true,
                render: (r) => (
                  r.late_in_mins > 0 ? (
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>+{r.late_in_mins}m</span>
                  ) : (
                    <span style={{ color: '#10b981' }}>On-Time</span>
                  )
                )
              },
              {
                key: 'early_out_mins',
                label: 'Early Exit',
                sortable: true,
                render: (r) => (
                  r.early_out_mins > 0 ? (
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>-{r.early_out_mins}m</span>
                  ) : (
                    '--'
                  )
                )
              },
              {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (r) => (
                  <span className={`badge badge-${r.status?.toLowerCase().replace(/\s+/g, '') || 'absent'}`}>
                    {r.status}
                  </span>
                )
              }
            ]}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}
