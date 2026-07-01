import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, bar: 'bg-red-500', iconColor: 'text-red-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const api = useRef({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => {
          const { icon: Icon, bar, iconColor } = STYLES[t.type];
          return (
            <div
              key={t.id}
              className="relative bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex items-start gap-2.5 pl-3 pr-8 py-3 animate-fadeIn"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
              <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
              <span className="text-sm text-slate-700 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute top-2.5 right-2.5 text-slate-300 hover:text-slate-600 cursor-pointer"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
