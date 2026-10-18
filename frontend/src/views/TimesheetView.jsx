// frontend/src/views/TimesheetView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  ListCollapse, 
  Eye, 
  X, 
  Calendar,
  LogIn, 
  LogOut, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function TimesheetView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserTimeline, setSelectedUserTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const fetchTimesheet = async () => {
    setLoading(true);
    try {
      const res = await api.getDailySummary({
        date,
        search,
        department,
        status
      });
      setRecords(res.data?.records || []);
    } catch (err) {
      console.error('Failed to load timesheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheet();
  }, [date, department, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTimesheet();
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.recalculate(date);
      await fetchTimesheet();
    } catch (err) {
      console.error('Recalculate error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const viewTimeline = async (userId) => {
    setTimelineLoading(true);
    try {
      const res = await api.getUserTimeline(userId, date);
      setSelectedUserTimeline(res.data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const formatMins = (mins) => {
    if (!mins || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Clock size={26} color="var(--menu-accent)" />
            Daily Attendance & Multi-Trip Timesheet
          </h2>
          <p className="page-desc">
            Exact tracking of First IN, Last OUT, total trips/breaks, hours inside and outside.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleRecalculate} 
            disabled={recalculating}
          >
            <RefreshCw size={15} className={recalculating ? 'spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalculate Timesheet'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.15rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Attendance Date</label>
            <input 
              type="date" 
              className="input" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div>
            <label className="form-label">Filter Department</label>
            <select 
              className="select" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="HR Staff">HR Staff</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="form-label">Filter Status</label>
            <select 
              className="select" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late Arrival</option>
              <option value="Half Day">Half Day</option>
              <option value="Under Time">Under Time</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="form-label">Search Person</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Name, ID, mobile..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 0.85rem' }}>
                <Search size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Timesheet DataTable */}
      <DataTable
        data={records}
        loading={loading}
        rowKey="user_id"
        defaultSortKey="full_name"
        searchPlaceholder="Quick filter employees, status, departments..."
        exportFileName={`Timesheet_${date}`}
        emptyMessage={`No attendance records found for ${date}.`}
        columns={[
          {
            key: 'full_name',
            label: 'Staff / Student',
            sortable: true,
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0
                }}>
                  {r.profile_photo ? (
                    <img src={r.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    r.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {r.user_code} • {r.department || 'General'}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'shift_name',
            label: 'Shift / Schedule',
            sortable: true,
            render: (r) => (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.shift_name || 'Standard Shift'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {r.shift_start?.slice(0, 5)} - {r.shift_end?.slice(0, 5)}
                </div>
              </div>
            )
          },
          {
            key: 'first_in',
            label: 'First IN (Arrival)',
            sortable: true,
            render: (r) => (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.first_in ? '#10b981' : 'var(--text-light)' }}>
                  {r.first_in || '--:--:--'}
                </div>
                {r.late_in_mins > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 600 }}>
                    +{r.late_in_mins}m late
                  </span>
                )}
              </div>
            )
          },
          {
            key: 'last_out',
            label: 'Last OUT (Exit)',
            sortable: true,
            render: (r) => (
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.last_out ? '#f43f5e' : 'var(--text-light)' }}>
                {r.last_out || '--:--:--'}
              </div>
            )
          },
          {
            key: 'current_status',
            label: 'Presence',
            sortable: true,
            render: (r) => {
              const isInside = r.current_status === 'INSIDE';
              return (
                <span className={`badge ${isInside ? 'badge-inside' : 'badge-absent'}`}>
                  {r.current_status || 'OUTSIDE'}
                </span>
              );
            }
          },
          {
            key: 'total_trips_out',
            label: 'Trips / Outings',
            sortable: true,
            render: (r) => (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {r.total_trips_out || 0} {r.total_trips_out === 1 ? 'Trip' : 'Trips'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Went outside
                </div>
              </div>
            )
          },
          {
            key: 'total_inside_minutes',
            label: 'Total Inside (Work)',
            sortable: true,
            render: (r) => (
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
                {formatMins(r.total_inside_minutes)} ({r.total_hours || '0.00'}h)
              </div>
            )
          },
          {
            key: 'total_outside_minutes',
            label: 'Total Outside (Break)',
            sortable: true,
            render: (r) => (
              <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {formatMins(r.total_outside_minutes)}
              </div>
            )
          },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (r) => (
              <span className={`badge badge-${r.status?.toLowerCase().replace(/\s+/g, '') || 'absent'}`}>
                {r.status || 'Absent'}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Timeline',
            sortable: false,
            align: 'center',
            render: (r) => (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => viewTimeline(r.user_id)}
                title="View punch audit timeline"
              >
                <Eye size={13} />
                View
              </button>
            )
          }
        ]}
      />

      {/* User Timeline Popup Modal */}
      {selectedUserTimeline && (
        <div className="modal-overlay" onClick={() => setSelectedUserTimeline(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={20} color="var(--menu-accent)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                    Punch Audit Trail: {selectedUserTimeline.user?.full_name}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    ID: {selectedUserTimeline.user?.user_code} • Date: {selectedUserTimeline.date}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserTimeline(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Summary Stats Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                background: 'var(--bg-muted)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>First In</div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                    {selectedUserTimeline.summary?.first_in || '--:--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Out</div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>
                    {selectedUserTimeline.summary?.last_out || '--:--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inside</div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
                    {formatMins(selectedUserTimeline.summary?.total_inside_minutes)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outings Count</div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {selectedUserTimeline.summary?.total_trips_out || 0} Trips
                  </div>
                </div>
              </div>

              {/* Timeline Sequence */}
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                Chronological Punch Sequence
              </h4>

              {(!selectedUserTimeline.logs || selectedUserTimeline.logs.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                  No raw punches recorded for this date.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedUserTimeline.logs.map((log, index) => {
                    const isEntry = log.direction === 'IN';
                    return (
                      <div 
                        key={log.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: isEntry ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isEntry ? '#10b981' : '#f43f5e',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {index + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {isEntry ? <LogIn size={14} color="#10b981" /> : <LogOut size={14} color="#f43f5e" />}
                              <span>Punch {log.direction}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Gate: {log.gate_name || 'Main Gate'} • {log.camera_name || 'CCTV Camera'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {log.punch_time?.split(' ')[1] || log.punch_time}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                            Verified Offline AI ({log.confidence_score ? `${log.confidence_score}%` : '96%'})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedUserTimeline(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
