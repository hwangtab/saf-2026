import { validateArtworkData, validateSaleInput } from '@/lib/actions/artwork-validation';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

describe('validateArtworkData — edition_limit validation', () => {
  const base = { title: '작품명', price: '₩1,000,000', edition_type: 'limited' };

  it('returns error when edition_limit is missing for limited edition', () => {
    const fd = makeFormData({ ...base, edition_limit: '' });
    const result = validateArtworkData(fd);
    expect(result.error).toMatch(/수량을 입력/);
  });

  it('returns error for zero', () => {
    const fd = makeFormData({ ...base, edition_limit: '0' });
    const result = validateArtworkData(fd);
    expect(result.error).toMatch(/정수여야/);
  });

  it('returns error for negative number', () => {
    const fd = makeFormData({ ...base, edition_limit: '-1' });
    const result = validateArtworkData(fd);
    expect(result.error).toMatch(/정수여야/);
  });

  it('returns error for decimal (1.5)', () => {
    const fd = makeFormData({ ...base, edition_limit: '1.5' });
    const result = validateArtworkData(fd);
    expect(result.error).toMatch(/정수여야/);
  });

  it('returns error when edition_limit exceeds 10,000', () => {
    const fd = makeFormData({ ...base, edition_limit: '10001' });
    const result = validateArtworkData(fd);
    expect(result.error).toMatch(/10,000/);
  });

  it('passes for valid positive integer within range', () => {
    const fd = makeFormData({ ...base, edition_limit: '50' });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('passes for boundary value 10000', () => {
    const fd = makeFormData({ ...base, edition_limit: '10000' });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('passes for unique edition without edition_limit', () => {
    const fd = makeFormData({ title: '작품명', price: '₩1,000,000', edition_type: 'unique' });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('returns error for non-numeric edition_limit (abc)', () => {
    const fd = makeFormData({ ...base, edition_limit: 'abc' });
    const result = validateArtworkData(fd);
    expect(result.error).toBeTruthy();
  });

  it('passes for boundary minimum value 1', () => {
    const fd = makeFormData({ ...base, edition_limit: '1' });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('passes for unique edition with edition_limit provided (validator ignores it)', () => {
    const fd = makeFormData({
      title: '작품명',
      price: '₩1,000,000',
      edition_type: 'unique',
      edition_limit: '50',
    });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('passes for open edition with edition_limit provided (validator ignores it)', () => {
    const fd = makeFormData({
      title: '작품명',
      price: '₩1,000,000',
      edition_type: 'open',
      edition_limit: '50',
    });
    const result = validateArtworkData(fd);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });
});

describe('validateSaleInput — sale price and quantity validation', () => {
  it('returns error for negative price', () => {
    expect(validateSaleInput('-5000', '1')).toBeTruthy();
  });

  it('returns error for decimal price', () => {
    expect(validateSaleInput('99.5', '1')).toBeTruthy();
  });

  it('returns error for NaN price', () => {
    expect(validateSaleInput('abc', '1')).toBeTruthy();
  });

  it('returns null for 0 price (무상 양도)', () => {
    expect(validateSaleInput('0', '1')).toBeNull();
  });

  it('returns null for valid price and quantity', () => {
    expect(validateSaleInput('5000000', '1')).toBeNull();
  });

  it('returns error for 0 quantity', () => {
    expect(validateSaleInput('1000', '0')).toBeTruthy();
  });

  it('returns error for decimal quantity', () => {
    expect(validateSaleInput('1000', '1.5')).toBeTruthy();
  });

  it('returns null for valid price and quantity > 1', () => {
    expect(validateSaleInput('1000', '3')).toBeNull();
  });
});
