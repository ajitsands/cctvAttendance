// frontend/src/views/UsersView.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X, 
  Camera, 
  Upload, 
  AlertCircle,
  ScanFace,
  Sparkles,
  Crop,
  Video,
  Globe,
  ExternalLink,
  Activity,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import ImageCropModal from '../components/ImageCropModal';
import { useDialog } from '../context/DialogContext';

export default function UsersView({ shifts = [], onUsersChanged }) {
  const { confirm, toast } = useDialog();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    user_code: '',
    full_name: '',
    user_type: 'Employee',
    email: '',
    mobile: '',
    address: '',
    cpr_no: '',
    department: 'Engineering',
    designation: 'Staff',
    shift_id: shifts[0]?.id || 1,
    status: 'Active',
    profile_photo: '',
    face_embedding: null
  });

  // Photo Capture Source Modes: 'webcam' | 'ip' | 'upload'
  const [photoSourceMode, setPhotoSourceMode] = useState('webcam');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraIp, setCameraIp] = useState('192.168.100.113');
  const [ipStreamActive, setIpStreamActive] = useState(false);
  const [ipStreamKey, setIpStreamKey] = useState(Date.now());
  const [pingTesting, setPingTesting] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);

  // Webcam & Face AI State
  const [webcamActive, setWebcamActive] = useState(false);
  const [faceExtracting, setFaceExtracting] = useState(false);
  const [faceEnrolledMsg, setFaceEnrolledMsg] = useState(null);
  const [actionToast, setActionToast] = useState(null);
  const [targetRowUser, setTargetRowUser] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState('modal'); // 'modal' | 'row'
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const ipImgRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const rowFileInputRef = useRef(null);

  // Load configured cameras for IP camera selection
  const fetchCamerasList = async () => {
    try {
      const res = await api.getCameras();
      const list = res.data || [];
      setCameras(list);
      if (list.length > 0) {
        setSelectedCameraId(prev => prev || list[0].id);
        setCameraIp(prev => prev || list[0].ip_address || '192.168.100.113');
      }
    } catch (err) {
      console.warn('Could not load cameras list:', err);
    }
  };

  useEffect(() => {
    fetchCamerasList();
  }, []);

  useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => setActionToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionToast]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({ search, user_type: userType });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const openAddModal = () => {
    fetchCamerasList();
    stopWebcam();
    stopIpCamera();
    setPingStatus(null);
    setEditingUser(null);
    setFormData({
      user_code: 'EMP-' + Math.floor(1000 + Math.random() * 9000),
      full_name: '',
      user_type: 'Employee',
      email: '',
      mobile: '',
      address: '',
      cpr_no: '',
      department: 'Engineering',
      designation: 'Staff',
      shift_id: shifts[0]?.id || 1,
      status: 'Active',
      profile_photo: '',
      face_embedding: null
    });
    setFaceEnrolledMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    fetchCamerasList();
    stopWebcam();
    stopIpCamera();
    setPingStatus(null);
    setEditingUser(user);
    setFormData({
      id: user.id,
      user_code: user.user_code,
      full_name: user.full_name,
      user_type: user.user_type,
      email: user.email || '',
      mobile: user.mobile || '',
      address: user.address || '',
      cpr_no: user.cpr_no || '',
      department: user.department || 'General',
      designation: user.designation || 'Staff',
      shift_id: user.shift_id || 1,
      status: user.status || 'Active',
      profile_photo: user.profile_photo || '',
      face_embedding: user.face_embedding || null
    });
    setFaceEnrolledMsg(user.has_face_enrolled ? 'Face embedding already enrolled' : null);
    setModalOpen(true);
  };

  const closeModal = () => {
    stopWebcam();
    stopIpCamera();
    setModalOpen(false);
  };

  // Webcam Capture with robust preview binding
  const startWebcam = async () => {
    try {
      stopIpCamera();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setWebcamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 480 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Webcam play notice:', e));
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      toast.error('Could not access webcam: ' + err.message);
      setWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  // Safeguard: Ensure stream attaches as soon as webcamActive flips
  useEffect(() => {
    if (webcamActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(e => console.warn('Webcam play notice:', e));
    }
  }, [webcamActive]);

  // Callback ref so when <video> mounts into DOM, stream is immediately bound
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(e => console.warn('Webcam callback play notice:', e));
    }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.95);
      stopWebcam();
      setCropTarget('modal');
      setCropImageSrc(b64);
      setCropModalOpen(true);
    } catch (err) {
      toast.error('Failed to capture frame from webcam: ' + err.message);
    }
  };

  // IP Camera Handlers
  const handleCameraSelectChange = (e) => {
    const val = e.target.value;
    setSelectedCameraId(val);
    setPingStatus(null);
    if (val === 'custom') {
      // Keep or let user edit custom IP
    } else {
      const found = cameras.find(c => String(c.id) === String(val));
      if (found) {
        setCameraIp(found.ip_address || '');
      }
    }
    if (ipStreamActive) {
      setIpStreamKey(Date.now());
    }
  };

  const startIpCamera = () => {
    stopWebcam();
    if (!cameraIp && (!selectedCameraId || selectedCameraId === 'custom')) {
      toast.error('Please enter a valid Camera IP address.');
      return;
    }
    setIpStreamKey(Date.now());
    setIpStreamActive(true);
  };

  const stopIpCamera = () => {
    setIpStreamActive(false);
  };

  const openCameraWeb = () => {
    if (!cameraIp) {
      toast.error('Please enter a Camera IP address first.');
      return;
    }
    const clean = cameraIp.trim().replace(/^https?:\/\//i, '').split('/')[0];
    const url = `http://${clean}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const testCameraPing = async () => {
    if (!cameraIp) {
      toast.error('Please specify an IP address to ping.');
      return;
    }
    const cleanIp = cameraIp.trim().replace(/^https?:\/\//i, '').split('/')[0];
    setPingTesting(true);
    setPingStatus(null);
    try {
      const res = await api.testPing(cleanIp, 554, selectedCameraId !== 'custom' ? selectedCameraId : null);
      if (res?.data?.online) {
        setPingStatus({ online: true, message: `Online (Port 554 RTSP reachable)` });
        toast.success(`Camera ${cleanIp} is ONLINE and reachable!`);
      } else {
        setPingStatus({ online: false, message: res?.data?.error || 'Offline / Port 554 Unreachable' });
        toast.error(`Camera ${cleanIp} is OFFLINE or unreachable.`);
      }
    } catch (err) {
      setPingStatus({ online: false, message: 'Ping error: ' + err.message });
      toast.error('Ping failed: ' + err.message);
    } finally {
      setPingTesting(false);
    }
  };

  const captureIpPhoto = async () => {
    try {
      let snapUrl = '';
      if (selectedCameraId && selectedCameraId !== 'custom') {
        snapUrl = `http://127.0.0.1:8001/snapshot/${selectedCameraId}?t=${Date.now()}`;
      } else if (cameraIp) {
        snapUrl = `http://127.0.0.1:8001/snapshot?ip=${encodeURIComponent(cameraIp.trim())}&t=${Date.now()}`;
      }

      if (!snapUrl) {
        toast.error('No camera selected or IP provided.');
        return;
      }

      const res = await fetch(snapUrl);
      if (!res.ok) throw new Error(`Snapshot request failed with HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Received empty snapshot frame.');

      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = e.target.result;
        stopIpCamera();
        setCropTarget('modal');
        setCropImageSrc(b64);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('IP snapshot error:', err);
      if (ipImgRef.current) {
        try {
          const img = ipImgRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 640;
          canvas.height = img.naturalHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const b64 = canvas.toDataURL('image/jpeg', 0.95);
          stopIpCamera();
          setCropTarget('modal');
          setCropImageSrc(b64);
          setCropModalOpen(true);
          return;
        } catch (cErr) {
          console.warn('Canvas fallback error:', cErr);
        }
      }
      toast.error('Could not capture frame from IP camera: ' + err.message);
    }
  };

  // Quick Photo Upload for any person directly from the table
  const triggerQuickPhotoUpload = (user) => {
    setTargetRowUser(user);
    if (rowFileInputRef.current) {
      rowFileInputRef.current.value = '';
      rowFileInputRef.current.click();
    }
  };

  const handleRowPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetRowUser) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const rawB64 = uploadEvent.target.result;
      setCropTarget('row');
      setCropImageSrc(rawB64);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (rowFileInputRef.current) rowFileInputRef.current.value = '';
  };

  // Modal Photo Upload -> Opens Cropper
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const rawB64 = uploadEvent.target.result;
      setCropTarget('modal');
      setCropImageSrc(rawB64);
      setCropModalOpen(true);
    };
    reader.onloadend = () => {
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Handler invoked when ImageCropModal finishes cropping
  const handleCropComplete = async (croppedB64) => {
    if (cropTarget === 'modal') {
      setFormData(prev => ({ ...prev, profile_photo: croppedB64 }));
      extractEmbedding(croppedB64);
    } else if (cropTarget === 'row' && targetRowUser) {
      setActionToast({ type: 'info', text: `Enrolling cropped biometric face for ${targetRowUser.full_name}...` });

      let emb = null;
      let hasFace = false;
      try {
        const embRes = await api.extractFaceEmbedding(croppedB64);
        if (embRes && embRes.success && embRes.embedding) {
          emb = embRes.embedding;
          hasFace = true;
        }
      } catch (embErr) {
        console.warn('Face embedding extraction notice:', embErr);
      }

      try {
        await api.uploadUserPhoto({
          user_id: targetRowUser.id,
          user_code: targetRowUser.user_code,
          profile_photo: croppedB64,
          face_embedding: emb
        });

        fetchUsers();
        if (onUsersChanged) onUsersChanged();
        setActionToast({
          type: 'success',
          text: hasFace 
            ? `Cropped photo and 128-D face biometric vector enrolled for ${targetRowUser.full_name}!`
            : `Cropped profile photo saved for ${targetRowUser.full_name}!`
        });
      } catch (saveErr) {
        setActionToast({ type: 'error', text: 'Error uploading photo: ' + saveErr.message });
      }
    }
  };

  const extractEmbedding = async (b64Image) => {
    setFaceExtracting(true);
    try {
      const res = await api.extractFaceEmbedding(b64Image);
      if (res && res.success && res.embedding) {
        setFormData(prev => ({ ...prev, face_embedding: res.embedding }));
        setFaceEnrolledMsg(`Face successfully verified (${res.confidence}% match confidence) and 128-d vector enrolled!`);
      } else {
        setFaceEnrolledMsg('Photo attached. Tip: Ensure face is front-facing and clearly lit for instant camera recognition.');
      }
    } catch (err) {
      console.warn('Face detection notice:', err.message);
      setFaceEnrolledMsg('Photo attached. Tip: Ensure face is front-facing and clearly lit for instant camera recognition.');
    } finally {
      setFaceExtracting(false);
    }
  };

  const [savingUser, setSavingUser] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      await api.saveUser(formData);
      toast.success(formData.id ? 'Person details updated successfully.' : 'New person registered successfully.');
      closeModal();
      fetchUsers();
      if (onUsersChanged) onUsersChanged();
    } catch (err) {
      toast.error('Error saving user: ' + (err.message || 'Upload failed'));
    } finally {
      setSavingUser(false);
    }
  };

  const handleDelete = async (id, name = 'this person') => {
    const isConfirmed = await confirm({
      title: 'Deactivate Staff Member',
      message: `Are you sure you want to deactivate ${name}? Their gate access and face attendance logging will be suspended.`,
      confirmText: 'Deactivate Member',
      cancelText: 'Cancel',
      isDanger: true
    });
    if (!isConfirmed) return;

    try {
      await api.deleteUser(id);
      toast.success('Person deactivated successfully.');
      fetchUsers();
      if (onUsersChanged) onUsersChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Users size={26} color="var(--menu-accent)" />
            Staff & Student Identity Management
          </h2>
          <p className="page-desc">
            Register personnel, manage basic info, and enroll offline facial biometric embeddings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={openAddModal}>
            <UserPlus size={16} />
            + Register New Person
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          background: actionToast.type === 'error' ? '#fee2e2' : (actionToast.type === 'info' ? '#e0f2fe' : 'var(--status-present-bg)'),
          color: actionToast.type === 'error' ? '#dc2626' : (actionToast.type === 'info' ? '#0369a1' : 'var(--status-present)'),
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionToast.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Search by name, ID code, phone, or email..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <div style={{ width: '180px' }}>
            <select 
              className="select" 
              value={userType} 
              onChange={(e) => setUserType(e.target.value)}
            >
              <option value="">All Personnel</option>
              <option value="Employee">Office Staff (Employees)</option>
              <option value="Student">School Students</option>
              <option value="Visitor">Visitors</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            <Search size={16} /> Search
          </button>
        </form>
      </div>

      {/* Users DataTable */}
      <DataTable
        data={users}
        loading={loading}
        rowKey="id"
        defaultSortKey="full_name"
        searchPlaceholder="Filter personnel by name, ID, phone, role, department..."
        exportFileName="Personnel_Directory"
        emptyMessage="No personnel records found. Click '+ Register New Person' to enroll."
        columns={[
          {
            key: 'full_name',
            label: 'Person Details',
            sortable: true,
            render: (u) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div 
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--bg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    overflow: 'hidden',
                    border: '2px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    flexShrink: 0
                  }}
                  onClick={() => triggerQuickPhotoUpload(u)}
                  title="Click to Upload / Change Photo"
                >
                  {u.profile_photo ? (
                    <img src={u.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    u.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {u.user_code}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'designation',
            label: 'Type & Role',
            sortable: true,
            render: (u) => (
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.designation || 'Staff'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {u.department} • {u.user_type}
                </div>
              </div>
            )
          },
          {
            key: 'mobile',
            label: 'Contact & Mobile',
            sortable: true,
            render: (u) => (
              <div>
                <div style={{ fontSize: '0.85rem' }}>{u.mobile || '--'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email || '--'}</div>
              </div>
            )
          },
          {
            key: 'address',
            label: 'Address / CPR',
            sortable: true,
            render: (u) => (
              <div>
                <div style={{ fontSize: '0.85rem' }}>{u.address || '--'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  CPR: {u.cpr_no || '--'}
                </div>
              </div>
            )
          },
          {
            key: 'shift_name',
            label: 'Shift / Hours',
            sortable: true,
            render: (u) => (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{u.shift_name || 'Standard'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {u.start_time?.slice(0, 5)} - {u.end_time?.slice(0, 5)}
                </div>
              </div>
            )
          },
          {
            key: 'has_face_enrolled',
            label: 'Biometric Face AI',
            sortable: true,
            render: (u) => (
              u.has_face_enrolled ? (
                <span className="badge badge-present" style={{ fontSize: '0.7rem' }}>
                  <CheckCircle2 size={12} />
                  ENROLLED (128-D)
                </span>
              ) : (
                <span className="badge badge-absent" style={{ fontSize: '0.7rem' }}>
                  NO FACE DATA
                </span>
              )
            )
          },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (u) => (
              <span className={`badge ${u.status === 'Active' ? 'badge-present' : 'badge-absent'}`}>
                {u.status}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            align: 'center',
            render: (u) => (
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: 'var(--menu-accent)' }}
                  onClick={() => triggerQuickPhotoUpload(u)}
                  title="Quick Upload Photo"
                >
                  <Camera size={13} />
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                  onClick={() => openEditModal(u)}
                  title="Edit User & Face"
                >
                  <Edit2 size={13} />
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#ef4444' }}
                  onClick={() => handleDelete(u.id, u.full_name)}
                  title="Deactivate"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          }
        ]}
      />

      {/* Hidden Row Photo File Input */}
      <input 
        ref={rowFileInputRef} 
        type="file" 
        accept="image/*,.jpg,.jpeg,.png,.webp,.bmp" 
        style={{ display: 'none' }} 
        onChange={handleRowPhotoUpload} 
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1060px', width: '96%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingUser ? `Edit Personnel: ${editingUser.full_name}` : 'Register New Staff / Student'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Two Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.12fr) minmax(380px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
                  {/* Left Column: Details */}
                  <div>
                    <div className="form-group">
                      <label className="form-label">Personnel Type</label>
                      <select 
                        className="select" 
                        value={formData.user_type} 
                        onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                      >
                        <option value="Employee">Office Staff (Employee)</option>
                        <option value="Student">School Student</option>
                        <option value="Visitor">Visitor / Contractor</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input 
                          type="text" 
                          className="input" 
                          required 
                          placeholder="e.g. Rahul Sharma"
                          value={formData.full_name} 
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ID Code *</label>
                        <input 
                          type="text" 
                          className="input" 
                          required 
                          value={formData.user_code} 
                          onChange={(e) => setFormData({ ...formData, user_code: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Mobile Number</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="+973 39..."
                          value={formData.mobile} 
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                          type="email" 
                          className="input" 
                          placeholder="name@sandslab.me"
                          value={formData.email} 
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Department</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="Engineering / Grade 10"
                          value={formData.department} 
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Designation / Role</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="Developer / Student"
                          value={formData.designation} 
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Assigned Shift / Hours</label>
                        <select 
                          className="select" 
                          value={formData.shift_id} 
                          onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                        >
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">CPR / National ID</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="e.g. 91020304"
                          value={formData.cpr_no} 
                          onChange={(e) => setFormData({ ...formData, cpr_no: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Residential Address</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Building, Road, Block, City"
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Right Column: Face Biometric Enrollment */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                        <ScanFace size={16} color="var(--menu-accent)" />
                        Facial Biometric Photo & AI Vector
                      </label>
                      {formData.profile_photo && (
                        <span style={{
                          fontSize: '0.72rem',
                          color: 'var(--status-present)',
                          background: 'var(--status-present-bg)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700
                        }}>
                          ✓ Photo Attached
                        </span>
                      )}
                    </div>

                    {/* Source Mode Tabs: Webcam | IP Camera | Upload File */}
                    <div style={{
                      display: 'flex',
                      background: 'var(--bg-card)',
                      padding: '4px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      marginBottom: '0.75rem',
                      gap: '4px'
                    }}>
                      <button
                        type="button"
                        onClick={() => { setPhotoSourceMode('webcam'); stopIpCamera(); }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: photoSourceMode === 'webcam' ? 'var(--menu-accent)' : 'transparent',
                          color: photoSourceMode === 'webcam' ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Camera size={14} /> Webcam
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPhotoSourceMode('ip'); stopWebcam(); }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: photoSourceMode === 'ip' ? 'var(--menu-accent)' : 'transparent',
                          color: photoSourceMode === 'ip' ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Globe size={14} /> IP Camera
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPhotoSourceMode('upload'); stopWebcam(); stopIpCamera(); }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: photoSourceMode === 'upload' ? 'var(--menu-accent)' : 'transparent',
                          color: photoSourceMode === 'upload' ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Upload size={14} /> Upload Photo
                      </button>
                    </div>

                    {/* IP Camera Configuration Controls */}
                    {photoSourceMode === 'ip' && (
                      <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', display: 'block' }}>
                              Select CCTV Camera
                            </label>
                            <select 
                              className="select" 
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              value={selectedCameraId}
                              onChange={handleCameraSelectChange}
                            >
                              {cameras.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.camera_name} ({c.ip_address})
                                </option>
                              ))}
                              <option value="custom">⚙ Custom IP / Stream URL</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', display: 'block' }}>
                              Camera IP Address
                            </label>
                            <input
                              type="text"
                              className="input"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="e.g. 192.168.100.113"
                              value={cameraIp}
                              onChange={(e) => {
                                setCameraIp(e.target.value);
                                if (selectedCameraId !== 'custom') {
                                  setSelectedCameraId('custom');
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Quick IP Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {!ipStreamActive ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              onClick={startIpCamera}
                            >
                              <Video size={13} /> Open Camera Feed
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#ef4444' }}
                              onClick={stopIpCamera}
                            >
                              Stop Feed
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            onClick={openCameraWeb}
                            title="Open camera web admin in a new browser tab"
                          >
                            <ExternalLink size={13} /> Open Camera IP
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            onClick={testCameraPing}
                            disabled={pingTesting}
                          >
                            <Activity size={13} /> {pingTesting ? 'Testing...' : 'Ping IP'}
                          </button>

                          {pingStatus && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 700,
                              background: pingStatus.online ? 'var(--status-present-bg)' : '#fee2e2',
                              color: pingStatus.online ? 'var(--status-present)' : '#ef4444'
                            }}>
                              {pingStatus.online ? '● Online (554 OK)' : '● Offline'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Biometric Frame & Live Video Container */}
                    <div style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.85rem',
                      textAlign: 'center',
                      background: 'var(--bg-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      minHeight: '260px',
                      justifyContent: 'center'
                    }}>
                      {/* 1. Live Webcam Feed */}
                      {webcamActive ? (
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: '340px',
                          height: '240px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          background: '#090d16',
                          boxShadow: 'var(--shadow-md)',
                          border: '2px solid var(--menu-accent)'
                        }}>
                          <video 
                            ref={setVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            onLoadedMetadata={() => videoRef.current?.play().catch(console.warn)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(16, 185, 129, 0.9)',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }}></span>
                            LIVE WEBCAM
                          </div>
                        </div>
                      ) : ipStreamActive ? (
                        /* 2. Live IP Camera Feed */
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: '340px',
                          height: '240px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          background: '#090d16',
                          boxShadow: 'var(--shadow-md)',
                          border: '2px solid var(--menu-accent)'
                        }}>
                          <img 
                            ref={ipImgRef}
                            key={ipStreamKey}
                            src={selectedCameraId && selectedCameraId !== 'custom'
                              ? `http://127.0.0.1:8001/video_feed/${selectedCameraId}?t=${ipStreamKey}`
                              : `http://127.0.0.1:8001/video_feed?ip=${encodeURIComponent(cameraIp)}&t=${ipStreamKey}`
                            }
                            alt="Live IP Camera Stream"
                            crossOrigin="anonymous"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={() => {
                              toast.error(`Could not connect to stream for ${cameraIp}. Verify camera is powered on and streaming.`);
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }}></span>
                            LIVE IP RTSP: {cameraIp}
                          </div>
                        </div>
                      ) : formData.profile_photo ? (
                        /* 3. Existing Enrolled Profile Photo */
                        <div style={{
                          width: '190px',
                          height: '190px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '4px solid var(--menu-accent)',
                          boxShadow: 'var(--shadow-md)',
                          position: 'relative'
                        }}>
                          <img 
                            src={formData.profile_photo} 
                            alt="Personnel Biometric Portrait" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      ) : (
                        /* 4. Empty State Placeholder */
                        <div style={{ padding: '1.75rem 1rem', color: 'var(--text-muted)' }}>
                          <Camera size={44} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                          <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>No biometric portrait enrolled</p>
                          <p style={{ fontSize: '0.74rem', marginTop: '0.25rem', opacity: 0.8 }}>
                            Capture via webcam, stream from IP camera, or upload a photo file.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons underneath preview */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {webcamActive ? (
                          <>
                            <button type="button" className="btn btn-success" onClick={capturePhoto}>
                              <Camera size={15} /> Capture & Extract Face
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={stopWebcam}>
                              Cancel
                            </button>
                          </>
                        ) : ipStreamActive ? (
                          <>
                            <button type="button" className="btn btn-success" onClick={captureIpPhoto}>
                              <Camera size={15} /> Capture & Extract Face
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={stopIpCamera}>
                              Close Stream
                            </button>
                          </>
                        ) : (
                          <>
                            {photoSourceMode === 'webcam' && (
                              <button type="button" className="btn btn-primary" onClick={startWebcam}>
                                <Camera size={15} /> Turn On Webcam
                              </button>
                            )}

                            {photoSourceMode === 'ip' && (
                              <button type="button" className="btn btn-primary" onClick={startIpCamera}>
                                <Video size={15} /> Open IP Camera Feed
                              </button>
                            )}

                            {photoSourceMode === 'upload' && (
                              <button type="button" className="btn btn-primary" onClick={() => modalFileInputRef.current?.click()}>
                                <Upload size={15} /> Select Photo File
                              </button>
                            )}

                            <input 
                              ref={modalFileInputRef} 
                              type="file" 
                              accept="image/*,.jpg,.jpeg,.png,.webp,.bmp" 
                              style={{ display: 'none' }} 
                              onChange={handlePhotoUpload} 
                            />

                            {formData.profile_photo && (
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => {
                                  setCropImageSrc(formData.profile_photo);
                                  setCropTarget('modal');
                                  setCropModalOpen(true);
                                }}
                                title="Adjust crop and alignment"
                              >
                                <Crop size={15} /> Crop / Frame
                              </button>
                            )}

                            {formData.profile_photo && (
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ color: '#ef4444' }}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, profile_photo: '', face_embedding: null }));
                                  setFaceEnrolledMsg(null);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {faceExtracting && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--menu-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Extracting 128-d offline face embeddings...
                        </div>
                      )}

                      {faceEnrolledMsg && (
                        <div style={{
                          fontSize: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--status-present-bg)',
                          color: 'var(--status-present)',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600
                        }}>
                          {faceEnrolledMsg}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.85rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <strong>AI Enrollment Tip:</strong> The face vector is generated locally with YuNet + SFace. Look directly at the camera with clear lighting.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Save Changes' : 'Register Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Image Crop Modal for Personnel Portraits */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        title={cropTarget === 'row' && targetRowUser ? `Crop Face for ${targetRowUser.full_name}` : 'Crop & Frame Personnel Portrait'}
        cropShape="round"
      />
    </div>
  );
}
