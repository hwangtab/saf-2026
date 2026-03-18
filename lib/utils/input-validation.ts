/**
 * Server action input validation utilities.
 * Defense-in-depth: validate user inputs before database insertion.
 */

export function validateTextLength(value: string, max: number, fieldName: string): string {
  const trimmed = value?.trim() || '';
  if (trimmed.length > max) {
    throw new Error(`${fieldName}은(는) ${max}자를 초과할 수 없습니다.`);
  }
  return trimmed;
}

export function validateUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('URL은 http 또는 https만 허용됩니다.');
    }
    return url.toString();
  } catch (error) {
    console.error('[input-validation] URL validation failed:', error);
    throw new Error('유효하지 않은 URL 형식입니다.');
  }
}

export function validateEmail(value: string | null): string | null {
  if (!value?.trim()) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    throw new Error('유효하지 않은 이메일 형식입니다.');
  }
  return value.trim();
}
