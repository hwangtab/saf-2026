function toDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeKoreanDialCode(digits: string): string {
  if (digits.startsWith('0082')) {
    return `0${digits.slice(4)}`;
  }

  if (digits.startsWith('82')) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

/**
 * 전화번호를 숫자만 추출하고 +82 → 0 정규화하여 반환합니다.
 * 비교/검증용으로 사용합니다 (포맷팅 없음).
 */
export function normalizePhoneDigits(raw: string): string {
  const digits = toDigits(raw);
  return normalizeKoreanDialCode(digits);
}

/**
 * 전화번호를 유효성 검사하여 반환합니다.
 * null/빈 문자열이면 null, 패턴 불일치면 null을 반환합니다.
 */
export function validatePhone(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;
  return phonePattern.test(trimmed) ? trimmed : null;
}

/**
 * 한국 전화번호를 하이픈 포함 표준 형태로 정규화합니다.
 * 입력값이 비어 있거나 전화번호로 판단하기 어려우면 빈 문자열을 반환합니다.
 */
export function formatKoreanPhoneNumber(value: string | null | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const digits = normalizeKoreanDialCode(toDigits(trimmed));
  if (!digits) return '';

  if (digits.startsWith('02')) {
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return '';
  }

  if (digits.startsWith('0505') && digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return '';
}
