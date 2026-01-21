'use client';

import { useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-charcoal',
  info: 'bg-primary text-white',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-white/20',
  error: 'bg-white/20',
  warning: 'bg-charcoal/10',
  info: 'bg-white/20',
};

function Toast({ toast, onDismiss }: ToastProps) {
  const { id, type, message, duration = 4000 } = toast;

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onDismiss(id);
      }
    },
    [id, onDismiss]
  );

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="alert"
      aria-live="polite"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'min-w-[280px] max-w-[400px]',
        'cursor-pointer select-none',
        'focus:outline-none focus:ring-2 focus:ring-white/50',
        TOAST_STYLES[type]
      )}
      onClick={() => onDismiss(id)}
    >
      <span
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold',
          ICON_STYLES[type]
        )}
        aria-hidden="true"
      >
        {TOAST_ICONS[type]}
      </span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="p-1 rounded hover:bg-white/20 transition-colors"
        aria-label="닫기"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </m.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Toast;
