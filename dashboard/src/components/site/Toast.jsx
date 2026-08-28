'use client';

import { createContext, useContext, useCallback, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return { toast: ctx.toast };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, removing: false }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-green-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-gold-400" />,
  };

  const borders = {
    success: 'border-green-500/40',
    error: 'border-red-500/40',
    info: 'border-gold-500/40',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.removing ? 'removing' : ''} flex items-center gap-3 rounded-xl border ${borders[t.type] || borders.info} bg-dark-900/95 backdrop-blur px-4 py-3 shadow-xl`}
          >
            {icons[t.type] || icons.info}
            <p className="text-sm text-white flex-1">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
