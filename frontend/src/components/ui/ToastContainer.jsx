import { useToastStore } from '../../store/toastStore';
import { CheckCircle, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const config = {
    success: { className: 'toast-success', Icon: CheckCircle },
    error: { className: 'toast-error', Icon: AlertCircle },
    warning: { className: 'toast-warning', Icon: AlertTriangle },
    info: { className: 'toast-info', Icon: Info }
  }[toast.type] || { className: 'toast-info', Icon: Info };

  const { Icon, className } = config;

  return (
    <div className={`toast-item ${className}`}>
      <Icon className="toast-icon" />
      <span className="toast-message">
        {toast.message}
      </span>
      <button onClick={onClose} className="toast-close" aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
}
