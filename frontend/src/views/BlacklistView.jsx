// frontend/src/views/BlacklistView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  UserX, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Upload, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  MapPin, 
  ShieldCheck, 
  X,
  FileText,
  Crop
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import ImageCropModal from '../components/ImageCropModal';
import { useDialog } from '../context/DialogContext';

export default function BlacklistView() {
  const { confirm, toast } = useDialog();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'breaches'
  const [blacklistData, setBlacklistData] = useState([]);
  const [breachesData, setBreachesData] = useState([]);
  const [stats, setStats] = useState({
    total_blacklisted: 0,
    active_count: 0,
    critical_count: 0,
    high_count: 0,
    today_breaches: 0,
    unresolved_breaches: 0
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [threatFilter, setThreatFilter] = useState('');
  const [breachStatusFilter, setBreachStatusFilter] = useState('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    person_code: '',
    full_name: '',
    threat_level: 'High',
    reason: '',
    notes: '',
    status: 'Active',
    photo_url: '',
    face_embedding: null
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [extractingFace, setExtractingFace] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  // Resolve Form State
  const [resolveForm, setResolveForm] = useState({
    resolved_by: 'Security Officer',
    resolved_notes: 'Verified and instructed to leave premises.'
  });

  const fileInputRef = useRef(null);

  // Fetch Directory & Breaches
  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, breachRes] = await Promise.all([
        api.getBlacklist({ search, threat_level: threatFilter }),
        api.getBlacklistBreaches(breachStatusFilter)
      ]);

      const blkList = listRes.data?.blacklisted_persons || [];
      const blkStats = listRes.data?.stats || {};
      const brList = breachRes.data?.breaches || [];
      const brStats = breachRes.data?.stats || {};

      setBlacklistData(blkList);
      setBreachesData(brList);
      setStats({
        total_blacklisted: blkStats.total_blacklisted || 0,
        active_count: blkStats.active_count || 0,
        critical_count: blkStats.critical_count || 0,
        high_count: blkStats.high_count || 0,
        today_breaches: brStats.today_breaches || 0,
        unresolved_breaches: brStats.unresolved_breaches || 0
      });
    } catch (err) {
      console.error('Failed to load blacklist data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, threatFilter, breachStatusFilter]);

  // Handle Photo Selection -> Open Crop Modal
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const b64 = uploadEvent.target.result;
      setCropImageSrc(b64);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Called when user finishes cropping
  const handleCropComplete = async (croppedB64) => {
    setPhotoPreview(croppedB64);
    setFormData(prev => ({ ...prev, photo_url: croppedB64 }));
    setExtractingFace(true);
    setExtractError('');

    try {
      const res = await api.extractFaceEmbedding(croppedB64);
      if (res && res.success && res.embedding) {
        setFormData(prev => ({ ...prev, face_embedding: res.embedding }));
      } else {
        setExtractError(res?.message || 'Face not detected clearly. Ensure face is centered and clearly lit.');
      }
    } catch (err) {
      console.warn('Blacklist AI extraction notice:', err);
      setExtractError('Could not connect to Face AI engine for extraction.');
    } finally {
      setExtractingFace(false);
    }
  };

  // Submit Blacklist Person Form
  const handleSubmitPerson = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.reason) {
      toast.warning('Full Name and Reason are required.');
      return;
    }

    try {
      await api.saveBlacklistedPerson({
        ...formData,
        id: editingPerson?.id
      });
      toast.success(editingPerson ? 'Blacklist profile updated.' : 'Person enrolled into Blacklist.');
      setShowAddModal(false);
      setEditingPerson(null);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Error saving record: ' + (err.message || 'Unknown error'));
    }
  };

  // Delete Blacklisted Person
  const handleDelete = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Remove from Blacklist',
      message: `Are you sure you want to remove "${name}" from the Security Blacklist? They will no longer trigger unauthorized access security alarms at gates.`,
      confirmText: 'Remove Person',
      cancelText: 'Keep Blacklisted',
      isDanger: true
    });
    if (!isConfirmed) return;

    try {
      await api.deleteBlacklistedPerson(id);
      toast.success(`"${name}" removed from Blacklist.`);
      loadData();
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  // Submit Breach Resolution
  const handleResolveBreach = async (e) => {
    e.preventDefault();
    if (!selectedBreach) return;

    try {
      await api.resolveBreach(
        selectedBreach.id,
        resolveForm.resolved_by,
        resolveForm.resolved_notes
      );
      toast.success('Security breach incident marked as resolved.');
      setShowResolveModal(false);
      setSelectedBreach(null);
      loadData();
    } catch (err) {
      toast.error('Failed to resolve breach: ' + err.message);
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditingPerson(null);
    setShowAddModal(true);
  };

  const openEditModal = (person) => {
    setEditingPerson(person);
    setFormData({
      person_code: person.person_code || '',
      full_name: person.full_name || '',
      threat_level: person.threat_level || 'High',
      reason: person.reason || '',
      notes: person.notes || '',
      status: person.status || 'Active',
      photo_url: person.photo_url || '',
      face_embedding: person.face_embedding ? (typeof person.face_embedding === 'string' ? JSON.parse(person.face_embedding) : person.face_embedding) : null
    });
    setPhotoPreview(person.photo_url || '');
    setExtractError('');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      person_code: '',
      full_name: '',
      threat_level: 'High',
      reason: '',
      notes: '',
      status: 'Active',
      photo_url: '',
      face_embedding: null
    });
    setPhotoPreview('');
    setExtractError('');
  };

  const getThreatBadge = (level) => {
    switch (level) {
      case 'Critical':
        return <span className="badge" style={{ background: '#ef4444', color: '#fff' }}>Critical Threat</span>;
      case 'High':
        return <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>High Threat</span>;
      case 'Medium':
        return <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>Medium</span>;
      default:
        return <span className="badge" style={{ background: '#64748b', color: '#fff' }}>Low</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <ShieldAlert size={26} color="#ef4444" />
            Security & Blacklist Management
          </h2>
          <p className="page-desc">
            Isolated restricted database: real-time facial threat detection, CCTV gate alerts, and breach audit trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-danger" onClick={openAddModal} style={{ fontWeight: 700 }}>
            <Plus size={16} /> + Add Blacklisted Person
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div 
        className="grid-cols-4" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1.15rem', 
          marginBottom: '1.75rem' 
        }}
      >
        {/* Total Blacklisted */}
        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Restricted Registry
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <UserX size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.35rem' }}>
            {stats.total_blacklisted} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>persons</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {stats.active_count} active under watch
          </div>
        </div>

        {/* Critical Threats */}
        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #b91c1c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Critical Risk
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(185, 28, 28, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#b91c1c', marginTop: '0.35rem' }}>
            {stats.critical_count} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>profiles</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            High priority gate siren alert
          </div>
        </div>

        {/* Breaches Today */}
        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Breaches Today
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '0.35rem' }}>
            {stats.today_breaches} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>spotted</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Gate intrusion attempts today
          </div>
        </div>

        {/* Unresolved Incidents */}
        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unresolved Incidents
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#8b5cf6', marginTop: '0.35rem' }}>
            {stats.unresolved_breaches} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>pending</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Requires guard acknowledgement
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem'
      }}>
        <button 
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('directory')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <UserX size={16} />
          <strong>Blacklist Registry</strong> ({blacklistData.length})
        </button>

        <button 
          className={`btn ${activeTab === 'breaches' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('breaches')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <ShieldAlert size={16} />
          <strong>Security Breach Logs</strong> ({breachesData.length})
          {stats.unresolved_breaches > 0 && (
            <span style={{ 
              background: '#ef4444', 
              color: '#ffffff', 
              borderRadius: 'var(--radius-pill)', 
              fontSize: '0.7rem', 
              padding: '0.1rem 0.5rem', 
              fontWeight: 800 
            }}>
              {stats.unresolved_breaches}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Blacklist Directory */}
      {activeTab === 'directory' && (
        <DataTable
          data={blacklistData}
          loading={loading}
          rowKey="id"
          defaultSortKey="id"
          defaultSortDir="desc"
          searchPlaceholder="Search blacklisted persons by name, code, reason..."
          exportFileName="Security_Blacklist_Directory"
          emptyMessage="No blacklisted persons enrolled yet. Click '+ Add Blacklisted Person' to register restricted individuals."
          columns={[
            {
              key: 'full_name',
              label: 'Individual',
              sortable: true,
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {r.photo_url ? (
                    <img 
                      src={r.photo_url} 
                      alt={r.full_name} 
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ef4444' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#ef4444',
                      border: '1px solid #ef4444'
                    }}>
                      <UserX size={18} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.person_code}
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'threat_level',
              label: 'Threat Level',
              sortable: true,
              render: (r) => getThreatBadge(r.threat_level)
            },
            {
              key: 'reason',
              label: 'Reason for Restriction',
              sortable: true,
              render: (r) => (
                <div style={{ maxWidth: '320px', fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{r.reason}</div>
                  {r.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {r.notes}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'has_face_enrolled',
              label: 'Biometric AI',
              sortable: true,
              render: (r) => (
                r.has_face_enrolled ? (
                  <span className="badge badge-present" style={{ fontSize: '0.72rem' }}>
                    Active (128-D)
                  </span>
                ) : (
                  <span className="badge badge-undertime" style={{ fontSize: '0.72rem' }}>
                    No Face Enrolled
                  </span>
                )
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (r) => (
                <span className={`badge ${r.status === 'Active' ? 'badge-in' : 'badge-absent'}`} style={{ fontSize: '0.72rem' }}>
                  {r.status}
                </span>
              )
            },
            {
              key: 'created_at',
              label: 'Enrolled On',
              sortable: true,
              render: (r) => (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : '--'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Action',
              sortable: false,
              render: (r) => (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                    onClick={() => openEditModal(r)}
                    title="Edit Record"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#ef4444' }}
                    onClick={() => handleDelete(r.id, r.full_name)}
                    title="Remove from Blacklist"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            }
          ]}
        />
      )}

      {/* TAB 2: Breach Incidents Feed */}
      {activeTab === 'breaches' && (
        <DataTable
          data={breachesData}
          loading={loading}
          rowKey="id"
          defaultSortKey="id"
          defaultSortDir="desc"
          searchPlaceholder="Search incident logs by name, code, gate location..."
          exportFileName="Security_Blacklist_Breaches"
          emptyMessage="No security breach incidents logged. Gates are secure."
          columns={[
            {
              key: 'detected_at',
              label: 'Time & Gate',
              sortable: true,
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {new Date(r.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {new Date(r.detected_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--menu-accent)' }}>
                    <MapPin size={12} /> {r.gate_name} ({r.direction})
                  </div>
                </div>
              )
            },
            {
              key: 'full_name',
              label: 'Identified Individual',
              sortable: true,
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {r.reference_photo ? (
                    <img 
                      src={r.reference_photo} 
                      alt={r.full_name} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ef4444' }}
                    />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <UserX size={16} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.person_code}
                    </div>
                    {getThreatBadge(r.threat_level)}
                  </div>
                </div>
              )
            },
            {
              key: 'snapshot_path',
              label: 'CCTV Camera Capture',
              sortable: false,
              render: (r) => (
                r.snapshot_path ? (
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '2px solid #ef4444' }}>
                    <img src={r.snapshot_path} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Image</span>
                )
              )
            },
            {
              key: 'confidence_score',
              label: 'AI Match',
              sortable: true,
              render: (r) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>
                  {r.confidence_score}%
                </span>
              )
            },
            {
              key: 'is_resolved',
              label: 'Status',
              sortable: true,
              render: (r) => (
                r.is_resolved ? (
                  <div>
                    <span className="badge badge-present" style={{ fontSize: '0.72rem' }}>
                      Resolved
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      by {r.resolved_by}
                    </div>
                  </div>
                ) : (
                  <span className="badge badge-absent" style={{ fontSize: '0.72rem', animation: 'pulse-dot 1.5s infinite' }}>
                    ACTION REQUIRED
                  </span>
                )
              )
            },
            {
              key: 'actions',
              label: 'Action',
              sortable: false,
              render: (r) => (
                !r.is_resolved ? (
                  <button 
                    className="btn btn-danger"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    onClick={() => {
                      setSelectedBreach(r);
                      setShowResolveModal(true);
                    }}
                  >
                    Resolve Incident
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {r.resolved_notes || 'Handled'}
                  </span>
                )
              )
            }
          ]}
        />
      )}

      {/* MODAL 1: Add / Edit Blacklisted Person */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}>
                <ShieldAlert size={22} />
                {editingPerson ? 'Edit Blacklisted Profile' : 'Enroll Blacklisted Person'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPerson} style={{ padding: '1.5rem' }}>
              {/* Photo Upload & AI Extraction Preview */}
              <div style={{ 
                display: 'flex', 
                gap: '1.25rem', 
                marginBottom: '1.35rem', 
                alignItems: 'center',
                padding: '1rem',
                borderRadius: '12px',
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 
                  width: '96px', 
                  height: '96px', 
                  borderRadius: '12px', 
                  background: 'var(--bg-surface)', 
                  border: photoPreview ? '2px solid #ef4444' : '2px dashed rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: photoPreview ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none'
                }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ef4444', padding: '6px' }}>
                      <Camera size={28} />
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>NO PHOTO</div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handlePhotoUpload} 
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extractingFace}
                    >
                      <Upload size={14} />
                      <span>{photoPreview ? 'Change Photo' : 'Upload Face Photo'}</span>
                    </button>

                    {photoPreview && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                        onClick={() => {
                          setCropImageSrc(photoPreview);
                          setCropModalOpen(true);
                        }}
                        disabled={extractingFace}
                        title="Crop & frame portrait"
                      >
                        <Crop size={14} />
                        <span>Crop / Frame</span>
                      </button>
                    )}

                    {photoPreview && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', color: '#ef4444' }}
                        onClick={() => {
                          setPhotoPreview('');
                          setFormData(prev => ({ ...prev, photo_url: '', face_embedding: null }));
                          setExtractError('');
                        }}
                        disabled={extractingFace}
                        title="Remove photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem', lineHeight: '1.35' }}>
                    Interactive face crop will open automatically upon upload. Offline YuNet + SFace will extract 128-D biometric vector.
                  </div>

                  {extractingFace && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#8b5cf6', fontWeight: 600, marginTop: '0.4rem' }}>
                      <RefreshCw size={12} className="spin" />
                      <span>Extracting 128-D biometric vectors...</span>
                    </div>
                  )}

                  {formData.face_embedding && !extractingFace && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, marginTop: '0.4rem' }}>
                      <CheckCircle2 size={13} />
                      <span>128-D Biometric Embedding Successfully Enrolled</span>
                    </div>
                  )}

                  {extractError && !extractingFace && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginTop: '0.4rem' }}>
                      <AlertTriangle size={13} />
                      <span>{extractError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Full Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Tariq Al-Hassan"
                    value={formData.full_name} 
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Security ID Code</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Auto-generated (e.g. BLK-002)"
                    value={formData.person_code} 
                    onChange={e => setFormData({ ...formData, person_code: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Threat Severity Level</label>
                  <select 
                    className="select"
                    value={formData.threat_level}
                    onChange={e => setFormData({ ...formData, threat_level: e.target.value })}
                  >
                    <option value="Critical">Critical (Immediate Police / Evacuate)</option>
                    <option value="High">High (Turn Away at Gate)</option>
                    <option value="Medium">Medium (Notify Management)</option>
                    <option value="Low">Low (Informational Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Registry Status</label>
                  <select 
                    className="select"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active (Under Watch)</option>
                    <option value="Inactive">Inactive (Suspended Watch)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Reason for Blacklisting *</label>
                <textarea 
                  className="input" 
                  rows={2} 
                  placeholder="e.g. Former employee terminated with cause / Restraining order on file"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  required
                  style={{ minHeight: '64px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Security Guard Handling Instructions (Optional)</label>
                <textarea 
                  className="input" 
                  rows={2} 
                  placeholder="e.g. Do not engage physically; notify shift supervisor immediately."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ minHeight: '64px' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                  style={{ height: '38px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  style={{ fontWeight: 700, height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldAlert size={16} />
                  <span>{editingPerson ? 'Save Changes' : 'Enroll into Blacklist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Crop Modal for Blacklist Reference Photo */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        title="Crop Blacklist Face Reference"
        cropShape="round"
      />

      {/* MODAL 2: Resolve Incident Modal */}
      {showResolveModal && selectedBreach && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CheckCircle2 size={20} />
                Resolve Security Breach Incident
              </h3>
              <button 
                onClick={() => setShowResolveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <strong>Incident #{selectedBreach.id}:</strong> {selectedBreach.full_name} spotted at {selectedBreach.gate_name} ({selectedBreach.direction}) on {selectedBreach.detected_at}.
            </div>

            <form onSubmit={handleResolveBreach}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Resolved By (Officer / Guard Name) *</label>
                <input 
                  type="text" 
                  className="input" 
                  value={resolveForm.resolved_by} 
                  onChange={e => setResolveForm({ ...resolveForm, resolved_by: e.target.value })} 
                  required 
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Action Taken / Resolution Notes *</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  value={resolveForm.resolved_notes} 
                  onChange={e => setResolveForm({ ...resolveForm, resolved_notes: e.target.value })} 
                  placeholder="e.g. Guard responded to Gate 1, escorting individual out without incident."
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowResolveModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
