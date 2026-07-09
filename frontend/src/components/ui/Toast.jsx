import { useState, useEffect, createContext, useContext } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", duration = 5000) => {
    // Prevent toast flooding with identical messages
    setToasts((prev) => {
      const isDuplicate = prev.some((t) => t.message === message);
      if (isDuplicate) return prev;

      const id = Date.now();
      return [...prev, { id, message, type, duration }];
    });
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ message, type, duration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-pink-500" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
  };

  const colors = {
    success: "border-emerald-500/20 bg-emerald-500/5",
    error: "border-pink-500/20 bg-pink-500/5",
    info: "border-indigo-500/20 bg-indigo-500/5",
  };

  const glowColors = {
    success: "rgba(16,185,129,0.15)",
    error: "rgba(236,72,153,0.15)",
    info: "rgba(99,102,241,0.15)",
  };
  const borderColors = {
    success: "rgba(16,185,129,0.22)",
    error: "rgba(236,72,153,0.22)",
    info: "rgba(99,102,241,0.22)",
  };

  return (
    <div
      role="alert"
      aria-atomic="true"
      className="pointer-events-auto flex items-center gap-4 min-w-[320px] max-w-md p-4 rounded-2xl animate-fade-in-up transition-all"
      style={{
        background: `linear-gradient(160deg, rgba(10,10,18,0.82), rgba(5,5,12,0.9))`,
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        border: `1px solid ${borderColors[type]}`,
        boxShadow: `0 4px 16px ${glowColors[type]}, 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-grow text-sm font-bold text-white/90 leading-tight">
        {message}
      </p>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/8"
      >
        <X className="w-4 h-4 text-white/35" />
      </button>
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
