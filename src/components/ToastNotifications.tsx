'use client';

import { Toast } from '../types';

type ToastNotificationsProps = {
  toasts: Toast[];
  removeToast: (id: string) => void;
};

export default function ToastNotifications({ toasts, removeToast }: ToastNotificationsProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg flex items-center justify-between min-w-64 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          role="alert"
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-80"
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
