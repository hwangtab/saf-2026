import { splitAndPersonalize } from '@/lib/email/broadcast-body';

describe('splitAndPersonalize', () => {
  it('빈 줄 기준으로 문단을 나눈다', () => {
    expect(splitAndPersonalize('첫 문단\n\n둘째 문단', '홍길동')).toEqual(['첫 문단', '둘째 문단']);
  });

  it('{{name}} 토큰을 수신자 이름으로 치환한다', () => {
    expect(splitAndPersonalize('{{name}}님 안녕하세요', '홍길동')).toEqual(['홍길동님 안녕하세요']);
  });

  it('이름이 null이면 "회원"으로 치환한다', () => {
    expect(splitAndPersonalize('{{name}}님께', null)).toEqual(['회원님께']);
  });

  it('공백 포함 {{ name }}도 치환하고 3줄 이상 공백도 1문단 경계로 처리한다', () => {
    expect(splitAndPersonalize('A\n\n\n{{ name }}', '김')).toEqual(['A', '김']);
  });

  it('빈 문단을 제거한다', () => {
    expect(splitAndPersonalize('A\n\n   \n\nB', '김')).toEqual(['A', 'B']);
  });
});
