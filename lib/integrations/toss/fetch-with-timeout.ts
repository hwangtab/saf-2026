const DEFAULT_TIMEOUT_MS = 10_000; // 10초

/**
 * fetch() with AbortController-based timeout.
 * Prevents TossPayments API calls from hanging indefinitely.
 */
export function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
