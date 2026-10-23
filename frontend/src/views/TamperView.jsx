import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  Filter, 
  CheckCircle, 
  X, 
  Download, 
  Search, 
  Calendar, 
  Camera, 
  Sparkles,
  Maximize2,
  Lock,
  UserX,
  Smartphone
} from 'lucide-react';
import { api } from '../api';
import { useDialog } from '../context/DialogContext';

export default function TamperView() {
  const { showConfirm, showToast } = useDialog();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_tamper_count: 0,
    today_tamper_count: 0,
    unreviewed_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchTamperLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getTamperLogs({
        status: statusFilter,
        limit: 100
      });
      if (res.data) {
        setLogs(res.data.logs || []);
        setStats(res.data.stats || {
          total_tamper_count: 0,
          today_tamper_count: 0,
          unreviewed_count: 0
        });
      }
    } catch (err) {
      console.error('Error fetching tamper logs:', err);
      showToast('Failed to load tamper incident logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTamperLogs();
    const interval = setInterval(fetchTamperLogs, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    try {
      setSubmittingReview(true);
      await api.reviewTamperLog(reviewModalItem.id, reviewNotes, 'Security Administrator');
      showToast('Tamper incident successfully acknowledged & reviewed', 'success');
      setReviewModalItem(null);
      setReviewNotes('');
      fetchTamperLogs();
    } catch (err) {
      showToast('Error reviewing incident', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSimulateTamper = async () => {
    const confirmed = await showConfirm(
      'Simulate Photo Presentation Attack',
      'This will simulate someone presenting a mobile phone photo of an employee to the Main Gate camera. The system will block the attendance punch and capture the whole screen. Proceed?'
    );
    if (!confirmed) return;

    try {
      await api.logTamperTest({
        user_id: 1,
        target_name: 'Ajit Kumar KV',
        target_code: 'EMP-1001',
        camera_id: 1,
        gate_name: 'Main Gate',
        direction: 'IN',
        event_type: 'Photo / Screen Presentation Attack',
        reason: 'Mobile Screen / Glass Specular Glare Detected',
        liveness_score: 36.4,
        confidence_score: 96.8,
        snapshot: ''
      });
      showToast('Tamper attempt simulated and blocked! Whole screen capture logged.', 'warning');
      fetchTamperLogs();
    } catch (err) {
      showToast('Failed to trigger simulation', 'error');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.target_name && log.target_name.toLowerCase().includes(term)) ||
      (log.target_code && log.target_code.toLowerCase().includes(term)) ||
      (log.camera_name && log.camera_name.toLowerCase().includes(term)) ||
      (log.reason && log.reason.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Top Banner / Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Try to Tamper Area & Anti-Spoofing Ledger
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Automated detection of photo printouts & mobile screen presentation attacks. Full whole-screen camera frames logged.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchTamperLogs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleSimulateTamper}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              borderColor: '#b91c1c'
            }}
          >
            <Smartphone size={16} />
            Simulate Attack Test
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Attacks Blocked</span>
            <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.4rem' }}>
            {stats.total_tamper_count}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#ef4444', fontWeight: 600 }}>Zero False Attendance Allowed</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Today's Incidents</span>
            <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.4rem' }}>
            {stats.today_tamper_count}
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Recorded on all active gates</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unreviewed Security Alerts</span>
            <div style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.4rem' }}>
            {stats.unreviewed_count}
          </div>
          <span style={{ fontSize: '0.76rem', color: stats.unreviewed_count > 0 ? '#ec4899' : 'var(--text-muted)', fontWeight: 600 }}>
            {stats.unreviewed_count > 0 ? 'Requires Supervisor Review' : 'All Clear & Reviewed'}
          </span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Anti-Spoof Defense Engine</span>
            <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '0.75rem' }}>
            ACTIVE (Multi-Cue)
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Moiré • Glare • Rigidity Analysis</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              className="input" 
              placeholder="Search by targeted staff name, ID code, or gate..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
              <button
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter('all')}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                All Attacks ({stats.total_tamper_count})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'unreviewed' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter('unreviewed')}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Unreviewed ({stats.unreviewed_count})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Data Table / Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Tamper Incident Log Stream
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing {filteredLogs.length} presentation attack records with full-frame whole camera evidence
            </span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              No Tamper Attempts Detected
            </h4>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              The perimeter camera streams are clean. Any photo printouts or mobile screens held to the camera will be instantly logged here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Timestamp & Gate</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Targeted Identity</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Attack Classification</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Liveness vs Match</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>Whole Screen Capture</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status / Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const snapUrl = log.snapshot_path 
                    ? (log.snapshot_path.startsWith('http') ? log.snapshot_path : `http://127.0.0.1:8000${log.snapshot_path.startsWith('/') ? '' : '/'}${log.snapshot_path}`)
                    : null;

                  const profileUrl = log.profile_photo
                    ? (log.profile_photo.startsWith('http') ? log.profile_photo : `http://127.0.0.1:8000${log.profile_photo.startsWith('/') ? '' : '/'}${log.profile_photo}`)
                    : null;

                  return (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: log.is_reviewed ? 'transparent' : 'rgba(239, 68, 68, 0.025)'
                      }}
                    >
                      {/* Timestamp & Gate */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {log.detected_at}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '2px' }}>
                          <span className={`badge ${log.direction === 'IN' ? 'badge-in' : 'badge-out'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            {log.direction}
                          </span>
                          <span>{log.camera_name || log.gate_name || 'Main Gate Camera'}</span>
                        </div>
                      </td>

                      {/* Targeted Identity */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#fee2e2',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            overflow: 'hidden',
                            border: '2px solid #ef4444'
                          }}>
                            {profileUrl ? (
                              <img src={profileUrl} alt={log.target_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              log.target_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                              {log.target_name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              ID: {log.target_code || 'EMP-UNKNOWN'} • {log.department || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Attack Classification */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#dc2626',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <Smartphone size={13} />
                          {log.event_type}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {log.reason}
                        </div>
                      </td>

                      {/* Liveness vs Match Score */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Liveness:</span>
                            <span style={{ fontWeight: 700, color: '#ef4444' }}>
                              {parseFloat(log.liveness_score || 0).toFixed(1)}% (REJECTED)
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Face Match:</span>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>
                              {parseFloat(log.confidence_score || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Whole Screen Capture Thumbnail */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        {snapUrl ? (
                          <div 
                            style={{ 
                              position: 'relative', 
                              width: '120px', 
                              height: '68px', 
                              borderRadius: '6px', 
                              overflow: 'hidden', 
                              cursor: 'pointer',
                              margin: '0 auto',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              border: '2px solid rgba(239, 68, 68, 0.4)'
                            }}
                            onClick={() => setSelectedSnapshot({ ...log, fullUrl: snapUrl })}
                            title="Click to view full-resolution whole camera frame"
                          >
                            <img 
                              src={snapUrl} 
                              alt="Whole Screen Tamper Snapshot" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(0,0,0,0.65)',
                              color: '#fff',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              padding: '2px 0'
                            }}>
                              <Maximize2 size={10} />
                              Whole Screen
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Screen Capture</span>
                        )}
                      </td>

                      {/* Status / Review Action */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {log.is_reviewed ? (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#10b981',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}>
                              <CheckCircle size={14} /> Reviewed
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {log.reviewed_by}
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.75rem',
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: '#ef4444'
                            }}
                            onClick={() => {
                              setReviewModalItem(log);
                              setReviewNotes('');
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Whole Screen Lightbox / Modal */}
      {selectedSnapshot && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 15, 29, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => setSelectedSnapshot(null)}
        >
          <div 
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '960px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={20} color="#ef4444" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    Whole Screen Capture • Presentation Attack Evidence
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Target: <strong style={{ color: 'var(--text-main)' }}>{selectedSnapshot.target_name} ({selectedSnapshot.target_code})</strong> • {selectedSnapshot.detected_at} • {selectedSnapshot.gate_name}
                </div>
              </div>

              <button 
                onClick={() => setSelectedSnapshot(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Whole Screen Image Frame */}
            <div style={{ position: 'relative', background: '#000', textAlign: 'center', maxHeight: '65vh', overflow: 'hidden' }}>
              <img 
                src={selectedSnapshot.fullUrl} 
                alt="Whole Camera Screen Capture" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '65vh', 
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }} 
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(239, 68, 68, 0.88)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Lock size={13} />
                WHOLE CAMERA FRAME (TAMPER EVIDENCE)
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-muted)'
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Attack Reason: <strong style={{ color: '#ef4444' }}>{selectedSnapshot.reason}</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a 
                  href={selectedSnapshot.fullUrl} 
                  download={`tamper_evidence_${selectedSnapshot.id}.jpg`}
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} />
                  Download Frame
                </a>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedSnapshot(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review / Acknowledge Modal */}
      {reviewModalItem && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 15, 29, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setReviewModalItem(null)}
        >
          <div 
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldAlert size={22} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                Acknowledge Tamper Incident #{reviewModalItem.id}
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Confirm review of photo presentation attempt targeting <strong>{reviewModalItem.target_name} ({reviewModalItem.target_code})</strong>.
            </p>

            <form onSubmit={handleReviewSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Investigation / Audit Notes</label>
                <textarea 
                  className="textarea"
                  rows={3}
                  placeholder="e.g. Employee verified: colleague attempted to present mobile screen photo. Warning issued."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setReviewModalItem(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingReview}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  {submittingReview ? 'Saving...' : 'Confirm Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
