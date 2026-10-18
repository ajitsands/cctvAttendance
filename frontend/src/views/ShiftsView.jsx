// frontend/src/views/ShiftsView.jsx
import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Edit2, Trash2, X, Clock, Check } from 'lucide-react';
import { api } from '../api';

export default function ShiftsView({ onShiftsChanged }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shift_type: 'Office',
    start_time: '08:00:00',
    end_time: '17:00:00',
    total_hours: 8.0,
    break_minutes: 60,
    grace_late_in: 15,
    grace_early_out: 15,
    half_day_min_hours: 4.0,
    full_day_min_hours: 7.0,
    color_code: '#2563eb'
  });

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await api.getShifts();
      setShifts(res.data || []);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const openAddModal = () => {
    setEditingShift(null);
    setFormData({
      name: '',
      code: 'SH-' + Math.floor(100 + Math.random() * 900),
      shift_type: 'Office',
      start_time: '08:00:00',
      end_time: '17:00:00',
      total_hours: 8.0,
      break_minutes: 60,
      grace_late_in: 15,
      grace_early_out: 15,
      half_day_min_hours: 4.0,
      full_day_min_hours: 7.0,
      color_code: '#2563eb'
    });
    setModalOpen(true);
  };

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setFormData({
      id: shift.id,
      name: shift.name,
      code: shift.code,
      shift_type: shift.shift_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      total_hours: parseFloat(shift.total_hours) || 8.0,
      break_minutes: parseInt(shift.break_minutes) || 60,
      grace_late_in: parseInt(shift.grace_late_in) || 15,
      grace_early_out: parseInt(shift.grace_early_out) || 15,
      half_day_min_hours: parseFloat(shift.half_day_min_hours) || 4.0,
      full_day_min_hours: parseFloat(shift.full_day_min_hours) || 7.0,
      color_code: shift.color_code || '#2563eb'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.saveShift(formData);
      setModalOpen(false);
      fetchShifts();
      if (onShiftsChanged) onShiftsChanged();
    } catch (err) {
      alert('Error saving shift: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this shift schedule?')) {
      try {
        await api.deleteShift(id);
        fetchShifts();
        if (onShiftsChanged) onShiftsChanged();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <CalendarClock size={26} color="var(--menu-accent)" />
            Shift Schedules & Class Hours
          </h2>
          <p className="page-desc">
            Define working hours, late grace thresholds, and minimum hours for Office and School modes.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            + Create New Shift
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Shift Name & Code</th>
              <th>Type</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Late Grace</th>
              <th>Half Day Min</th>
              <th>Full Day Min</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>Loading shifts...</td></tr>
            ) : shifts.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color_code || '#2563eb' }}></span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.code}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-inside">{s.shift_type}</span>
                </td>
                <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{s.start_time?.slice(0, 5)}</strong></td>
                <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{s.end_time?.slice(0, 5)}</strong></td>
                <td>{s.total_hours} Hours ({s.break_minutes}m break)</td>
                <td>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{s.grace_late_in} mins</span>
                </td>
                <td>{s.half_day_min_hours} hrs</td>
                <td>{s.full_day_min_hours} hrs</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => openEditModal(s)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#ef4444' }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingShift ? 'Edit Shift Schedule' : 'Create New Shift / Class Hours'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shift Name *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required 
                      placeholder="e.g. Standard Office Hours"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shift Code *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required 
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select 
                      className="select" 
                      value={formData.shift_type}
                      onChange={e => setFormData({ ...formData, shift_type: e.target.value })}
                    >
                      <option value="Office">Office Working Hours</option>
                      <option value="School Class">School Class Period</option>
                      <option value="Flexible">Flexible Schedule</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input 
                      type="time" 
                      className="input" 
                      required 
                      value={formData.start_time.slice(0, 5)}
                      onChange={e => setFormData({ ...formData, start_time: e.target.value + ':00' })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input 
                      type="time" 
                      className="input" 
                      required 
                      value={formData.end_time.slice(0, 5)}
                      onChange={e => setFormData({ ...formData, end_time: e.target.value + ':00' })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Late Arrival Grace Period (Minutes)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      max="120"
                      value={formData.grace_late_in}
                      onChange={e => setFormData({ ...formData, grace_late_in: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Break Allowance (Minutes)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={formData.break_minutes}
                      onChange={e => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Min Hours for Half Day</label>
                    <input 
                      type="number" 
                      step="0.5"
                      className="input" 
                      value={formData.half_day_min_hours}
                      onChange={e => setFormData({ ...formData, half_day_min_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Hours for Full Day</label>
                    <input 
                      type="number" 
                      step="0.5"
                      className="input" 
                      value={formData.full_day_min_hours}
                      onChange={e => setFormData({ ...formData, full_day_min_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingShift ? 'Save Changes' : 'Create Shift'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
