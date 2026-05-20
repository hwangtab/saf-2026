/** SSR-safe localStorage wrapper with JSON serialize/deserialize and error fallback. */

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function storageGet<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function storageSet<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded or private browsing — silently fail
  }
}

export function storageRemove(key: string): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function sessionGet<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function sessionSet<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private browsing / quota — silently fail (GA dedupes by transaction_id)
  }
}
