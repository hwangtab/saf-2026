/**
 * PR-1 i18n sentinel 회귀 가드
 *
 * DB sentinel 값('문의', '확인 중')은 storage에서 ko 문자열 그대로 유지하고,
 * 표시 레이어에서만 locale별 라벨로 변환한다. (CLAUDE.md artwork-sentinel 규약)
 *
 * 이 테스트는 변환 체인의 양 끝을 고정한다:
 *   ko sentinel → ko.json 값이 sentinel 원문과 일치
 *   ko sentinel → en.json 값이 올바른 영문 라벨
 *
 * 변환 로직 자체는 ArtworkCard·ArtworkCategoryGrid 등 여러 컴포넌트에 분산돼 있으므로
 * 메시지 키 값을 고정하는 것이 가장 회귀에 강한 방어선이다.
 *
 * P4-2 canonical 네임스페이스 회귀 가드 (exhibitor.formCommon/listCommon, near-dup 표기 통일)
 */

import koMessages from '@/messages/ko.json';
import enMessages from '@/messages/en.json';

const ko = koMessages.artworkCard as Record<string, string>;
const en = enMessages.artworkCard as Record<string, string>;

describe('artworkCard sentinel i18n 매핑', () => {
  it('ko pendingValue는 DB sentinel "확인 중"과 일치', () => {
    expect(ko.pendingValue).toBe('확인 중');
  });

  it('ko inquiryValue는 DB sentinel "문의"와 일치', () => {
    expect(ko.inquiryValue).toBe('문의');
  });

  it('en pendingValue는 "Pending"', () => {
    expect(en.pendingValue).toBe('Pending');
  });

  it('en inquiryValue는 "Inquiry"', () => {
    expect(en.inquiryValue).toBe('Inquiry');
  });

  it('ko soldBadge 존재 + 비어 있지 않음', () => {
    expect(typeof ko.soldBadge).toBe('string');
    expect(ko.soldBadge.length).toBeGreaterThan(0);
  });

  it('en soldBadge 존재 + 비어 있지 않음', () => {
    expect(typeof en.soldBadge).toBe('string');
    expect(en.soldBadge.length).toBeGreaterThan(0);
  });
});

describe('P4-2 canonical 네임스페이스 회귀 가드', () => {
  const koExhibitor = koMessages.exhibitor as Record<string, Record<string, string>>;
  const enExhibitor = enMessages.exhibitor as Record<string, Record<string, string>>;

  it('exhibitor.formCommon.save — 공백 없는 "저장"', () => {
    expect(koExhibitor.formCommon.save).toBe('저장');
    expect(enExhibitor.formCommon.save).toBe('Save');
  });

  it('exhibitor.formCommon.saving 존재', () => {
    expect(koExhibitor.formCommon.saving).toBe('저장 중...');
    expect(enExhibitor.formCommon.saving).toBe('Saving...');
  });

  it('exhibitor.listCommon.delete 존재', () => {
    expect(koExhibitor.listCommon.delete).toBe('삭제');
    expect(enExhibitor.listCommon.delete).toBe('Delete');
  });

  it('exhibitor.listCommon.edit 존재', () => {
    expect(koExhibitor.listCommon.edit).toBe('편집');
    expect(enExhibitor.listCommon.edit).toBe('Edit');
  });

  it('filters.sold — 공백 없는 "판매완료"', () => {
    expect((koMessages.filters as Record<string, string>).sold).toBe('판매완료');
  });

  it('orderLookup.statusPaid — 공백 없는 "결제완료"', () => {
    expect((koMessages.orderLookup as Record<string, string>).statusPaid).toBe('결제완료');
  });

  it('checkout.orderNo — 공백 없는 "주문번호"', () => {
    expect((koMessages.checkout as Record<string, string>).orderNo).toBe('주문번호');
  });

  it('ko/en 키 대칭 — 총 키 수 동일', () => {
    function countKeys(obj: Record<string, unknown>): number {
      let c = 0;
      for (const v of Object.values(obj)) {
        if (typeof v === 'string') c++;
        else if (typeof v === 'object' && v !== null) c += countKeys(v as Record<string, unknown>);
      }
      return c;
    }
    expect(countKeys(koMessages as unknown as Record<string, unknown>)).toBe(
      countKeys(enMessages as unknown as Record<string, unknown>)
    );
  });
});
