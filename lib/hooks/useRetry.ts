'use client';

import { useState, useCallback, useRef } from 'react';
import { retry, type RetryOptions, isNetworkError } from '@/lib/retry';

export interface UseRetryState<T> {
  /** 현재 데이터 */
  data: T | null;
  /** 에러 객체 */
  error: Error | null;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 재시도 중 여부 */
  isRetrying: boolean;
  /** 현재 재시도 횟수 */
  retryCount: number;
}

export interface UseRetryReturn<T> extends UseRetryState<T> {
  /** 작업 실행 함수 */
  execute: () => Promise<T | null>;
  /** 수동 재시도 함수 */
  retryNow: () => Promise<T | null>;
  /** 상태 초기화 */
  reset: () => void;
}

export interface UseRetryOptions extends RetryOptions {
  /** 마운트 시 자동 실행 여부 */
  immediate?: boolean;
}

/**
 * 재시도 로직이 포함된 비동기 작업 실행 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, error, isLoading, isRetrying, retryCount, execute, retryNow } = useRetry(
 *     async () => {
 *       const res = await fetch('/api/data');
 *       if (!res.ok) throw new Error('Failed to fetch');
 *       return res.json();
 *     },
 *     {
 *       maxRetries: 3,
 *       immediate: true,
 *       onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
 *     }
 *   );
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error onRetry={retryNow} />;
 *   return <DataView data={data} />;
 * }
 * ```
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> {
  const { immediate = false, ...retryOptions } = options;

  const [state, setState] = useState<UseRetryState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
    isRetrying: false,
    retryCount: 0,
  });

  const mountedRef = useRef(true);
  const executingRef = useRef(false);

  const execute = useCallback(async (): Promise<T | null> => {
    if (executingRef.current) return null;
    executingRef.current = true;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: 0,
    }));

    try {
      const result = await retry(fn, {
        ...retryOptions,
        shouldRetry: retryOptions.shouldRetry ?? isNetworkError,
        onRetry: (attempt, error, nextDelay) => {
          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              isRetrying: true,
              retryCount: attempt,
            }));
          }
          retryOptions.onRetry?.(attempt, error, nextDelay);
        },
      });

      if (mountedRef.current) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isRetrying: false,
          retryCount: 0,
        });
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isRetrying: false,
        }));
      }
      return null;
    } finally {
      executingRef.current = false;
    }
  }, [fn, retryOptions]);

  const retryNow = useCallback(async (): Promise<T | null> => {
    setState((prev) => ({ ...prev, error: null, retryCount: 0 }));
    return execute();
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  // Cleanup on unmount
  // Note: immediate execution is handled by the component using useEffect
  // to avoid React 18 strict mode double-execution issues

  return {
    ...state,
    execute,
    retryNow,
    reset,
  };
}

export default useRetry;
