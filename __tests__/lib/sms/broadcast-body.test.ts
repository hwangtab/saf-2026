/** @jest-environment node */
import {
  personalizeSmsText,
  smsByteLength,
  smsSegment,
  isNightInKst,
  validateAdvertisementText,
  buildAdvertisementText,
  optOutNumber,
  AD_PREFIX,
} from '@/lib/sms/broadcast-body';

describe('personalizeSmsText', () => {
  it('{{name}}을 이름으로, 없으면 "회원"으로 치환', () => {
    expect(personalizeSmsText('{{name}}님 안녕하세요', '홍길동')).toBe('홍길동님 안녕하세요');
    expect(personalizeSmsText('{{name}}님 안녕하세요', null)).toBe('회원님 안녕하세요');
  });
});

describe('smsByteLength / smsSegment', () => {
  it('한글 2바이트·ASCII 1바이트', () => {
    expect(smsByteLength('ab')).toBe(2);
    expect(smsByteLength('가나')).toBe(4);
  });
  it('90바이트 이하 SMS, 초과 LMS', () => {
    expect(smsSegment('가'.repeat(45))).toBe('SMS'); // 90 bytes
    expect(smsSegment('가'.repeat(46))).toBe('LMS'); // 92 bytes
  });
});

describe('isNightInKst (광고 야간 차단 21:00–08:00)', () => {
  it('21:30 KST는 야간', () => {
    // 2026-06-10T12:30:00Z = 21:30 KST
    expect(isNightInKst(new Date('2026-06-10T12:30:00Z'))).toBe(true);
  });
  it('07:59 KST는 야간', () => {
    // 22:59Z = 07:59 KST(+9)
    expect(isNightInKst(new Date('2026-06-09T22:59:00Z'))).toBe(true);
  });
  it('08:00 KST는 허용', () => {
    // 23:00Z = 08:00 KST
    expect(isNightInKst(new Date('2026-06-09T23:00:00Z'))).toBe(false);
  });
  it('14:00 KST는 허용', () => {
    expect(isNightInKst(new Date('2026-06-10T05:00:00Z'))).toBe(false);
  });
  it('21:00 KST 정각은 야간(inclusive 시작)', () => {
    // 2026-06-10T12:00:00Z = 21:00 KST
    expect(isNightInKst(new Date('2026-06-10T12:00:00Z'))).toBe(true);
  });
});

describe('validateAdvertisementText', () => {
  it('정확히 (광고)로 시작 + 브랜드 + 무료수신거부 포함 시 ok', () => {
    const ok = '(광고)[씨앗페] 신작 안내\n무료수신거부 080-123-4567';
    expect(validateAdvertisementText(ok)).toEqual({ ok: true });
  });
  it('(광고) 누락 시 거부', () => {
    expect(validateAdvertisementText('[씨앗페] 신작\n무료수신거부 080-123-4567').ok).toBe(false);
  });
  it('변칙 표기 (광 고)/[광고] 거부', () => {
    expect(validateAdvertisementText('(광 고)[씨앗페] x\n무료수신거부 080-1').ok).toBe(false);
    expect(validateAdvertisementText('[광고][씨앗페] x\n무료수신거부 080-1').ok).toBe(false);
  });
  it('무료수신거부 누락 시 거부', () => {
    expect(validateAdvertisementText('(광고)[씨앗페] 신작').ok).toBe(false);
  });
});

describe('buildAdvertisementText (자동 보정)', () => {
  it('prefix·브랜드·무료거부를 자동 부착하고 검증 통과', () => {
    const out = buildAdvertisementText('신작이 도착했습니다', '080-123-4567');
    expect(out.startsWith(AD_PREFIX)).toBe(true);
    expect(out).toContain('[씨앗페]');
    expect(out).toContain('무료수신거부 080-123-4567');
    expect(validateAdvertisementText(out)).toEqual({ ok: true });
  });
  it('이미 (광고)가 있으면 중복 부착하지 않음', () => {
    const out = buildAdvertisementText('(광고)[씨앗페] 기존본문', '080-123-4567');
    expect(out.match(/\(광고\)/g)).toHaveLength(1);
  });
  it('수동 (광고) + 브랜드 없음 입력에도 (광고) 중복 부착 안 함', () => {
    const out = buildAdvertisementText('(광고) 브랜드 없는 본문', '080-123-4567');
    // (광고)가 정확히 1번만
    expect(out.match(/\(광고\)/g)?.length).toBe(1);
    expect(out.startsWith('(광고)')).toBe(true);
    expect(out).toContain('[씨앗페]');
  });
});

describe('optOutNumber (수신거부 번호)', () => {
  it('SMS_OPT_OUT_080 미설정 시 placeholder 080-000-0000 사용', () => {
    const prev = process.env.SMS_OPT_OUT_080;
    delete process.env.SMS_OPT_OUT_080;
    try {
      expect(optOutNumber()).toBe('080-000-0000');
    } finally {
      if (prev !== undefined) process.env.SMS_OPT_OUT_080 = prev;
    }
  });
});
