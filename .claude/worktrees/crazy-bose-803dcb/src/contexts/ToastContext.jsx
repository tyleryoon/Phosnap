import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Toast Context ────────────────────────────────────────────────────────

export const ToastContext = createContext(null);

/**
 * Toast provider component
 * Manages a stack of toast notifications (max 3)
 * Auto-dismisses after 3 seconds
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now();
    const newToast = { message, type, id, isExiting: false };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Keep max 3 toasts; dismiss oldest if exceeded
      if (updated.length > 3) {
        return updated.slice(1);
      }
      return updated;
    });

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isExiting: true } : t
        )
      );
      // Remove from DOM after exit animation
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200); // Match exit animation duration
      return removeTimer;
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications
 * @returns {{ toast }} - toast(message, type) function
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return { toast: context.toast };
};

export default ToastProvider;
