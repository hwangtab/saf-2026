/**
 * i18n key consistency test
 *
 * Ensures ko.json and en.json have identical key structures.
 * Detects missing keys that would cause runtime errors in production.
 */

import koMessages from '@/messages/ko.json';
import enMessages from '@/messages/en.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n key consistency', () => {
  const koKeys = flattenKeys(koMessages);
  const enKeys = flattenKeys(enMessages);

  it('ko.json and en.json have the same number of keys', () => {
    expect(koKeys.length).toBe(enKeys.length);
  });

  it('no keys exist in ko.json but missing from en.json', () => {
    const missingInEn = koKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it('no keys exist in en.json but missing from ko.json', () => {
    const missingInKo = enKeys.filter((k) => !koKeys.includes(k));
    expect(missingInKo).toEqual([]);
  });

  it('no empty string values in ko.json', () => {
    const emptyKeys = koKeys.filter((key) => {
      const parts = key.split('.');
      let val: unknown = koMessages;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return val === '';
    });
    expect(emptyKeys).toEqual([]);
  });

  it('no unexpected empty string values in en.json', () => {
    // Keys intentionally empty in English (Korean grammar suffixes)
    const allowedEmpty = [
      'search.resultSuffix',
      'statistics.unitPeople',
      'artworkDetail.noShopSuffix',
    ];
    const emptyKeys = enKeys.filter((key) => {
      const parts = key.split('.');
      let val: unknown = enMessages;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return val === '' && !allowedEmpty.includes(key);
    });
    expect(emptyKeys).toEqual([]);
  });
});
