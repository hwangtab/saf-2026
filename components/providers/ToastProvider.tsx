'use client';

import { createContext, useCallback, useState, useMemo } from 'react';
import { ToastContainer, type ToastData, type ToastType } from '@/components/ui/Toast';

type ToastOptions = {
  duration?: number;
};

export interface ToastContextValue {
  toasts: ToastData[];
  addToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

function generateToastId(): string {
  return `toast-${++toastCounter}-${Date.now()}`;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export default function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = generateToastId();
      const newToast: ToastData = {
        id,
        type,
        message,
        duration: options?.duration,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // 최대 토스트 개수 제한
        if (updated.length > maxToasts) {
          return updated.slice(0, maxToasts);
        }
        return updated;
      });

      return id;
    },
    [maxToasts]
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => addToast('success', message, options),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => addToast('error', message, options),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => addToast('warning', message, options),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => addToast('info', message, options),
    [addToast]
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      dismissToast,
      clearAllToasts,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, dismissToast, clearAllToasts, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
