// frontend/src/views/ReportsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function ReportsView() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports({
        start_date: startDate,
        end_date: endDate,
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
  }, [startDate, endDate, department, status]);

  const exportCSV = () => {
    if (!reportData?.rows || reportData.rows.length === 0) return;

    const headers = ['Date', 'User Code', 'Name', 'Department', 'Shift', 'First IN', 'Last OUT', 'Trips Out', 'Inside Hours', 'Outside Mins', 'Late Mins', 'Status'];
    const rows = reportData.rows.map(r => [
      r.attendance_date,
      r.user_code,
      `"${r.full_name}"`,
      r.department || 'General',
      r.shift_name || 'Standard',
      r.first_in || '',
      r.last_out || '',
      r.total_trips_out || 0,
      r.total_hours || 0.00,
      r.total_outside_minutes || 0,
      r.late_in_mins || 0,
      r.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CCTV_Attendance_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <FileBarChart size={26} color="var(--menu-accent)" />
            Attendance Reports & Multi-Trip Analytics
          </h2>
          <p className="page-desc">
            Historical audit logs, working duration aggregates, break outing counts, and exportable timesheets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Report
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={16} /> Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label">Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>

          <div>
            <label className="form-label">End Date</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>

          <div>
            <label className="form-label">Department</label>
            <select 
              className="select" 
              value={department} 
              onChange={e => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="HR Staff">HR Staff</option>
              <option value="General">General</option>
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
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totals KPI Banner */}
      {reportData?.totals && (
        <div className="grid-cols-4" style={{ marginBottom: '1.75rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Working Hours
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0284c7', marginTop: '0.35rem' }}>
              {reportData.totals.total_hours} hrs
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accumulated duration</div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Break Outings
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '0.35rem' }}>
              {reportData.totals.total_trips_out} Trips
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Times personnel went out</div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Present Shifts
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: '0.35rem' }}>
              {reportData.totals.present_days}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On-time arrivals</div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Late / Under-Time
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f43f5e', marginTop: '0.35rem' }}>
              {reportData.totals.late_days + reportData.totals.half_days}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reportData.totals.late_days} late, {reportData.totals.half_days} half-day</div>
          </div>
        </div>
      )}

      {/* Detailed DataTable */}
      <DataTable
        data={reportData?.rows || []}
        loading={loading}
        rowKey={(r) => `${r.user_id}-${r.attendance_date}`}
        defaultSortKey="attendance_date"
        defaultSortDir="desc"
        searchPlaceholder="Filter report rows by person, date, department, status..."
        exportFileName={`Attendance_Report_${startDate}_to_${endDate}`}
        emptyMessage="No attendance records in selected date range."
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
            label: 'Inside Hours',
            sortable: true,
            render: (r) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>{r.total_hours || '0.00'} hrs</span>
            )
          },
          {
            key: 'total_outside_minutes',
            label: 'Break Mins',
            sortable: true,
            render: (r) => `${r.total_outside_minutes || 0} mins`
          },
          {
            key: 'late_in_mins',
            label: 'Late Mins',
            sortable: true,
            render: (r) => (
              r.late_in_mins > 0 ? <span style={{ color: '#f43f5e', fontWeight: 700 }}>+{r.late_in_mins}m</span> : 'On-Time'
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
  );
}
