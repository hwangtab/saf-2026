'use client';

import { useCallback, useEffect, useRef } from 'react';
import { fetchWithRetry, type FetchWithRetryOptions, FetchError } from '@/lib/fetchWithRetry';
import { useToast } from '@/lib/hooks/useToast';
import { useRetry, type UseRetryReturn } from '@/lib/hooks/useRetry';

export interface UseFetchWithRetryOptions<T> extends FetchWithRetryOptions {
  /** 마운트 시 자동 실행 여부 */
  immediate?: boolean;
  /** 에러 발생 시 Toast 표시 여부 (기본: true) */
  showErrorToast?: boolean;
  /** 재시도 중 Toast 표시 여부 (기본: true) */
  showRetryToast?: boolean;
  /** 성공 시 Toast 메시지 (설정 시 표시) */
  successMessage?: string;
  /** 에러 Toast 메시지 */
  errorMessage?: string;
  /** 재시도 Toast 메시지 */
  retryMessage?: string;
  /** 성공 시 콜백 */
  onSuccess?: (data: T) => void;
  /** 에러 시 콜백 */
  onError?: (error: Error) => void;
}

export interface UseFetchWithRetryReturn<T> extends UseRetryReturn<T> {
  refetch: () => Promise<T | null>;
}

/**
 * Toast 알림이 통합된 fetch with retry 훅
 *
 * 내부적으로 useRetry를 활용하며, fetch 특화 기능과 Toast 알림을 추가합니다.
 *
 * @example
 * ```tsx
 * function DataComponent() {
 *   const { data, isLoading, error, refetch } = useFetchWithRetry<ApiResponse>(
 *     '/api/data',
 *     {
 *       immediate: true,
 *       showRetryToast: true,
 *       errorMessage: '데이터를 불러오는데 실패했습니다',
 *       onSuccess: (data) => console.log('Loaded:', data),
 *     }
 *   );
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <ErrorView onRetry={refetch} />;
 *   return <DataView data={data} />;
 * }
 * ```
 */
export function useFetchWithRetry<T = unknown>(
  url: string,
  options: UseFetchWithRetryOptions<T> = {}
): UseFetchWithRetryReturn<T> {
  const {
    immediate = false,
    showErrorToast = true,
    showRetryToast = true,
    successMessage,
    errorMessage = '요청에 실패했습니다',
    retryMessage = '연결을 재시도하고 있습니다...',
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const toast = useToast();
  const retryToastIdRef = useRef<string | null>(null);

  const fetchFn = useCallback(
    () =>
      fetchWithRetry<T>(url, {
        ...fetchOptions,
        onRetry: (attempt, error, nextDelay) => {
          // 재시도 Toast 표시
          if (showRetryToast && !retryToastIdRef.current) {
            retryToastIdRef.current = toast.warning(
              `${retryMessage} (${attempt}/${fetchOptions.maxRetries || 3})`,
              { duration: nextDelay + 1000 }
            );
          }
          fetchOptions.onRetry?.(attempt, error, nextDelay);
        },
      }),
    [url, fetchOptions, showRetryToast, retryMessage, toast]
  );

  const retryResult = useRetry<T>(fetchFn, { immediate });

  // Toast side-effects based on state changes
  const prevLoadingRef = useRef(retryResult.isLoading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = retryResult.isLoading;

    // Transition from loading to not loading = request finished
    if (wasLoading && !retryResult.isLoading) {
      // Dismiss retry toast
      if (retryToastIdRef.current) {
        toast.dismissToast(retryToastIdRef.current);
        retryToastIdRef.current = null;
      }

      if (retryResult.error) {
        // Error occurred
        if (showErrorToast) {
          const message =
            retryResult.error instanceof FetchError
              ? `${errorMessage} (${retryResult.error.status})`
              : errorMessage;
          toast.error(message);
        }
        onError?.(retryResult.error);
      } else if (retryResult.data !== null) {
        // Success
        if (successMessage) {
          toast.success(successMessage);
        }
        onSuccess?.(retryResult.data);
      }
    }
  }, [
    retryResult.isLoading,
    retryResult.error,
    retryResult.data,
    showErrorToast,
    errorMessage,
    successMessage,
    toast,
    onSuccess,
    onError,
  ]);

  // Cleanup retry toast on unmount
  useEffect(() => {
    return () => {
      if (retryToastIdRef.current) {
        toast.dismissToast(retryToastIdRef.current);
      }
    };
  }, [toast]);

  const refetch = useCallback(() => {
    return retryResult.retryNow();
  }, [retryResult]);

  return {
    ...retryResult,
    refetch,
  };
}

export default useFetchWithRetry;
