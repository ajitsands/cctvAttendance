// frontend/src/views/CamerasView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X, 
  LogIn, 
  LogOut, 
  Activity, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import { useDialog } from '../context/DialogContext';

export default function CamerasView({ onCamerasChanged }) {
  const { confirm, toast } = useDialog();
  const [cameras, setCameras] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [pingStatus, setPingStatus] = useState({});

  const [cameraForm, setCameraForm] = useState({
    camera_name: '',
    ip_address: '',
    rtsp_url: '',
    http_url: '',
    camera_role: 'IN',
    gate_name: 'Main Gate',
    door_location: 'Reception',
    is_active: 1
  });

  const [pairForm, setPairForm] = useState({
    gate_name: 'Main Gate',
    in_camera_id: '',
    out_camera_id: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [camRes, pairRes] = await Promise.all([
        api.getCameras(),
        api.getCameraPairs()
      ]);
      setCameras(camRes.data || []);
      setPairs(pairRes.data || []);
    } catch (err) {
      console.error('Failed to load camera data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddCamera = () => {
    setEditingCamera(null);
    setCameraForm({
      camera_name: `Gate Camera ${cameras.length + 1}`,
      ip_address: '192.168.100.',
      rtsp_url: 'rtsp://admin:admin123@192.168.100.113:554/live/ch0',
      http_url: 'http://192.168.100.113',
      camera_role: 'IN',
      gate_name: 'Main Gate',
      door_location: 'Reception Lobby',
      is_active: 1
    });
    setCameraModalOpen(true);
  };

  const openEditCamera = (cam) => {
    setEditingCamera(cam);
    setCameraForm({
      id: cam.id,
      camera_name: cam.camera_name,
      ip_address: cam.ip_address,
      rtsp_url: cam.rtsp_url,
      http_url: cam.http_url || '',
      camera_role: cam.camera_role,
      gate_name: cam.gate_name,
      door_location: cam.door_location || '',
      is_active: cam.is_active
    });
    setCameraModalOpen(true);
  };

  const handleTestPing = async (cam) => {
    setPingStatus(prev => ({ ...prev, [cam.id]: 'testing' }));
    try {
      const res = await api.testPing(cam.ip_address, 554, cam.id);
      setPingStatus(prev => ({ 
        ...prev, 
        [cam.id]: res.data?.online ? 'online' : 'offline' 
      }));
      fetchData();
    } catch (err) {
      setPingStatus(prev => ({ ...prev, [cam.id]: 'offline' }));
    }
  };

  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      await api.saveCamera(cameraForm);
      setCameraModalOpen(false);
      fetchData();
      try {
        await fetch('http://127.0.0.1:8001/reload_cameras');
      } catch (err) {}
      if (onCamerasChanged) onCamerasChanged();
      toast.success(editingCamera ? 'Camera updated successfully.' : 'New camera added.');
    } catch (err) {
      toast.error('Error saving camera: ' + err.message);
    }
  };

  const handleSavePair = async (e) => {
    e.preventDefault();
    try {
      await api.saveCameraPair(pairForm);
      setPairModalOpen(false);
      fetchData();
      toast.success('Gate pair configuration saved.');
    } catch (err) {
      toast.error('Error saving gate pair: ' + err.message);
    }
  };

  const handleDeleteCamera = async (id, name = 'this camera') => {
    const isConfirmed = await confirm({
      title: 'Delete Camera',
      message: `Are you sure you want to delete ${name}? RTSP stream ingestion and face detection for this device will be stopped.`,
      confirmText: 'Delete Camera',
      cancelText: 'Cancel',
      isDanger: true
    });
    if (!isConfirmed) return;

    try {
      await api.deleteCameraOrPair(id, 'camera');
      toast.success('Camera removed successfully.');
      fetchData();
      if (onCamerasChanged) onCamerasChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Video size={26} color="var(--menu-accent)" />
            CCTV Cameras & Gate Pairings
          </h2>
          <p className="page-desc">
            Manage RTSP stream endpoints (Port 554), pair IN and OUT cameras, and test local network hardware.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setPairModalOpen(true)}>
            <ShieldCheck size={16} />
            + Pair In & Out Gate
          </button>
          <button className="btn btn-primary" onClick={openAddCamera}>
            <Plus size={16} />
            + Add CCTV Camera
          </button>
        </div>
      </div>

      {/* Cameras List */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--menu-accent)" />
          Configured CCTV Cameras
        </h3>

        <DataTable
          data={cameras}
          loading={loading}
          rowKey="id"
          defaultSortKey="camera_name"
          searchPlaceholder="Filter cameras by name, IP, gate, role..."
          exportFileName="CCTV_Cameras_List"
          emptyMessage="No CCTV cameras configured yet."
          columns={[
            {
              key: 'camera_name',
              label: 'Camera Name',
              sortable: true,
              render: (cam) => (
                <div>
                  <div style={{ fontWeight: 700 }}>{cam.camera_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Camera ID: #{cam.id}</div>
                </div>
              )
            },
            {
              key: 'ip_address',
              label: 'IP Address',
              sortable: true,
              render: (cam) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {cam.ip_address}
                </span>
              )
            },
            {
              key: 'camera_role',
              label: 'Assigned Role',
              sortable: true,
              render: (cam) => (
                <span className={`badge ${cam.camera_role === 'IN' ? 'badge-in' : 'badge-out'}`}>
                  {cam.camera_role === 'IN' ? <LogIn size={12} /> : <LogOut size={12} />}
                  {cam.camera_role} (Direction)
                </span>
              )
            },
            {
              key: 'gate_name',
              label: 'Gate / Location',
              sortable: true,
              render: (cam) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{cam.gate_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cam.door_location}</div>
                </div>
              )
            },
            {
              key: 'rtsp_url',
              label: 'RTSP Stream URL (Port 554)',
              sortable: true,
              render: (cam) => (
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cam.rtsp_url}>
                  {cam.rtsp_url}
                </div>
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (cam) => {
                const isOnline = cam.status === 'Online';
                return (
                  <span className={`badge ${isOnline ? 'badge-present' : 'badge-absent'}`}>
                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {cam.status}
                  </span>
                );
              }
            },
            {
              key: 'hardware_ping',
              label: 'Hardware Ping',
              sortable: false,
              align: 'center',
              render: (cam) => {
                const ping = pingStatus[cam.id];
                return (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => handleTestPing(cam)}
                    disabled={ping === 'testing'}
                  >
                    <RefreshCw size={12} className={ping === 'testing' ? 'spin' : ''} />
                    {ping === 'testing' ? 'Testing...' : 'Ping Port 554'}
                  </button>
                );
              }
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              align: 'center',
              render: (cam) => (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => openEditCamera(cam)} title="Edit Camera">
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#ef4444' }} onClick={() => handleDeleteCamera(cam.id)} title="Delete Camera">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Paired Doors / Gates */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="var(--menu-accent)" />
          Door & Gate Pairings (IN Camera + OUT Camera)
        </h3>

        {pairs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No door pairings configured. Pair an IN camera and an OUT camera to establish a complete passage gate.
          </p>
        ) : (
          <div className="grid-cols-2">
            {pairs.map(p => (
              <div 
                key={p.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-muted)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>{p.gate_name}</h4>
                  <span className="badge badge-inside">PAIRED GATE</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {p.description || 'Main entrance and exit pairing'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Entrance Camera (IN)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '0.2rem' }}>
                      {p.in_camera_name || 'Not assigned'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.in_ip || '--'}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase' }}>Exit Camera (OUT)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '0.2rem' }}>
                      {p.out_camera_name || 'Not assigned'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.out_ip || '--'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Camera Modal */}
      {cameraModalOpen && (
        <div className="modal-overlay" onClick={() => setCameraModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingCamera ? 'Edit Camera Configuration' : 'Add New CCTV Camera'}
              </h3>
              <button onClick={() => setCameraModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCamera}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Camera Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required 
                    placeholder="e.g. Reception Gate Camera 1"
                    value={cameraForm.camera_name}
                    onChange={e => setCameraForm({ ...cameraForm, camera_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Camera IP Address *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required 
                      placeholder="e.g. 192.168.100.113"
                      value={cameraForm.ip_address}
                      onChange={e => setCameraForm({ ...cameraForm, ip_address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role / Direction *</label>
                    <select 
                      className="select" 
                      value={cameraForm.camera_role}
                      onChange={e => setCameraForm({ ...cameraForm, camera_role: e.target.value })}
                    >
                      <option value="IN">IN (Entry / Arrival)</option>
                      <option value="OUT">OUT (Exit / Departure)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">RTSP Stream URL (Port 554) *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required 
                    placeholder="rtsp://admin:admin123@192.168.100.113:554/live/ch0"
                    value={cameraForm.rtsp_url}
                    onChange={e => setCameraForm({ ...cameraForm, rtsp_url: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Supported Brands: <strong>UNV (Recommended)</strong> / <strong>Dahua</strong> / <strong>CP Plus</strong> (Port 554 RTSP). Include credentials if authentication is required.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Gate Name</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Main Gate, East Door"
                      value={cameraForm.gate_name}
                      onChange={e => setCameraForm({ ...cameraForm, gate_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Physical Location</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Reception Lobby"
                      value={cameraForm.door_location}
                      onChange={e => setCameraForm({ ...cameraForm, door_location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCameraModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCamera ? 'Save Changes' : 'Add Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pair In/Out Modal */}
      {pairModalOpen && (
        <div className="modal-overlay" onClick={() => setPairModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pair IN and OUT Cameras for a Gate</h3>
              <button onClick={() => setPairModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePair}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Gate / Door Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required 
                    placeholder="e.g. Gate 1 - Main Entrance"
                    value={pairForm.gate_name}
                    onChange={e => setPairForm({ ...pairForm, gate_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Entrance Camera (IN) *</label>
                    <select 
                      className="select" 
                      value={pairForm.in_camera_id}
                      onChange={e => setPairForm({ ...pairForm, in_camera_id: e.target.value })}
                    >
                      <option value="">Select IN Camera</option>
                      {cameras.filter(c => c.camera_role === 'IN').map(c => (
                        <option key={c.id} value={c.id}>{c.camera_name} ({c.ip_address})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exit Camera (OUT) *</label>
                    <select 
                      className="select" 
                      value={pairForm.out_camera_id}
                      onChange={e => setPairForm({ ...pairForm, out_camera_id: e.target.value })}
                    >
                      <option value="">Select OUT Camera</option>
                      {cameras.filter(c => c.camera_role === 'OUT').map(c => (
                        <option key={c.id} value={c.id}>{c.camera_name} ({c.ip_address})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Notes</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Ground floor glass door passage"
                    value={pairForm.description}
                    onChange={e => setPairForm({ ...pairForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPairModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Gate Pairing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
