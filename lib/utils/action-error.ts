/**
 * Returns a safe error message for server actions.
 * In production, always returns the fallback to prevent leaking internal details.
 * In development, returns the actual error message for easier debugging.
 */
export function getActionErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : fallback;
  }
  return fallback;
}
