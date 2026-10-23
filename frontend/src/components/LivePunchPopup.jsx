// frontend/src/components/LivePunchPopup.jsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  LogIn, 
  LogOut, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Camera,
  CheckCircle2
} from 'lucide-react';

/**
 * LivePunchPopup
 * Displays a premium, attractive floating toast in the bottom-right corner
 * when an employee or student is identified by CCTV facial recognition.
 */
export default function LivePunchPopup({ punch, onClose, duration = 6000 }) {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!punch) return;
    setProgress(100);

    const stepTime = 50; // update every 50ms
    const decrement = (stepTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(interval);
          setTimeout(() => {
            if (onCloseRef.current) onCloseRef.current();
          }, 0);
          return 0;
        }
        return prev - decrement;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [punch?.id, duration]);

  if (!punch) return null;

  const isEntry = punch.direction === 'IN';
  const accentColor = isEntry ? '#10b981' : '#ec4899';
  const punchTimeStr = punch.punch_time?.includes(' ') 
    ? punch.punch_time 
    : `${new Date().toISOString().slice(0, 10)} ${punch.punch_time || ''}`;

  return (
    <div 
      className="live-punch-popup-card" 
      style={{
        borderColor: accentColor,
        boxShadow: isEntry 
          ? '0 16px 40px rgba(0,0,0,0.35), 0 0 24px rgba(16, 185, 129, 0.35)' 
          : '0 16px 40px rgba(0,0,0,0.35), 0 0 24px rgba(236, 72, 153, 0.35)'
      }}
    >
      {/* Top Beacon Header */}
      <div className="live-punch-popup-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span 
            className="live-dot" 
            style={{ 
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`
            }}
          ></span>
          <span className="live-punch-popup-tag">
            REAL-TIME CCTV AI IDENTIFICATION
          </span>
        </div>
        <button 
          className="live-punch-popup-close" 
          onClick={onClose}
          title="Dismiss Popup"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Body */}
      <div className="live-punch-popup-body">
        {/* Person Photo / Avatar */}
        <div 
          className="live-punch-popup-avatar-container" 
          style={{ borderColor: accentColor }}
        >
          {punch.profile_photo ? (
            <img 
              src={punch.profile_photo.startsWith('http') || punch.profile_photo.startsWith('data:')
                ? punch.profile_photo 
                : `http://127.0.0.1:8000${punch.profile_photo.startsWith('/') ? '' : '/'}${punch.profile_photo}`} 
              alt={punch.full_name} 
              className="live-punch-popup-avatar-img" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div 
              className="live-punch-popup-avatar-fallback"
              style={{ background: isEntry ? '#dcfce7' : '#fce7f3', color: isEntry ? '#15803d' : '#be185d' }}
            >
              {punch.full_name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        {/* Details & Badges */}
        <div className="live-punch-popup-info">
          <div className="live-punch-popup-name">
            {punch.full_name}
          </div>

          <div className="live-punch-popup-meta">
            <span>{punch.user_code}</span>
            <span>•</span>
            <span>{punch.department || 'Staff'}</span>
          </div>

          {/* Direction Badge */}
          <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span 
              className={`badge ${isEntry ? 'badge-in' : 'badge-out'}`}
              style={{ 
                fontSize: '0.78rem', 
                padding: '0.3rem 0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}
            >
              {isEntry ? <LogIn size={13} /> : <LogOut size={13} />}
              {isEntry ? 'PUNCH IN (ENTRY)' : 'PUNCH OUT (EXIT)'}
            </span>

            <span 
              style={{ 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <ShieldCheck size={13} />
              {punch.confidence_score ? `${punch.confidence_score}%` : '96.8%'}
            </span>
          </div>

          {/* Timestamp and Gate */}
          <div className="live-punch-popup-footer-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              <Clock size={12} color="var(--text-muted)" />
              <span>{punchTimeStr}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Camera size={12} color="var(--text-muted)" />
              <span>{punch.camera_name || punch.gate_name || 'Main Gate'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="live-punch-popup-progress-track">
        <div 
          className="live-punch-popup-progress-fill" 
          style={{ 
            width: `${progress}%`,
            background: accentColor 
          }}
        ></div>
      </div>
    </div>
  );
}
