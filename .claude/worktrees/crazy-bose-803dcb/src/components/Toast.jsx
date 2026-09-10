import { useEffect } from 'react';

// ─── Toast Notification ────────────────────────────────────────────────

const Toast = ({ msg, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="toast">
      <div className="toast-title">PHOSNAP</div>
      {msg}
    </div>
  );
};

export default Toast;
