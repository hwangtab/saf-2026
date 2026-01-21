'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { fetchWithRetry, type FetchWithRetryOptions, FetchError } from '@/lib/fetchWithRetry';
import { useToast } from '@/lib/hooks/useToast';

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

export interface UseFetchWithRetryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

export interface UseFetchWithRetryReturn<T> extends UseFetchWithRetryState<T> {
  execute: (overrideUrl?: string) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  reset: () => void;
}

/**
 * Toast 알림이 통합된 fetch with retry 훅
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

  const [state, setState] = useState<UseFetchWithRetryState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
    isRetrying: false,
    retryCount: 0,
  });

  const mountedRef = useRef(true);
  const executingRef = useRef(false);
  const retryToastIdRef = useRef<string | null>(null);

  const execute = useCallback(
    async (overrideUrl?: string): Promise<T | null> => {
      if (executingRef.current) return null;
      executingRef.current = true;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        retryCount: 0,
        isRetrying: false,
      }));

      try {
        const result = await fetchWithRetry<T>(overrideUrl || url, {
          ...fetchOptions,
          onRetry: (attempt, error, nextDelay) => {
            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                isRetrying: true,
                retryCount: attempt,
              }));

              // 재시도 Toast 표시
              if (showRetryToast && !retryToastIdRef.current) {
                retryToastIdRef.current = toast.warning(
                  `${retryMessage} (${attempt}/${fetchOptions.maxRetries || 3})`,
                  { duration: nextDelay + 1000 }
                );
              }
            }

            fetchOptions.onRetry?.(attempt, error, nextDelay);
          },
        });

        // 재시도 Toast 닫기
        if (retryToastIdRef.current) {
          toast.dismissToast(retryToastIdRef.current);
          retryToastIdRef.current = null;
        }

        if (mountedRef.current) {
          setState({
            data: result,
            error: null,
            isLoading: false,
            isRetrying: false,
            retryCount: 0,
          });

          if (successMessage) {
            toast.success(successMessage);
          }

          onSuccess?.(result);
        }

        return result;
      } catch (error) {
        // 재시도 Toast 닫기
        if (retryToastIdRef.current) {
          toast.dismissToast(retryToastIdRef.current);
          retryToastIdRef.current = null;
        }

        const err = error instanceof Error ? error : new Error(String(error));

        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: err,
            isLoading: false,
            isRetrying: false,
          }));

          if (showErrorToast) {
            const message =
              error instanceof FetchError ? `${errorMessage} (${error.status})` : errorMessage;
            toast.error(message);
          }

          onError?.(err);
        }

        return null;
      } finally {
        executingRef.current = false;
      }
    },
    [
      url,
      fetchOptions,
      showRetryToast,
      showErrorToast,
      successMessage,
      errorMessage,
      retryMessage,
      toast,
      onSuccess,
      onError,
    ]
  );

  const refetch = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, retryCount: 0 }));
    return execute();
  }, [execute]);

  const reset = useCallback(() => {
    if (retryToastIdRef.current) {
      toast.dismissToast(retryToastIdRef.current);
      retryToastIdRef.current = null;
    }
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    });
  }, [toast]);

  // Immediate execution
  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryToastIdRef.current) {
        toast.dismissToast(retryToastIdRef.current);
      }
    };
  }, [toast]);

  return {
    ...state,
    execute,
    refetch,
    reset,
  };
}

export default useFetchWithRetry;
