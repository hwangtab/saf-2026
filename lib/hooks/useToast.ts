'use client';

import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '@/components/providers/ToastProvider';

/**
 * Toast 알림을 표시하기 위한 훅
 *
 * @example
 * ```tsx
 * const toast = useToast();
 *
 * // 성공 메시지
 * toast.success('저장되었습니다');
 *
 * // 에러 메시지
 * toast.error('오류가 발생했습니다');
 *
 * // 경고 메시지
 * toast.warning('주의가 필요합니다');
 *
 * // 정보 메시지
 * toast.info('새로운 소식이 있습니다');
 *
 * // 커스텀 지속시간 (ms)
 * toast.success('완료!', { duration: 2000 });
 *
 * // 수동으로 토스트 닫기
 * const id = toast.info('처리 중...');
 * // ... 작업 완료 후
 * toast.dismissToast(id);
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export default useToast;
