// frontend/src/views/UsersView.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  Crop
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
  const modalFileInputRef = useRef(null);
  const rowFileInputRef = useRef(null);

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
    setModalOpen(false);
  };

  // Webcam Capture
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamActive(true);
    } catch (err) {
      toast.error('Could not access webcam: ' + err.message);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.95);
    stopWebcam();
    setCropTarget('modal');
    setCropImageSrc(b64);
    setCropModalOpen(true);
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
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
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ScanFace size={16} color="var(--menu-accent)" />
                      Facial Biometric Photo & AI Vector
                    </label>

                    <div style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      textAlign: 'center',
                      background: 'var(--bg-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      {webcamActive ? (
                        <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : formData.profile_photo ? (
                        <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--menu-accent)', boxShadow: 'var(--shadow-md)' }}>
                          <img src={formData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                          <Camera size={44} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                          <p style={{ fontSize: '0.8rem' }}>Take photo with webcam or upload a clear front-facing portrait.</p>
                        </div>
                      )}

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
                        ) : (
                          <>
                            <button type="button" className="btn btn-secondary" onClick={startWebcam}>
                              <Camera size={15} /> Use Webcam
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => modalFileInputRef.current?.click()}>
                              <Upload size={15} /> Upload Photo
                            </button>
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
                        <div style={{ fontSize: '0.78rem', color: 'var(--menu-accent)', fontWeight: 600 }}>
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

                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
