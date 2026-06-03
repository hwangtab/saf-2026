import { parseEmailList } from '@/lib/email/parse-email-list';

describe('parseEmailList', () => {
  it('쉼표·줄바꿈·세미콜론으로 분리하고 정규화한다', () => {
    const r = parseEmailList('A@X.com, b@y.com\n c@z.com ; d@w.com');
    expect(r.valid.map((v) => v.email)).toEqual(['a@x.com', 'b@y.com', 'c@z.com', 'd@w.com']);
    expect(r.invalid).toEqual([]);
  });
  it('"이름 <메일>" 형식에서 이름과 주소를 분리한다', () => {
    const r = parseEmailList('홍길동 <Hong@x.com>');
    expect(r.valid).toEqual([{ email: 'hong@x.com', name: '홍길동' }]);
  });
  it('무효 주소는 invalid로 분리하고 유효는 통과시킨다 (전체 실패 금지)', () => {
    const r = parseEmailList('good@x.com, not-an-email, also@y.com');
    expect(r.valid.map((v) => v.email)).toEqual(['good@x.com', 'also@y.com']);
    expect(r.invalid).toEqual(['not-an-email']);
  });
  it('중복 이메일을 제거한다(첫 이름 유지)', () => {
    const r = parseEmailList('홍 <a@x.com>, a@x.com');
    expect(r.valid).toEqual([{ email: 'a@x.com', name: '홍' }]);
  });
  it('빈 입력은 빈 결과', () => {
    expect(parseEmailList('   ')).toEqual({ valid: [], invalid: [] });
  });
});
