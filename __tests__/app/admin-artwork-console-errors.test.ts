import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatDate } from '@/app/(portal)/admin/artworks/_utils';

// 관리자 작품 화면 콘솔 에러 회귀 방지 (2026-06-19)
// 1) React #418: formatDate가 timeZone 미고정이면 서버(UTC)/브라우저(KST) 텍스트가 달라짐
// 2) ERR_INVALID_URL: SafeImage fallback base64가 손상되면 깨진 data URL이 됨
describe('admin artwork console-error regressions', () => {
  it('formatDate renders in KST regardless of server timezone (hydration #418)', () => {
    // UTC 2026-06-18T20:00Z == KST 2026-06-19T05:00.
    // timeZone 미고정이면 서버 UTC에서 "18일"이 나와 hydration mismatch가 난다.
    const out = formatDate('2026-06-18T20:00:00.000Z', 'ko');
    expect(out).toContain('19');
    expect(out).not.toContain('18');
  });

  // React #418 2차: timeZone을 고정해도 hour/minute에 day-period(오전/오후·AM/PM)가
  // 붙으면 Node ICU는 일반 space(U+0020), 브라우저 ICU는 narrow no-break space(U+202F)를
  // day-period 앞에 넣어 서버/클라 텍스트가 보이지 않게 달라진다 → 여전히 #418.
  // day-period를 쓰지 않는 24시간 표기로 런타임 무관 결정적 출력을 보장한다.
  it('formatDate uses 24h format without day-period (no ICU-version-dependent separator)', () => {
    for (const locale of ['ko', 'en'] as const) {
      const out = formatDate('2026-06-19T05:34:00.000Z', locale);
      // day-period 마커가 없어야 한다.
      expect(out).not.toMatch(/오전|오후|AM|PM/i);
      // ICU 버전마다 갈리는 narrow no-break space가 없어야 한다.
      expect(out).not.toContain(' ');
      // 24시간 표기 14:34가 그대로 나와야 한다.
      expect(out).toContain('14:34');
    }
  });

  it('SafeImage transparent fallback is a decodable canonical PNG (ERR_INVALID_URL 방지)', () => {
    const src = readFileSync(join(process.cwd(), 'components/common/SafeImage.tsx'), 'utf8');
    const match = src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
    expect(match).not.toBeNull();

    const base64 = match ? match[1] : '';
    const buffer = Buffer.from(base64, 'base64');

    // PNG 시그니처 + 손상되지 않은 canonical base64여야 한다.
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buffer.toString('base64')).toBe(base64);
  });
});
