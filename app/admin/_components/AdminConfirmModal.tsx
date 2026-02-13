'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'danger',
  isLoading = false,
  children,
}: AdminConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full',
              variant === 'danger' && 'bg-rose-50 text-rose-600',
              variant === 'warning' && 'bg-amber-50 text-amber-600',
              variant === 'info' && 'bg-blue-50 text-blue-600'
            )}
          >
            {variant === 'danger' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {variant === 'warning' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {variant === 'info' && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>

        {children}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="white" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'primary' : 'primary'} // Button doesn't have danger variant, will use primary
            className={cn(
              variant === 'danger' && 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
            )}
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
