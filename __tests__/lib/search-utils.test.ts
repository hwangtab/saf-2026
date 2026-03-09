import { hasComposedTrailingConsonantQuery, matchesSearchText } from '@/lib/search-utils';

describe('search-utils', () => {
  describe('matchesSearchText', () => {
    it('명시적 자모 입력(오ㅇ)으로 오윤을 찾는다', () => {
      expect(matchesSearchText('오윤', '오ㅇ')).toBe(true);
    });

    it('IME 조합 입력(옹) 상태에서도 오윤을 찾는다', () => {
      expect(matchesSearchText('오윤', '옹')).toBe(true);
    });

    it('조합 입력 보정이 다른 초성에는 과도하게 확장되지 않는다', () => {
      expect(matchesSearchText('오하나', '옹')).toBe(false);
    });

    it('원래 완성 음절 검색도 유지된다', () => {
      expect(matchesSearchText('옹기', '옹')).toBe(true);
    });

    it('NFD 형태의 한글도 NFC 검색어와 매칭된다', () => {
      const nfdName = '천지수'.normalize('NFD');
      expect(matchesSearchText(nfdName, '천지수')).toBe(true);
    });

    it('NFD 검색어도 NFC 형태의 한글과 매칭된다', () => {
      const nfdQuery = '천지수'.normalize('NFD');
      expect(matchesSearchText('천지수', nfdQuery)).toBe(true);
    });
  });

  describe('hasComposedTrailingConsonantQuery', () => {
    it('종성 포함 완성 음절 쿼리를 감지한다', () => {
      expect(hasComposedTrailingConsonantQuery('옹')).toBe(true);
    });

    it('명시적 자모 입력은 감지 대상이 아니다', () => {
      expect(hasComposedTrailingConsonantQuery('오ㅇ')).toBe(false);
    });
  });
});
