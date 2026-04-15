'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/cn';

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
  const tA11y = useTranslations('a11y');
  const closeLabel = tA11y('close');
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      setIsDismissing(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration]);

  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (isDismissing) {
      onDismiss(id);
    }
  }, [isDismissing, id, onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleDismiss();
      }
    },
    [handleDismiss]
  );

  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Toast는 키보드 해제(Escape/Enter)가 가능한 인터랙티브 알림 */
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleAnimationEnd}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'min-w-[280px] max-w-[400px]',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        'transition-[transform,opacity,color,background-color] duration-200 ease-out',
        isDismissing ? 'animate-toast-out' : 'animate-toast-in',
        TOAST_STYLES[type]
      )}
      onClick={handleDismiss}
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
          handleDismiss();
        }}
        className="p-1 rounded hover:bg-white/20 transition-colors"
        aria-label={closeLabel}
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
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
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
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
