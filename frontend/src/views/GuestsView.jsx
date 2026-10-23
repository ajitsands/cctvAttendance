// frontend/src/views/GuestsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Building, 
  Phone, 
  Tag, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Shield,
  ShieldAlert,
  Layers,
  RotateCcw,
  Camera,
  Maximize2,
  ExternalLink,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import { useDialog } from '../context/DialogContext';

export default function GuestsView() {
  const { confirm, alert, toast } = useDialog();
  const [guests, setGuests] = useState([]);
  const [totals, setTotals] = useState({
    total_guests: 0,
    currently_inside: 0,
    total_visits: 0,
    total_inside_hours: 0,
    avg_visit_minutes: 0
  });
  const [loading, setLoading] = useState(true);

  // Tab & Multi-Selection State
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [tabCounts, setTabCounts] = useState({ active_count: 0, archived_count: 0 });
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);

  // Filters State
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [quickRange, setQuickRange] = useState('30days');
  const [guestType, setGuestType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals State
  const [selectedGuestTimeline, setSelectedGuestTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  const [editingGuest, setEditingGuest] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    guest_name: '',
    guest_type: 'Visitor',
    company_name: '',
    phone: '',
    notes: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });

  // Blacklist Move Modal State
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [selectedVisitorForBlacklist, setSelectedVisitorForBlacklist] = useState(null);
  const [blacklistForm, setBlacklistForm] = useState({
    threat_level: 'High',
    reason: 'Restricted entry / Expelled Visitor',
    notes: ''
  });
  const [movingToBlacklist, setMovingToBlacklist] = useState(false);
  const [blacklistMessage, setBlacklistMessage] = useState({ type: '', text: '' });

  // Photo Preview Lightbox Modal State
  const [photoPreview, setPhotoPreview] = useState(null); // { guest, photoUrl, fullPhotoUrl, activeTab: 'face' | 'full' }

  const handlePreviewPhoto = (guest, customPhotoUrl = null, customFullPhotoUrl = null, defaultTab = 'face') => {
    if (!guest) return;
    const photo = customPhotoUrl || guest.latest_photo || guest.first_photo;
    const resolvedPhoto = photo
      ? (photo.startsWith('http') || photo.startsWith('data:') ? photo : `http://127.0.0.1:8000${photo.startsWith('/') ? '' : '/'}${photo}`)
      : null;

    const fullPhoto = customFullPhotoUrl || guest.latest_full_photo || guest.first_full_photo;
    const resolvedFull = fullPhoto
      ? (fullPhoto.startsWith('http') || fullPhoto.startsWith('data:') ? fullPhoto : `http://127.0.0.1:8000${fullPhoto.startsWith('/') ? '' : '/'}${fullPhoto}`)
      : null;

    setPhotoPreview({
      guest,
      photoUrl: resolvedPhoto,
      fullPhotoUrl: resolvedFull,
      activeTab: defaultTab === 'full' && resolvedFull ? 'full' : 'face'
    });
  };

  // Quick Date Range Handler
  const handleQuickRange = (rangeKey) => {
    setQuickRange(rangeKey);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (rangeKey === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (rangeKey === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setStartDate(y);
      setEndDate(y);
    } else if (rangeKey === '7days') {
      const s = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setStartDate(s);
      setEndDate(todayStr);
    } else if (rangeKey === '30days') {
      const s = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      setStartDate(s);
      setEndDate(todayStr);
    } else if (rangeKey === 'all') {
      setStartDate('2024-01-01');
      setEndDate(todayStr);
    }
  };

  // Load Guests Data
  const loadGuests = async () => {
    setLoading(true);
    try {
      const res = await api.getGuests({
        start_date: startDate,
        end_date: endDate,
        guest_type: guestType,
        status: status,
        search: search,
        is_archived: activeTab === 'archived' ? 1 : 0
      });

      setGuests(res.data?.guests || []);
      setTabCounts(res.data?.counts || { active_count: 0, archived_count: 0 });
      setTotals(res.data?.totals || {
        total_guests: 0,
        currently_inside: 0,
        total_visits: 0,
        total_inside_hours: 0,
        avg_visit_minutes: 0
      });
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedGuestIds([]);
    loadGuests();
  }, [startDate, endDate, guestType, status, search, activeTab]);

  // View Timeline Details
  const handleViewTimeline = async (guest) => {
    setTimelineModalOpen(true);
    setTimelineLoading(true);
    try {
      const res = await api.getGuestTimeline(guest.id);
      setSelectedGuestTimeline(res.data);
    } catch (err) {
      console.error('Failed to fetch guest timeline:', err);
      setSelectedGuestTimeline(guest);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Open Edit Details Modal
  const handleOpenEdit = (guest) => {
    setEditingGuest(guest);
    setEditForm({
      guest_name: guest.guest_name || 'Guest / Visitor',
      guest_type: guest.guest_type || 'Visitor',
      company_name: guest.company_name || '',
      phone: guest.phone || '',
      notes: guest.notes || ''
    });
    setEditMessage({ type: '', text: '' });
    setEditModalOpen(true);
  };

  // Submit Edit Details
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;
    setSavingEdit(true);
    setEditMessage({ type: '', text: '' });
    try {
      await api.saveGuest(editingGuest.id, editForm);
      setEditMessage({ type: 'success', text: 'Guest information updated successfully!' });
      setTimeout(() => {
        setEditModalOpen(false);
        loadGuests();
      }, 900);
    } catch (err) {
      setEditMessage({ type: 'error', text: err.message || 'Failed to update guest details' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Blacklist Modal
  const handleOpenBlacklistModal = (guest) => {
    setSelectedVisitorForBlacklist(guest);
    setBlacklistForm({
      threat_level: 'High',
      reason: `Unauthorized Entry - Visitor ${guest.guest_code} flagged by Security`,
      notes: `Transferred directly from auto-logged visitor record ${guest.guest_name} (${guest.guest_code}).`
    });
    setBlacklistMessage({ type: '', text: '' });
    setBlacklistModalOpen(true);
  };

  // Submit Move to Security Blacklist
  const handleSubmitMoveToBlacklist = async (e) => {
    e.preventDefault();
    if (!selectedVisitorForBlacklist) return;
    setMovingToBlacklist(true);
    setBlacklistMessage({ type: '', text: '' });
    try {
      await api.moveGuestToBlacklist(selectedVisitorForBlacklist.id, blacklistForm);
      setBlacklistMessage({ type: 'success', text: `Successfully transferred ${selectedVisitorForBlacklist.guest_name} to Security Blacklist!` });
      setTimeout(() => {
        setBlacklistModalOpen(false);
        loadGuests();
      }, 1000);
    } catch (err) {
      setBlacklistMessage({ type: 'error', text: err.message || 'Failed to move visitor to blacklist' });
    } finally {
      setMovingToBlacklist(false);
    }
  };

  // Multi-Selection Handlers
  const handleToggleSelect = (id) => {
    setSelectedGuestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedGuestIds.length === guests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(guests.map(g => g.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedGuestIds([]);
  };

  // Move Visitor(s) to Archive Vault
  const handleArchive = async (target) => {
    const ids = Array.isArray(target) ? target : [target.id || target];
    if (ids.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Move to Archive Vault',
      message: `Move ${ids.length === 1 ? 'this visitor' : `${ids.length} selected visitors`} to the Archive Vault? They will be removed from active tracking but all logs remain preserved in the archive.`,
      confirmText: 'Move to Archive',
      cancelText: 'Cancel'
    });
    if (!isConfirmed) return;

    try {
      await api.archiveGuests(ids);
      toast.success(`Successfully archived ${ids.length === 1 ? 'visitor' : `${ids.length} visitors`}.`);
      setSelectedGuestIds([]);
      loadGuests();
    } catch (err) {
      toast.error(`Archive error: ${err.message}`);
    }
  };

  // Restore Visitor(s) from Archive back to Active
  const handleRestore = async (target) => {
    const ids = Array.isArray(target) ? target : [target.id || target];
    if (ids.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Restore to Active Visitors',
      message: `Restore ${ids.length === 1 ? 'this visitor' : `${ids.length} selected visitors`} back to the active visitor ledger?`,
      confirmText: 'Restore',
      cancelText: 'Cancel'
    });
    if (!isConfirmed) return;

    try {
      await api.restoreGuests(ids);
      toast.success(`Successfully restored ${ids.length === 1 ? 'visitor' : `${ids.length} visitors`} to active status.`);
      setSelectedGuestIds([]);
      loadGuests();
    } catch (err) {
      toast.error(`Restore error: ${err.message}`);
    }
  };

  // Move Visitor(s) to Try to Tamper Area (Anti-Spoof Ledger)
  const handleMoveToTamper = async (target) => {
    const ids = Array.isArray(target) ? target : [target.id || target];
    if (ids.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Move to Try to Tamper Area',
      message: `Flag ${ids.length === 1 ? 'this visitor' : `${ids.length} selected visitors`} and transfer to the Anti-Tamper & Security Audit Area for spoof investigation?`,
      confirmText: 'Move to Tamper Area',
      cancelText: 'Cancel'
    });
    if (!isConfirmed) return;

    try {
      await api.moveGuestsToTamper(ids, {
        reason: 'Flagged from Visitor Ledger for Tamper & Anti-Spoof Audit',
        event_type: 'Manual Flagged Visitor / Tamper Investigation'
      });
      toast.success(`Transferred ${ids.length === 1 ? 'visitor' : `${ids.length} visitors`} to Try to Tamper Area!`);
      setSelectedGuestIds([]);
    } catch (err) {
      toast.error(`Tamper transfer error: ${err.message}`);
    }
  };

  // Delete Guest Record(s) - Handles both Active and Archive permanent purge
  const handleDeleteGuest = async (target, forcePermanent = false) => {
    const ids = Array.isArray(target) ? target : [target.id || target];
    if (ids.length === 0) return;

    const isPermanent = forcePermanent || activeTab === 'archived';

    const isConfirmed = await confirm({
      title: isPermanent ? 'Permanently Delete From System' : 'Delete Visitor Record',
      message: isPermanent
        ? `CAUTION: Are you sure you want to permanently erase ${ids.length === 1 ? 'this visitor' : `${ids.length} visitors`} and ALL movement logs/photos from the entire database? This cannot be recovered.`
        : `Are you sure you want to delete ${ids.length === 1 ? 'this visitor' : `${ids.length} visitors`}? (Tip: You can use 'Move to Archive' to safely store them in the Archive Vault).`,
      confirmText: isPermanent ? 'Permanently Erase' : 'Delete Record',
      cancelText: 'Keep Record',
      isDanger: true
    });
    if (!isConfirmed) return;

    try {
      await api.bulkDeleteGuests(ids);
      toast.success(`${ids.length === 1 ? 'Visitor record' : `${ids.length} visitor records`} deleted.`);
      setSelectedGuestIds([]);
      loadGuests();
    } catch (err) {
      toast.error(`Delete error: ${err.message}`);
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    handleQuickRange('30days');
    setGuestType('');
    setStatus('');
    setSearch('');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!guests || guests.length === 0) {
      toast.warning('No visitor or customer records available to export.');
      return;
    }

    const headers = [
      'Guest Code',
      'Name',
      'Classification',
      'Company/Organization',
      'Phone Number',
      'Current Status',
      'Total Visits',
      'Total Inside Hours',
      'Total Inside Minutes',
      'Avg Visit Duration (Mins)',
      'First Seen At',
      'Last Seen At'
    ];

    const rows = guests.map(g => [
      g.guest_code,
      `"${g.guest_name.replace(/"/g, '""')}"`,
      `"${g.guest_type}"`,
      `"${(g.company_name || 'N/A').replace(/"/g, '""')}"`,
      `"${g.phone || 'N/A'}"`,
      g.current_status,
      g.total_visits,
      g.total_inside_hours,
      g.total_inside_minutes,
      g.avg_visit_minutes,
      g.first_seen_at || 'N/A',
      g.last_seen_at || 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Guest_Customer_Movement_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Classification Badge Helpers
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'Customer':
        return { background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea', border: '1px solid rgba(147, 51, 234, 0.25)' };
      case 'VIP':
        return { background: 'rgba(234, 179, 8, 0.12)', color: '#d97706', border: '1px solid rgba(234, 179, 8, 0.3)' };
      case 'Contractor':
        return { background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)' };
      case 'Courier':
        return { background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' };
      default:
        return { background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };
    }
  };

  // Table Columns Definition
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={guests.length > 0 && selectedGuestIds.length === guests.length}
          onChange={handleSelectAll}
          title="Select / Deselect All on this page"
          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#9333ea' }}
        />
      ),
      accessor: 'id',
      key: 'select_col',
      sortable: false,
      width: '42px',
      align: 'center',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedGuestIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleSelect(row.id);
          }}
          title={`Select ${row.guest_name}`}
          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#9333ea' }}
        />
      )
    },
    {
      header: 'Face Photo',
      accessor: 'latest_photo',
      render: (row) => {
        const photo = row.latest_photo || row.first_photo;
        const resolvedPhoto = photo
          ? (photo.startsWith('http') || photo.startsWith('data:') ? photo : `http://127.0.0.1:8000${photo.startsWith('/') ? '' : '/'}${photo}`)
          : null;
        const fullPhoto = row.latest_full_photo || row.first_full_photo;
        const resolvedFullPhoto = fullPhoto
          ? (fullPhoto.startsWith('http') || fullPhoto.startsWith('data:') ? fullPhoto : `http://127.0.0.1:8000${fullPhoto.startsWith('/') ? '' : '/'}${fullPhoto}`)
          : null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              onClick={() => handlePreviewPhoto(row, resolvedPhoto, resolvedFullPhoto, 'face')}
              title="Click to view full-size photo & visitor details"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#e2e8f0',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, border-color 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.borderColor = '#9333ea'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'; }}
            >
              {resolvedPhoto ? (
                <img 
                  src={resolvedPhoto} 
                  alt={row.guest_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Users size={20} color="#94a3b8" />
              )}
            </div>
            <div>
              <div 
                onClick={() => handlePreviewPhoto(row, resolvedPhoto, resolvedFullPhoto, 'face')}
                style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}
                title="Click to view details"
              >
                {row.guest_code}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Auto-Enrolled AI
                </span>
                {resolvedFullPhoto && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewPhoto(row, resolvedPhoto, resolvedFullPhoto, 'full');
                    }}
                    title="View Full CCTV Frame (Group / Surroundings)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#2563eb',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Camera size={10} />
                    Scene
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Guest / Customer Identity',
      accessor: 'guest_name',
      render: (row) => {
        const isVCode = /^V\d{6}$/i.test(row.guest_name);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {row.guest_name}
              </span>
              {isVCode && (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  fontWeight: 600,
                  border: '1px solid rgba(59, 130, 246, 0.25)'
                }}>
                  Auto V-ID
                </span>
              )}
            </div>
            {row.company_name ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Building size={11} /> {row.company_name}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                No organization assigned
              </div>
            )}
            {row.phone && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <Phone size={10} /> {row.phone}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Classification',
      accessor: 'guest_type',
      render: (row) => {
        const style = getBadgeStyle(row.guest_type);
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            ...style
          }}>
            <Tag size={11} />
            {row.guest_type}
          </span>
        );
      }
    },
    {
      header: 'Current Status',
      accessor: 'current_status',
      render: (row) => {
        const isInside = row.current_status === 'INSIDE';
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '14px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: isInside ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
            color: isInside ? '#059669' : '#64748b',
            border: isInside ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isInside ? '#10b981' : '#94a3b8',
              boxShadow: isInside ? '0 0 6px #10b981' : 'none'
            }} />
            {row.current_status}
          </span>
        );
      }
    },
    {
      header: 'Visits Count',
      accessor: 'total_visits',
      render: (row) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{
            display: 'inline-block',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#2563eb',
            background: 'rgba(37, 99, 235, 0.08)',
            padding: '2px 10px',
            borderRadius: '6px'
          }}>
            {row.total_visits} {row.total_visits === 1 ? 'Visit' : 'Visits'}
          </span>
        </div>
      )
    },
    {
      header: 'Total Time Inside',
      accessor: 'total_inside_hours',
      render: (row) => {
        const hrs = parseFloat(row.total_inside_hours || 0);
        const mins = parseInt(row.total_inside_minutes || 0);
        return (
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
              {hrs.toFixed(1)} hrs
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ({mins} mins total)
            </div>
          </div>
        );
      }
    },
    {
      header: 'Avg Visit Duration',
      accessor: 'avg_visit_minutes',
      render: (row) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600,
          color: '#d97706',
          fontSize: '0.85rem'
        }}>
          <Clock size={12} />
          {row.avg_visit_minutes} mins
        </span>
      )
    },
    {
      header: 'Timeline Stamps',
      accessor: 'last_seen_at',
      render: (row) => (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div><strong>Last:</strong> {row.last_seen_at ? row.last_seen_at.slice(0, 16) : 'N/A'}</div>
          <div><strong>First:</strong> {row.first_seen_at ? row.first_seen_at.slice(0, 16) : 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      key: 'actions_col',
      sortable: false,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleViewTimeline(row)}
            title="View Visit Timeline & Snapshots"
            style={{
              padding: '4px 7px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: '#2563eb',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.73rem',
              fontWeight: 500
            }}
          >
            <Eye size={12} /> History
          </button>

          {activeTab === 'active' ? (
            <>
              <button
                onClick={() => handleOpenEdit(row)}
                title="Edit Guest / Customer Details"
                style={{
                  padding: '4px 7px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: '#d97706',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 500
                }}
              >
                <Edit2 size={12} /> Edit
              </button>

              <button
                onClick={() => handleMoveToTamper(row)}
                title="Move to Try to Tamper Area (Anti-Spoof Ledger)"
                style={{
                  padding: '4px 7px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  color: '#d97706',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={12} /> Tamper
              </button>

              <button
                onClick={() => handleArchive(row)}
                title="Move to Archive Vault (Preserve record in archive)"
                style={{
                  padding: '4px 7px',
                  borderRadius: '6px',
                  border: '1px solid rgba(147, 51, 234, 0.35)',
                  background: 'rgba(147, 51, 234, 0.08)',
                  color: '#9333ea',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 600
                }}
              >
                <Archive size={12} /> Archive
              </button>

              <button
                onClick={() => handleOpenBlacklistModal(row)}
                title="Move Visitor to Security Blacklist"
                style={{
                  padding: '4px 7px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 600
                }}
              >
                <ShieldAlert size={12} /> Blacklist
              </button>

              <button
                onClick={() => handleDeleteGuest(row, false)}
                title="Delete Visitor"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleRestore(row)}
                title="Restore back to Active Visitors"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 700
                }}
              >
                <RotateCcw size={12} /> Restore
              </button>

              <button
                onClick={() => handleDeleteGuest(row, true)}
                title="Permanently Delete from System (Erases all logs/photos)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.73rem',
                  fontWeight: 700
                }}
              >
                <Trash2 size={12} /> Permanent Delete
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="view-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)'
            }}>
              <Users size={20} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Guest & Customer Movement Intelligence
            </h1>
            <span style={{
              background: 'rgba(168, 85, 247, 0.1)',
              color: '#9333ea',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              V2.0 AI RECOGNITION
            </span>
          </div>
          <p style={{ margin: '4px 0 0 46px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Automatic enrollment of unknown faces, continuous return-visit tracking, dwell duration, and visit frequency reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadGuests}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', height: '38px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              height: '38px',
              background: 'linear-gradient(135deg, #9333ea, #c026d3)',
              borderColor: '#9333ea'
            }}
          >
            <Download size={14} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Top View Navigation Tabs: Active Ledger vs Archived Vault */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'active' ? '2px solid #9333ea' : '1px solid var(--border-color)',
            background: activeTab === 'active' ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(192, 38, 211, 0.15) 100%)' : 'var(--bg-card)',
            color: activeTab === 'active' ? '#9333ea' : 'var(--text-muted)',
            boxShadow: activeTab === 'active' ? '0 4px 12px rgba(147, 51, 234, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={17} />
          Active Visitors & Guests
          <span style={{
            background: activeTab === 'active' ? '#9333ea' : 'var(--bg-main)',
            color: activeTab === 'active' ? '#ffffff' : 'var(--text-muted)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {tabCounts.active_count}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'archived' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            background: activeTab === 'archived' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)' : 'var(--bg-card)',
            color: activeTab === 'archived' ? '#2563eb' : 'var(--text-muted)',
            boxShadow: activeTab === 'archived' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Archive size={17} />
          Archived Visitors Vault
          <span style={{
            background: activeTab === 'archived' ? '#2563eb' : 'var(--bg-main)',
            color: activeTab === 'archived' ? '#ffffff' : 'var(--text-muted)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {tabCounts.archived_count}
          </span>
        </button>
      </div>

      {activeTab === 'archived' && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          color: 'var(--text-main)'
        }}>
          <Archive size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <strong>Archived Visitors Vault:</strong> These records are preserved safely in archive with their complete movement timeline, snapshots, and full-screen camera scenes. They are excluded from active AI CCTV tracking. To return a visitor to active monitoring, click <strong>Restore</strong>. Deleting any record from this vault will <strong>permanently purge</strong> it from the system.
          </div>
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Metric 1: Total Guests */}
        <div className="stat-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered Guests</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totals.total_guests}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enrolled via CCTV edge stream
          </div>
        </div>

        {/* Metric 2: Currently Inside */}
        <div className="stat-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Currently Inside</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <LogIn size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {totals.currently_inside}
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block'
            }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active on premises right now
          </div>
        </div>

        {/* Metric 3: Total Recorded Visits */}
        <div className="stat-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Office Visits</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <RefreshCw size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totals.total_visits}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Cumulative visits recorded
          </div>
        </div>

        {/* Metric 4: Cumulative Hours */}
        <div className="stat-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Time Spent</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', color: '#d97706' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totals.total_inside_hours} <span style={{ fontSize: '1rem', fontWeight: 500 }}>hrs</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Total office dwell duration
          </div>
        </div>

        {/* Metric 5: Average Visit Duration */}
        <div className="stat-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Dwell / Visit</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totals.avg_visit_minutes} <span style={{ fontSize: '1rem', fontWeight: 500 }}>mins</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Average meeting/stay duration
          </div>
        </div>
      </div>

      {/* Filter and Query Bar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        {/* Quick Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} /> Quick Filter:
          </span>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: '7days', label: 'Last 7 Days' },
            { key: '30days', label: 'Last 30 Days' },
            { key: 'all', label: 'All History' }
          ].map(p => (
            <button
              key={p.key}
              onClick={() => handleQuickRange(p.key)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: quickRange === p.key ? '#9333ea' : 'var(--border-color)',
                background: quickRange === p.key ? 'rgba(147, 51, 234, 0.1)' : 'var(--bg-card)',
                color: quickRange === p.key ? '#9333ea' : 'var(--text-main)',
                fontSize: '0.75rem',
                fontWeight: quickRange === p.key ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Controls Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setQuickRange('custom'); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setQuickRange('custom'); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Classification
            </label>
            <select
              value={guestType}
              onChange={(e) => setGuestType(e.target.value)}
              className="select"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">All Classifications</option>
              <option value="Customer">Customer</option>
              <option value="Visitor">Visitor</option>
              <option value="VIP">VIP</option>
              <option value="Contractor">Contractor</option>
              <option value="Courier">Courier</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Presence Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">All Presence</option>
              <option value="INSIDE">Currently Inside</option>
              <option value="OUTSIDE">Departed / Outside</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Search Filter
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Name, Code, Org, Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: '28px', fontSize: '0.85rem' }}
              />
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'transparent', display: 'block', marginBottom: '4px', userSelect: 'none' }}>
              Action
            </label>
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.82rem', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title="Reset all filter fields"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Guests DataTable */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#9333ea" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Guest & Customer Recognition Ledger
            </span>
            <span style={{
              background: 'var(--bg-main)',
              color: 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {guests.length} records
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing visitors active between {startDate} and {endDate}
          </div>
        </div>

        {/* Bulk Actions Floating Toolbar */}
        {selectedGuestIds.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
            border: '1.5px solid #9333ea',
            borderRadius: '12px',
            padding: '12px 18px',
            margin: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.15)',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: '#9333ea',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {selectedGuestIds.length} Selected
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Bulk Actions for selected visitors
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {activeTab === 'active' ? (
                <>
                  <button
                    onClick={() => handleArchive(selectedGuestIds)}
                    className="btn"
                    style={{
                      background: 'rgba(147, 51, 234, 0.15)',
                      color: '#9333ea',
                      border: '1px solid rgba(147, 51, 234, 0.35)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Archive size={14} />
                    Move to Archive
                  </button>

                  <button
                    onClick={() => handleMoveToTamper(selectedGuestIds)}
                    className="btn"
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#d97706',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <AlertTriangle size={14} />
                    Move to Try to Tamper Area
                  </button>

                  <button
                    onClick={() => handleDeleteGuest(selectedGuestIds, false)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} />
                    Multiple Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRestore(selectedGuestIds)}
                    className="btn"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RotateCcw size={14} />
                    Restore to Active
                  </button>

                  <button
                    onClick={() => handleDeleteGuest(selectedGuestIds, true)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} />
                    Permanently Delete from System
                  </button>
                </>
              )}

              <button
                onClick={handleDeselectAll}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={13} />
                Deselect
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={guests}
          loading={loading}
          emptyMessage="No guest or customer movements recorded for the selected filter."
        />
      </div>

      {/* MODAL 1: Guest Visit History & Timeline Drawer */}
      {timelineModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to right, rgba(147, 51, 234, 0.05), transparent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#e2e8f0',
                  border: '2px solid rgba(147, 51, 234, 0.3)',
                  flexShrink: 0
                }}>
                  {selectedGuestTimeline?.latest_photo || selectedGuestTimeline?.first_photo ? (
                    <img
                      src={
                        (selectedGuestTimeline.latest_photo || selectedGuestTimeline.first_photo).startsWith('http') ||
                        (selectedGuestTimeline.latest_photo || selectedGuestTimeline.first_photo).startsWith('data:')
                          ? (selectedGuestTimeline.latest_photo || selectedGuestTimeline.first_photo)
                          : `http://127.0.0.1:8000${selectedGuestTimeline.latest_photo || selectedGuestTimeline.first_photo}`
                      }
                      alt="Guest Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Users size={22} color="#94a3b8" />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {selectedGuestTimeline?.guest_name || 'Guest / Visitor'}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{selectedGuestTimeline?.guest_code}</span>
                    <span>•</span>
                    <span style={{ ...getBadgeStyle(selectedGuestTimeline?.guest_type), padding: '1px 6px', borderRadius: '4px' }}>
                      {selectedGuestTimeline?.guest_type}
                    </span>
                    {selectedGuestTimeline?.company_name && (
                      <>
                        <span>•</span>
                        <span>{selectedGuestTimeline.company_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTimelineModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics Bar inside Modal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: 'var(--bg-main)',
              borderBottom: '1px solid var(--border-color)',
              padding: '12px 20px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Visits</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563eb' }}>
                  {selectedGuestTimeline?.total_visits || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total In-Office</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedGuestTimeline?.total_inside_hours || 0} hrs
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Dwell</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706' }}>
                  {selectedGuestTimeline?.avg_visit_minutes || 0} mins
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Status</div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginTop: '2px',
                  color: selectedGuestTimeline?.current_status === 'INSIDE' ? '#10b981' : '#64748b'
                }}>
                  {selectedGuestTimeline?.current_status || 'UNKNOWN'}
                </div>
              </div>
            </div>

            {/* Modal Body: Timeline Events */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {timelineLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                  <p>Loading chronological movement history...</p>
                </div>
              ) : !selectedGuestTimeline?.logs || selectedGuestTimeline.logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p>No individual camera events logged yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {selectedGuestTimeline.logs.map((log, index) => {
                    const isEntry = log.direction === 'IN';
                    return (
                      <div
                        key={log.id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: isEntry ? 'rgba(16, 185, 129, 0.04)' : 'rgba(234, 88, 12, 0.04)',
                          border: `1px solid ${isEntry ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 88, 12, 0.2)'}`
                        }}
                      >
                        {/* Event Snapshots: Face Portrait & Full Camera Group Frame */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {/* Face Crop Thumbnail */}
                          <div 
                            onClick={() => handlePreviewPhoto(
                              selectedGuestTimeline, 
                              log.snapshot_path ? `http://127.0.0.1:8000${log.snapshot_path}` : null,
                              log.full_snapshot_path ? `http://127.0.0.1:8000${log.full_snapshot_path}` : null,
                              'face'
                            )}
                            title="Click to enlarge visitor face crop"
                            style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#000',
                              flexShrink: 0,
                              border: '1.5px solid var(--border-color)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'transform 0.15s, border-color 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.borderColor = '#9333ea'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                          >
                            {log.snapshot_path ? (
                              <img
                                src={`http://127.0.0.1:8000${log.snapshot_path}`}
                                alt="Face Snapshot"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Users size={18} />
                              </div>
                            )}
                            <span style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(0,0,0,0.75)',
                              color: '#ffffff',
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              textAlign: 'center',
                              padding: '1px 0'
                            }}>
                              FACE
                            </span>
                          </div>

                          {/* Full Screen Shot Thumbnail (Group Context) */}
                          {log.full_snapshot_path ? (
                            <div 
                              onClick={() => handlePreviewPhoto(
                                selectedGuestTimeline, 
                                log.snapshot_path ? `http://127.0.0.1:8000${log.snapshot_path}` : null,
                                `http://127.0.0.1:8000${log.full_snapshot_path}`,
                                'full'
                              )}
                              title="Click to inspect full camera scene & companions (Group / Alone)"
                              style={{
                                width: '90px',
                                height: '54px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#0f172a',
                                flexShrink: 0,
                                border: '1.5px solid rgba(59, 130, 246, 0.45)',
                                cursor: 'pointer',
                                position: 'relative',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                transition: 'transform 0.15s, border-color 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.45)'; }}
                            >
                              <img
                                src={`http://127.0.0.1:8000${log.full_snapshot_path}`}
                                alt="Full Scene Snapshot"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <span style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                padding: '1px 4px',
                                borderRadius: '3px',
                                letterSpacing: '0.03em'
                              }}>
                                GROUP
                              </span>
                              <span style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.75)',
                                color: '#38bdf8',
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                padding: '1px 0'
                              }}>
                                FULL SCENE
                              </span>
                            </div>
                          ) : (
                            <div 
                              title="No full CCTV frame captured for this event"
                              style={{
                                width: '64px',
                                height: '54px',
                                borderRadius: '8px',
                                border: '1px dashed var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '0.6rem',
                                flexShrink: 0
                              }}
                            >
                              <Camera size={13} style={{ opacity: 0.35, marginBottom: '2px' }} />
                              <span>No Scene</span>
                            </div>
                          )}
                        </div>

                        {/* Event Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isEntry ? '#10b981' : '#f97316',
                                color: '#ffffff'
                              }}>
                                {isEntry ? <LogIn size={11} /> : <LogOut size={11} />}
                                {log.direction} Gate
                              </span>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                {log.gate_name || 'Main Gate'}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {log.punch_time}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} /> Camera: {log.camera_name || `Camera #${log.camera_id}`}
                            </span>
                            <span>•</span>
                            <span>Confidence: {parseFloat(log.confidence_score || 94.5).toFixed(1)}%</span>
                            
                            {!isEntry && log.duration_minutes > 0 && (
                              <>
                                <span>•</span>
                                <span style={{
                                  color: '#059669',
                                  fontWeight: 700,
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  Visit Session: {log.duration_minutes} mins
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-card)'
            }}>
              <button
                onClick={() => setTimelineModalOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Guest Profile & Tagging */}
      {editModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="#d97706" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Tag Guest / Customer Profile
                </h2>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px' }}>
              {editMessage.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: editMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: editMessage.type === 'success' ? '#059669' : '#dc2626',
                  border: `1px solid ${editMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {editMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{editMessage.text}</span>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Guest / Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.guest_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, guest_name: e.target.value }))}
                  placeholder="e.g. John Doe or VIP Client"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Classification
                  </label>
                  <select
                    value={editForm.guest_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, guest_type: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Visitor">Visitor</option>
                    <option value="VIP">VIP Client</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="e.g. ABC Enterprises"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+974 5555 1234"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Internal Host / Security Notes
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Key client of Sales Dept; escorts not required."
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #9333ea, #c026d3)', borderColor: '#9333ea' }}
                >
                  {savingEdit ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Visitor to Security Blacklist Modal */}
      {blacklistModalOpen && selectedVisitorForBlacklist && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.35)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldAlert size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fecaca' }}>
                    RESTRICTED ACCESS ACTION
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    Move Visitor to Security Blacklist
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setBlacklistModalOpen(false)}
                style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitMoveToBlacklist} style={{ padding: '20px' }}>
              {blacklistMessage.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: blacklistMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: blacklistMessage.type === 'success' ? '#059669' : '#dc2626',
                  border: `1px solid ${blacklistMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {blacklistMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{blacklistMessage.text}</span>
                </div>
              )}

              {/* Visitor Summary Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#1e293b',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}>
                  {(selectedVisitorForBlacklist.latest_photo || selectedVisitorForBlacklist.first_photo) ? (
                    <img
                      src={(selectedVisitorForBlacklist.latest_photo || selectedVisitorForBlacklist.first_photo).startsWith('http') || (selectedVisitorForBlacklist.latest_photo || selectedVisitorForBlacklist.first_photo).startsWith('data:')
                        ? (selectedVisitorForBlacklist.latest_photo || selectedVisitorForBlacklist.first_photo)
                        : `http://127.0.0.1:8000${selectedVisitorForBlacklist.latest_photo || selectedVisitorForBlacklist.first_photo}`}
                      alt={selectedVisitorForBlacklist.guest_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Users size={24} color="#94a3b8" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {selectedVisitorForBlacklist.guest_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Code: {selectedVisitorForBlacklist.guest_code} | Total Visits: {selectedVisitorForBlacklist.total_visits}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                    Face embedding & profile photo will be moved to Blacklist Registry.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Security Threat Level *
                  </label>
                  <select
                    value={blacklistForm.threat_level}
                    onChange={(e) => setBlacklistForm(prev => ({ ...prev, threat_level: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Critical">Critical Threat</option>
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Warning</option>
                    <option value="Low">Low Precaution</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Reason for Blacklist *
                  </label>
                  <input
                    type="text"
                    required
                    value={blacklistForm.reason}
                    onChange={(e) => setBlacklistForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Expelled visitor / Unauthorized"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Guard Handling Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={blacklistForm.notes}
                  onChange={(e) => setBlacklistForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Deny entry immediately, escort off premises, notify security control."
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#b91c1c',
                marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <strong>Security Impact:</strong> Once blacklisted, whenever this person is spotted at any CCTV Gate, the system will log an unauthorized access breach and trigger a full-screen alarm popup instantly.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBlacklistModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={movingToBlacklist}
                  className="btn btn-danger"
                  style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldAlert size={14} />
                  {movingToBlacklist ? 'Enforcing Blacklist...' : 'Confirm Move to Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visitor Face Image Lightbox & Identity Inspection */}
      {photoPreview && photoPreview.guest && (
        <div 
          onClick={() => setPhotoPreview(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '2px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: photoPreview.activeTab === 'full' ? '1250px' : '1000px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(168, 85, 247, 0.25)',
              animation: 'fadeIn 0.2s ease-out',
              transition: 'max-width 0.25s ease'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(192, 38, 211, 0.15) 100%)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #9333ea, #c026d3)',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9333ea' }}>
                    CCTV EDGE AI IDENTIFICATION
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Visitor Face Portrait & Profile
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setPhotoPreview(null)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* TAB TOGGLE: Face Portrait vs Full Camera Scene (Group / Alone) */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-muted)',
              padding: '8px 20px',
              gap: '10px'
            }}>
              <button
                onClick={() => setPhotoPreview(prev => ({ ...prev, activeTab: 'face' }))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: photoPreview.activeTab === 'face' ? '1px solid #9333ea' : '1px solid transparent',
                  background: photoPreview.activeTab === 'face' ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
                  color: photoPreview.activeTab === 'face' ? '#9333ea' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={15} />
                Face Portrait Crop
              </button>

              <button
                onClick={() => {
                  if (photoPreview.fullPhotoUrl) {
                    setPhotoPreview(prev => ({ ...prev, activeTab: 'full' }));
                  }
                }}
                disabled={!photoPreview.fullPhotoUrl}
                title={photoPreview.fullPhotoUrl ? "Inspect full CCTV wide-angle scene & accompanying group members" : "No full camera snapshot available for this visit event"}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: photoPreview.fullPhotoUrl ? 'pointer' : 'not-allowed',
                  opacity: photoPreview.fullPhotoUrl ? 1 : 0.5,
                  border: photoPreview.activeTab === 'full' ? '1px solid #2563eb' : '1px solid transparent',
                  background: photoPreview.activeTab === 'full' ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  color: photoPreview.activeTab === 'full' ? '#2563eb' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Camera size={15} />
                Full Camera Scene (Group / Co-Visitors)
                {photoPreview.fullPhotoUrl ? (
                  <span style={{
                    fontSize: '0.65rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    Available
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                    (N/A)
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              {photoPreview.activeTab === 'full' ? (
                /* FULL CAMERA SCENE VIEW (Group identification mode) */
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    background: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    borderRadius: '10px',
                    padding: '8px 14px'
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#2563eb' }}>
                        Wide-Angle CCTV Surveillance Scene
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Inspect who all arrived together with this visitor (group, companion, or alone).
                      </p>
                    </div>

                    {photoPreview.fullPhotoUrl && (
                      <a
                        href={photoPreview.fullPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          flexShrink: 0
                        }}
                      >
                        <ExternalLink size={12} />
                        Open High-Res
                      </a>
                    )}
                  </div>

                  <div style={{
                    width: '100%',
                    height: '540px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#090d16',
                    border: '2px solid rgba(59, 130, 246, 0.35)',
                    boxShadow: '0 12px 30px -5px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {photoPreview.fullPhotoUrl ? (
                      <img
                        src={photoPreview.fullPhotoUrl}
                        alt="Full Camera Scene"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Camera size={48} style={{ opacity: 0.4, marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.85rem' }}>No Full Camera Screenshot Available</div>
                      </div>
                    )}

                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      Full Raw Frame (Clean Surveillance Capture)
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'var(--bg-muted)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Identified Person:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{photoPreview.guest.guest_name}</strong>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>({photoPreview.guest.guest_code})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.74rem',
                        ...getBadgeStyle(photoPreview.guest.guest_type)
                      }}>
                        {photoPreview.guest.guest_type || 'Visitor'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Last Seen:</span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {photoPreview.guest.last_seen_at || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* FACE PORTRAIT & PROFILE METADATA VIEW */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '320px 1fr',
                  gap: '24px',
                  alignItems: 'start'
                }}>
                  {/* Left: Enlarged Photo Card */}
                  <div>
                    <div style={{
                      width: '100%',
                      height: '320px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: '#0f172a',
                      border: '2px solid rgba(168, 85, 247, 0.35)',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      {photoPreview.photoUrl ? (
                        <img
                          src={photoPreview.photoUrl}
                          alt={photoPreview.guest.guest_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                          <Users size={48} style={{ opacity: 0.5, marginBottom: '8px' }} />
                          <div style={{ fontSize: '0.85rem' }}>No Snapshot Captured</div>
                        </div>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '8px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        CCTV Live Facial Biometric Capture
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Security ID: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{photoPreview.guest.guest_code}</strong>
                    </div>
                  </div>

                  {/* Right: Detailed Visitor Metadata */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {photoPreview.guest.guest_name}
                      </h2>
                      {/^V\d{6}$/i.test(photoPreview.guest.guest_name) && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#2563eb',
                          fontWeight: 700,
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          Auto V-ID
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        ...getBadgeStyle(photoPreview.guest.guest_type)
                      }}>
                        <Tag size={12} />
                        {photoPreview.guest.guest_type || 'Visitor'}
                      </span>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '14px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: photoPreview.guest.current_status === 'INSIDE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                        color: photoPreview.guest.current_status === 'INSIDE' ? '#059669' : '#64748b',
                        border: photoPreview.guest.current_status === 'INSIDE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)'
                      }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: photoPreview.guest.current_status === 'INSIDE' ? '#10b981' : '#94a3b8',
                          boxShadow: photoPreview.guest.current_status === 'INSIDE' ? '0 0 6px #10b981' : 'none'
                        }} />
                        {photoPreview.guest.current_status || 'INSIDE'}
                      </span>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb'
                      }}>
                        {photoPreview.guest.total_visits || 1} Visits Recorded
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div style={{
                      background: 'var(--bg-muted)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '10px',
                      fontSize: '0.82rem',
                      border: '1px solid var(--border-color)',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Organization / Company:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{photoPreview.guest.company_name || 'Not Assigned'}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{photoPreview.guest.phone || 'Not Assigned'}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>First Detected:</span>
                        <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {photoPreview.guest.first_seen_at || 'N/A'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Last Detected:</span>
                        <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {photoPreview.guest.last_seen_at || 'N/A'}
                        </span>
                      </div>

                      {photoPreview.guest.notes && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Security Notes:</span>
                          <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                            "{photoPreview.guest.notes}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const g = photoPreview.guest;
                      setPhotoPreview(null);
                      handleOpenEdit(g);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Edit2 size={13} />
                    Rename / Edit Details
                  </button>

                  <button
                    onClick={() => {
                      const g = photoPreview.guest;
                      setPhotoPreview(null);
                      handleViewTimeline(g);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Eye size={13} />
                    View Movement Timeline
                  </button>

                  <button
                    onClick={() => {
                      const g = photoPreview.guest;
                      setPhotoPreview(null);
                      handleMoveToTamper(g);
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      background: 'rgba(245, 158, 11, 0.08)',
                      color: '#d97706',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    <AlertTriangle size={13} />
                    Move to Tamper Area
                  </button>

                  {activeTab === 'active' ? (
                    <button
                      onClick={() => {
                        const g = photoPreview.guest;
                        setPhotoPreview(null);
                        handleArchive(g);
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(147, 51, 234, 0.35)',
                        background: 'rgba(147, 51, 234, 0.08)',
                        color: '#9333ea',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      <Archive size={13} />
                      Move to Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const g = photoPreview.guest;
                        setPhotoPreview(null);
                        handleRestore(g);
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#059669',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    >
                      <RotateCcw size={13} />
                      Restore to Active
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const g = photoPreview.guest;
                      setPhotoPreview(null);
                      handleOpenBlacklistModal(g);
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    <ShieldAlert size={13} />
                    Move to Blacklist
                  </button>
                </div>

                <button
                  onClick={() => setPhotoPreview(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
