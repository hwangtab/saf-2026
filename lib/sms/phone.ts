/**
 * 한국 휴대폰 번호를 발송용 정규형(01012345678)으로 변환한다.
 * 한국 010 휴대폰이 아니면 null — 호출지는 null이면 SMS를 스킵한다(국제 SMS 비용 방지).
 */
export function normalizeKoreanMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');

  // +82 / 82 국가코드 → 0
  if (digits.startsWith('82')) {
    digits = '0' + digits.slice(2);
  }

  if (/^010\d{8}$/.test(digits)) return digits;
  return null;
}
