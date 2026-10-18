// frontend/src/views/HrSyncView.jsx
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Users,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function HrSyncView({ onDataSynced }) {
  const [hrStatus, setHrStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingEmployees, setSyncingEmployees] = useState(false);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
  const [resultMsg, setResultMsg] = useState(null);

  const fetchStatusAndHistory = async () => {
    setLoading(true);
    try {
      const [statusRes, histRes] = await Promise.all([
        api.getHrStatus(),
        api.getHrHistory()
      ]);
      setHrStatus(statusRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Failed to load HR sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndHistory();
  }, []);

  const handleImportEmployees = async () => {
    setSyncingEmployees(true);
    setResultMsg(null);
    try {
      const res = await api.importHrEmployees();
      setResultMsg({
        success: true,
        text: res.message || 'Successfully imported employees from HR Solution!'
      });
      fetchStatusAndHistory();
      if (onDataSynced) onDataSynced();
    } catch (err) {
      setResultMsg({
        success: false,
        text: 'Import failed: ' + err.message
      });
    } finally {
      setSyncingEmployees(false);
    }
  };

  const handleExportAttendance = async () => {
    setSyncingAttendance(true);
    setResultMsg(null);
    try {
      const res = await api.exportHrAttendance(exportDate);
      setResultMsg({
        success: true,
        text: res.message || `Successfully pushed attendance records for ${exportDate} to HR database!`
      });
      fetchStatusAndHistory();
    } catch (err) {
      setResultMsg({
        success: false,
        text: 'Export failed: ' + err.message
      });
    } finally {
      setSyncingAttendance(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <RefreshCw size={26} color="var(--menu-accent)" />
            HR Solution Database Bridge (`hr_solution_db`)
          </h2>
          <p className="page-desc">
            Seamlessly synchronize employees and automatically push CCTV attendance directly to HR Solution tables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchStatusAndHistory}>
            <RefreshCw size={15} /> Refresh Bridge Status
          </button>
        </div>
      </div>

      {resultMsg && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: resultMsg.success ? 'var(--status-present-bg)' : 'var(--status-absent-bg)',
          color: resultMsg.success ? 'var(--status-present)' : 'var(--status-absent)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          {resultMsg.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{resultMsg.text}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: hrStatus?.connected ? 'var(--status-present-bg)' : 'var(--status-absent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hrStatus?.connected ? '#10b981' : '#ef4444'
            }}>
              <Database size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  HR Database: {hrStatus?.database || 'hr_solution_db'}
                </h3>
                <span className={`badge ${hrStatus?.connected ? 'badge-present' : 'badge-absent'}`}>
                  {hrStatus?.connected ? 'CONNECTED (127.0.0.1:3306)' : 'DISCONNECTED'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {hrStatus?.message || 'Inspecting database status...'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active HR Employees</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {hrStatus?.active_employees || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>HR Attendance Records</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {hrStatus?.attendance_records || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Operations Grid */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Step 1: Import Staff from HR */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--status-inside-bg)', color: '#0284c7', borderRadius: 'var(--radius-md)' }}>
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Import Personnel from HR Solution</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Pulls employee codes, names, contact numbers, CPR, and photos from `hr_solution_db.employees`.
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Avoids entering employees twice. Once imported, you can immediately enroll their face embeddings using the CCTV camera or webcam.
          </p>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem' }}
            onClick={handleImportEmployees}
            disabled={syncingEmployees}
          >
            <RefreshCw size={16} className={syncingEmployees ? 'spin' : ''} />
            {syncingEmployees ? 'Importing from HR Database...' : 'Import All Active Employees Now'}
          </button>
        </div>

        {/* Step 2: Push Attendance to HR */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--status-present-bg)', color: '#10b981', borderRadius: 'var(--radius-md)' }}>
              <ArrowUpRight size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Push CCTV Attendance to HR Solution</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Writes daily First IN, Last OUT, total hours, and late minutes directly into `hr_solution_db.attendance`.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Select Date to Push</label>
            <input 
              type="date" 
              className="input" 
              value={exportDate} 
              onChange={e => setExportDate(e.target.value)} 
            />
          </div>

          <button 
            className="btn btn-accent" 
            style={{ width: '100%', padding: '0.75rem' }}
            onClick={handleExportAttendance}
            disabled={syncingAttendance}
          >
            <ShieldCheck size={16} className={syncingAttendance ? 'spin' : ''} />
            {syncingAttendance ? 'Pushing Records to HR DB...' : `Push Attendance for ${exportDate}`}
          </button>
        </div>
      </div>

      {/* Sync History Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--menu-accent)" />
          Two-Way Integration Audit History
        </h3>

        <DataTable
          data={history}
          loading={loading}
          rowKey="id"
          defaultSortKey="synced_at"
          defaultSortDir="desc"
          searchPlaceholder="Filter sync events by type, status, notes..."
          exportFileName="HR_Sync_Audit_History"
          emptyMessage="No sync events recorded yet. Click one of the buttons above to test integration."
          columns={[
            {
              key: 'sync_type',
              label: 'Sync Type',
              sortable: true,
              render: (h) => (
                <span className={`badge ${h.sync_type === 'IMPORT_EMPLOYEES' ? 'badge-inside' : 'badge-present'}`}>
                  {h.sync_type === 'IMPORT_EMPLOYEES' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                  {h.sync_type}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (h) => (
                <span className={`badge ${h.status === 'Success' ? 'badge-present' : 'badge-absent'}`}>
                  {h.status}
                </span>
              )
            },
            {
              key: 'records_affected',
              label: 'Records Processed',
              sortable: true,
              render: (h) => (
                <span><strong>{h.records_affected}</strong> records affected</span>
              )
            },
            {
              key: 'message',
              label: 'Details & Message',
              sortable: true,
              render: (h) => h.message || '--'
            },
            {
              key: 'synced_at',
              label: 'Timestamp',
              sortable: true,
              render: (h) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.synced_at}</span>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
