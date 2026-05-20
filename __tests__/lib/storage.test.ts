import { storageGet, storageSet, storageRemove, sessionGet, sessionSet } from '@/lib/storage';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.restoreAllMocks();
});

// ── localStorage wrappers ───────────────────────────────────────────────────

describe('storageGet / storageSet', () => {
  it('round-trips a primitive value', () => {
    storageSet('k', 42);
    expect(storageGet<number>('k')).toBe(42);
  });

  it('round-trips an object value', () => {
    storageSet('obj', { a: 1, b: 'two' });
    expect(storageGet<{ a: number; b: string }>('obj')).toEqual({ a: 1, b: 'two' });
  });

  it('round-trips boolean true (purchase-dedup contract)', () => {
    storageSet('flag', true);
    expect(storageGet<boolean>('flag')).toBe(true);
  });

  it('returns null for a missing key', () => {
    expect(storageGet('nonexistent')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    window.localStorage.setItem('bad', '{not json');
    expect(storageGet('bad')).toBeNull();
  });

  it('storageSet does not throw when setItem throws QuotaExceededError (Safari private contract)', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => storageSet('k', 'v')).not.toThrow();
  });

  it('storageGet returns null when getItem throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(storageGet('k')).toBeNull();
  });
});

describe('storageRemove', () => {
  it('removes an existing key', () => {
    storageSet('rm', 'value');
    storageRemove('rm');
    expect(storageGet('rm')).toBeNull();
  });

  it('does not throw when removing a non-existent key', () => {
    expect(() => storageRemove('ghost')).not.toThrow();
  });

  it('does not throw when removeItem throws', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => storageRemove('k')).not.toThrow();
  });
});

// ── sessionStorage wrappers ─────────────────────────────────────────────────

describe('sessionGet / sessionSet', () => {
  it('round-trips a primitive value', () => {
    sessionSet('k', 'hello');
    expect(sessionGet<string>('k')).toBe('hello');
  });

  it('round-trips boolean true (GA-dedup contract — purchase_fired / va_issued)', () => {
    sessionSet('purchase_fired_order-123', true);
    expect(sessionGet<boolean>('purchase_fired_order-123')).toBe(true);
  });

  it('returns null for a missing key', () => {
    expect(sessionGet('absent')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    window.sessionStorage.setItem('bad', '{not json');
    expect(sessionGet('bad')).toBeNull();
  });

  it('interprets legacy raw "1" as truthy (migration-safety: old guard value)', () => {
    // Before Phase 10 the raw value '1' was written by sessionStorage.setItem.
    // JSON.parse('1') === 1 (number, truthy) — the dedup guard must still suppress correctly.
    window.sessionStorage.setItem('legacy_key', '1');
    expect(sessionGet<unknown>('legacy_key')).toBe(1); // truthy, same dedup behaviour
  });

  it('sessionSet does not throw when setItem throws QuotaExceededError (Safari private contract)', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => sessionSet('k', true)).not.toThrow();
  });

  it('sessionGet returns null when getItem throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(sessionGet('k')).toBeNull();
  });
});
