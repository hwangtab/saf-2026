/**
 * 재시도 로직이 포함된 fetch wrapper
 *
 * 네트워크 에러나 서버 에러 발생 시 자동으로 재시도합니다.
 * 지수 백오프를 사용하여 서버 부하를 줄입니다.
 */

import { retry, type RetryOptions, isRetryableStatus, isNetworkError } from './retry';

export interface FetchWithRetryOptions extends RetryOptions {
  /** fetch 요청 옵션 */
  fetchOptions?: RequestInit;
  /** 타임아웃 ms (기본: 10000) */
  timeout?: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * 타임아웃이 적용된 fetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 재시도 로직이 포함된 fetch
 *
 * @example
 * ```ts
 * // 기본 사용
 * const data = await fetchWithRetry('/api/data');
 *
 * // 옵션 지정
 * const data = await fetchWithRetry('/api/data', {
 *   maxRetries: 5,
 *   timeout: 5000,
 *   fetchOptions: {
 *     method: 'POST',
 *     body: JSON.stringify({ key: 'value' }),
 *   },
 *   onRetry: (attempt, error) => {
 *     console.log(`Retry ${attempt}:`, error);
 *   },
 * });
 * ```
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const { fetchOptions = {}, timeout = 10000, ...retryOptions } = options;

  const result = await retry(
    async () => {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      if (!response.ok) {
        const error = new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          response
        );

        // 재시도 가능한 상태 코드인 경우 에러 throw
        if (isRetryableStatus(response.status)) {
          throw error;
        }

        // 재시도 불가능한 에러 (4xx 등)는 바로 throw
        throw error;
      }

      return response.json() as Promise<T>;
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      ...retryOptions,
      shouldRetry: (error) => {
        // 커스텀 shouldRetry가 있으면 사용
        if (retryOptions.shouldRetry) {
          return retryOptions.shouldRetry(error);
        }

        // 네트워크 에러 재시도
        if (isNetworkError(error)) {
          return true;
        }

        // FetchError인 경우 상태 코드로 판단
        if (error instanceof FetchError) {
          return isRetryableStatus(error.status);
        }

        return false;
      },
    }
  );

  return result;
}

/**
 * JSON POST 요청 with retry
 */
export async function postWithRetry<T = unknown, D = unknown>(
  url: string,
  data: D,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  return fetchWithRetry<T>(url, {
    ...options,
    fetchOptions: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.fetchOptions?.headers,
      },
      body: JSON.stringify(data),
      ...options.fetchOptions,
    },
  });
}

export default fetchWithRetry;
