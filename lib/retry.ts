/**
 * 네트워크 에러 재시도 유틸리티
 *
 * 지수 백오프(exponential backoff)를 사용하여 실패한 작업을 재시도합니다.
 * 네트워크 불안정 상황에서 복구력을 높여줍니다.
 */

export interface RetryOptions {
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number;
  /** 초기 대기 시간 ms (기본: 1000) */
  initialDelay?: number;
  /** 최대 대기 시간 ms (기본: 10000) */
  maxDelay?: number;
  /** 지수 백오프 배수 (기본: 2) */
  backoffMultiplier?: number;
  /** 재시도해야 하는 에러인지 판단하는 함수 */
  shouldRetry?: (error: unknown) => boolean;
  /** 재시도 전 호출되는 콜백 */
  onRetry?: (attempt: number, error: unknown, nextDelay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * 지수 백오프 지연 시간 계산
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  // 지터(jitter) 추가: ±10% 랜덤화로 thundering herd 방지
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Promise를 반환하는 함수를 재시도 로직으로 감싸기
 *
 * @example
 * ```ts
 * const data = await retry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { maxRetries: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt > opts.maxRetries;
      const shouldRetryError = opts.shouldRetry(error);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delay = calculateBackoffDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      opts.onRetry(attempt, error, delay);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 지정된 시간만큼 대기
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 네트워크 에러인지 판단
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return false; // 사용자가 취소한 경우 재시도하지 않음
  }

  // Response 객체의 네트워크 관련 상태 코드
  if (error instanceof Response) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // Error 객체의 메시지로 판단
  if (error instanceof Error) {
    const networkErrorMessages = [
      'network',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
    ];
    return networkErrorMessages.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  return false;
}

/**
 * 재시도 가능한 HTTP 상태 코드인지 판단
 */
export function isRetryableStatus(status: number): boolean {
  // 408: Request Timeout
  // 429: Too Many Requests
  // 500: Internal Server Error
  // 502: Bad Gateway
  // 503: Service Unavailable
  // 504: Gateway Timeout
  return [408, 429, 500, 502, 503, 504].includes(status);
}
