import { createPortal } from 'react-dom';
import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

// ─── Toast Container ──────────────────────────────────────────────────────

const ToastIcon = ({ type }) => {
  switch (type) {
    case 'success':
      return <span style={{ color: 'var(--gold)' }}>✓</span>;
    case 'error':
      return <span style={{ color: '#FF6B6B' }}>✕</span>;
    case 'info':
    default:
      return <span style={{ color: 'rgba(242,242,242,0.6)' }}>ℹ</span>;
  }
};

const getBorderColor = (type) => {
  switch (type) {
    case 'success':
      return 'var(--gold-border)';
    case 'error':
      return 'rgba(255, 107, 107, 0.3)';
    case 'info':
    default:
      return 'rgba(242, 242, 242, 0.1)';
  }
};

const Toast = ({ toast }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        zIndex: 300,
        opacity: toast.isExiting ? 0 : 1,
        transform: `translateX(-50%) translateY(${toast.isExiting ? '16px' : '0'})`,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: toast.isExiting ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg3)',
          border: `1px solid ${getBorderColor(toast.type)}`,
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          maxWidth: '360px',
          fontSize: '14px',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(8px)',
          lineHeight: '1.5',
          wordBreak: 'break-word',
        }}
      >
        <div style={{ fontSize: '16px', flexShrink: 0 }}>
          <ToastIcon type={toast.type} />
        </div>
        <div style={{ flex: 1 }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const context = useContext(ToastContext);

  if (!context) return null;

  const { toasts } = context;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 'var(--z-toast)' }}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
