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
  Layers
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function GuestsView() {
  const [guests, setGuests] = useState([]);
  const [totals, setTotals] = useState({
    total_guests: 0,
    currently_inside: 0,
    total_visits: 0,
    total_inside_hours: 0,
    avg_visit_minutes: 0
  });
  const [loading, setLoading] = useState(true);

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
        search: search
      });

      setGuests(res.data?.guests || []);
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
    loadGuests();
  }, [startDate, endDate, guestType, status, search]);

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

  // Delete Guest Record
  const handleDeleteGuest = async (guest) => {
    if (!window.confirm(`Are you sure you want to delete ${guest.guest_name} (${guest.guest_code}) and all movement history?`)) {
      return;
    }
    try {
      await api.deleteGuest(guest.id);
      loadGuests();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
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
      alert('No guest records to export.');
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
      header: 'Face Photo',
      accessor: 'latest_photo',
      render: (row) => {
        const photo = row.latest_photo || row.first_photo;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#e2e8f0',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {photo ? (
                <img 
                  src={photo.startsWith('http') || photo.startsWith('data:') ? photo : `http://127.0.0.1:8000${photo}`} 
                  alt={row.guest_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Users size={20} color="#94a3b8" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {row.guest_code}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Auto-Enrolled AI
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Guest / Customer Identity',
      accessor: 'guest_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
            {row.guest_name}
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
      )
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
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => handleViewTimeline(row)}
            title="View Visit Timeline & Snapshots"
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: '#2563eb',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            <Eye size={13} /> History
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Guest / Customer Details"
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: '#d97706',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => handleDeleteGuest(row)}
            title="Delete Guest"
            style={{
              padding: '5px 7px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.05)',
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={13} />
          </button>
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
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="primary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #9333ea, #c026d3)',
              borderColor: '#9333ea'
            }}
          >
            <Download size={14} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
              className="form-input"
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
              className="form-input"
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
              className="form-input"
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
              className="form-input"
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
                className="form-input"
                style={{ width: '100%', paddingLeft: '28px', fontSize: '0.85rem' }}
              />
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <button
              onClick={handleResetFilters}
              className="secondary-btn"
              style={{ width: '100%', fontSize: '0.82rem', height: '38px' }}
            >
              Reset Filters
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
                        {/* Event Snapshot */}
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#000',
                          flexShrink: 0,
                          border: '1px solid var(--border-color)'
                        }}>
                          {log.snapshot_path ? (
                            <img
                              src={`http://127.0.0.1:8000${log.snapshot_path}`}
                              alt="Log Snapshot"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                              <Users size={18} />
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
                className="secondary-btn"
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
                  className="secondary-btn"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="primary-btn"
                  style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #9333ea, #c026d3)' }}
                >
                  {savingEdit ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
