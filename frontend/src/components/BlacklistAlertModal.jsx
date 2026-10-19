// frontend/src/components/BlacklistAlertModal.jsx
import React, { useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Camera, MapPin, Clock, X, ExternalLink, CheckCircle } from 'lucide-react';

export default function BlacklistAlertModal({ alert, onClose, onViewBreaches }) {
  const audioContextRef = useRef(null);

  // Synthesize security alarm tone using Web Audio API
  useEffect(() => {
    if (!alert) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Play 3 high-low siren beeps
        const playBeep = (freq, time, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + time);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + duration);
        };

        playBeep(880, 0, 0.25);
        playBeep(440, 0.25, 0.25);
        playBeep(880, 0.5, 0.25);
        playBeep(440, 0.75, 0.25);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }

    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [alert]);

  if (!alert) return null;

  const threatColor = alert.threat_level === 'Critical' ? '#ef4444' : '#f59e0b';

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '560px', 
          width: '100%', 
          borderRadius: 'var(--radius-lg)', 
          border: '2px solid #ef4444', 
          boxShadow: '0 0 50px rgba(239, 68, 68, 0.5), 0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          animation: 'pulse-border 1.5s infinite'
        }}
      >
        {/* Urgent Alert Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)', 
          color: '#ffffff', 
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: '50%', 
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
                CRITICAL FACILITY SECURITY ALERT
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Blacklisted Individual Spotted!
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(0, 0, 0, 0.25)', 
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          {/* Photos Comparison: Registered vs CCTV Snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Registered Blacklist Photo
              </div>
              <div style={{ width: '100%', height: '150px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {alert.reference_photo ? (
                  <img src={alert.reference_photo} alt={alert.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Photo Available</div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Live CCTV Camera Capture
              </div>
              <div style={{ width: '100%', height: '150px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {alert.snapshot_path ? (
                  <img src={alert.snapshot_path} alt="CCTV Snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: '#ffffff', fontSize: '0.85rem' }}>Live Crop Captured</div>
                )}
              </div>
            </div>
          </div>

          {/* Individual Details */}
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-muted)', marginBottom: '1.25rem', borderLeft: `4px solid ${threatColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {alert.full_name}
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Security ID: {alert.person_code}
                </div>
              </div>
              <span className="badge" style={{ background: threatColor, color: '#ffffff', fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>
                {alert.threat_level || 'HIGH'} THREAT
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <strong>Reason:</strong> {alert.reason || 'Restricted entry / Blacklisted individual'}
            </div>

            {alert.handling_notes && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>Handling Instructions:</strong> {alert.handling_notes}
              </div>
            )}
          </div>

          {/* Location & Time Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
              <MapPin size={16} color="var(--menu-accent)" />
              <span><strong>Gate:</strong> {alert.gate_name || 'Main Gate'} ({alert.direction || 'IN'})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
              <Camera size={16} color="var(--menu-accent)" />
              <span><strong>Camera:</strong> {alert.camera_name || 'Camera 1'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', gridColumn: 'span 2' }}>
              <Clock size={16} color="var(--menu-accent)" />
              <span><strong>Detection Time:</strong> {alert.detected_at || new Date().toLocaleString()} (Confidence: {alert.confidence_score}%)</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                if (onViewBreaches) onViewBreaches();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <ExternalLink size={16} />
              Open Security Log
            </button>
            <button 
              className="btn btn-danger"
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
            >
              <CheckCircle size={16} />
              Acknowledge & Dispatch Security
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
