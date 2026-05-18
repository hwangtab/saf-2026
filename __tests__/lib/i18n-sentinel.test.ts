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
