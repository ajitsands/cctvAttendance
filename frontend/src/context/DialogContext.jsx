// frontend/src/context/DialogContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, confirmText, cancelText, isDanger, isAlert, icon, resolve }
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Custom Confirm Dialog (Promise-based)
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      const config = typeof options === 'string' 
        ? { message: options } 
        : (options || {});

      setDialog({
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure you want to proceed?',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        isDanger: config.isDanger ?? true,
        icon: config.icon || (config.isDanger ? 'trash' : 'alert'),
        isAlert: false,
        resolve: (val) => {
          setDialog(null);
          resolve(val);
        }
      });
    });
  }, []);

  // Custom Alert Dialog (Promise-based)
  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      const config = typeof options === 'string'
        ? { message: options }
        : (options || {});

      setDialog({
        title: config.title || 'Attention',
        message: config.message || '',
        confirmText: config.confirmText || 'OK',
        type: config.type || 'info',
        isDanger: config.type === 'error',
        isAlert: true,
        resolve: () => {
          setDialog(null);
          resolve();
        }
      });
    });
  }, []);

  // Toast Notification
  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastIdRef.current;
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur)
  };

  // Expose on window for convenience
  if (typeof window !== 'undefined') {
    window.$confirm = confirm;
    window.$alert = alert;
    window.$toast = toast;
  }

  const showConfirm = useCallback((titleOrOptions, message) => {
    if (typeof titleOrOptions === 'string') {
      return confirm({ title: titleOrOptions, message: message || '', isDanger: true });
    }
    return confirm(titleOrOptions);
  }, [confirm]);

  return (
    <DialogContext.Provider value={{ confirm, alert, toast, showConfirm, showToast }}>
      {children}

      {/* Modern Confirm / Alert Modal */}
      {dialog && (
        <div 
          onClick={() => dialog.resolve(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${dialog.isDanger ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
              borderRadius: '20px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: dialog.isDanger 
                ? '0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 35px rgba(239, 68, 68, 0.2)' 
                : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.15)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header / Accent Bar */}
            <div style={{
              padding: '20px 24px 16px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: dialog.isDanger 
                  ? 'rgba(239, 68, 68, 0.12)' 
                  : 'rgba(168, 85, 247, 0.12)',
                border: `1px solid ${dialog.isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {dialog.isDanger ? (
                  <Trash2 size={24} color="#ef4444" />
                ) : dialog.type === 'error' ? (
                  <AlertCircle size={24} color="#ef4444" />
                ) : dialog.type === 'warning' ? (
                  <AlertTriangle size={24} color="#f59e0b" />
                ) : (
                  <HelpCircle size={24} color="#9333ea" />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: '0 0 6px 0',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.01em'
                }}>
                  {dialog.title}
                </h3>
                <div style={{
                  fontSize: '0.88rem',
                  lineHeight: '1.45',
                  color: 'var(--text-muted)'
                }}>
                  {dialog.message}
                </div>
              </div>

              <button
                onClick={() => dialog.resolve(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions Footer */}
            <div style={{
              padding: '14px 24px 20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              {!dialog.isAlert && (
                <button
                  type="button"
                  onClick={() => dialog.resolve(false)}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => dialog.resolve(true)}
                className={dialog.isDanger ? 'btn btn-danger' : 'btn btn-primary'}
                style={{
                  padding: '8px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  boxShadow: dialog.isDanger ? '0 4px 12px rgba(239, 68, 68, 0.3)' : undefined
                }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            const isWarn = t.type === 'warning';
            const borderCol = isSuccess ? '#10b981' : isError ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6';

            return (
              <div
                key={t.id}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  background: 'var(--bg-card)',
                  border: `1px solid ${borderCol}`,
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  color: 'var(--text-main)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  minWidth: '280px',
                  maxWidth: '420px',
                  animation: 'slideInRight 0.25s ease-out'
                }}
              >
                {isSuccess && <CheckCircle2 size={18} color="#10b981" />}
                {isError && <AlertCircle size={18} color="#ef4444" />}
                {isWarn && <AlertTriangle size={18} color="#f59e0b" />}
                {!isSuccess && !isError && !isWarn && <Info size={18} color="#3b82f6" />}
                <span style={{ flex: 1 }}>{t.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      confirm: (opts) => Promise.resolve(window.confirm(typeof opts === 'string' ? opts : opts.message)),
      alert: (opts) => Promise.resolve(window.alert(typeof opts === 'string' ? opts : opts.message)),
      toast: {
        success: (msg) => console.log('[Toast Success]', msg),
        error: (msg) => console.error('[Toast Error]', msg),
        warning: (msg) => console.warn('[Toast Warning]', msg),
        info: (msg) => console.info('[Toast Info]', msg)
      }
    };
  }
  return context;
}
