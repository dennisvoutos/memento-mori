import { useState } from 'react';
import './Toast.css';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let addToastFn: ((message: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  addToastFn = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
