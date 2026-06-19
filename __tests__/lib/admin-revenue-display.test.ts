import { getRevenueFocusScopeLabel } from '@/lib/admin/revenue-display';

describe('getRevenueFocusScopeLabel', () => {
  it('uses the evidence label for detail-focused revenue sections', () => {
    expect(
      getRevenueFocusScopeLabel({
        evidenceLabel: '2026년 5월 온라인 매출',
        periodLabel: '2026년',
        compareBaseLabel: '기준',
      })
    ).toBe('2026년 5월 온라인 매출');
  });

  it('falls back to the selected summary period when no evidence is active', () => {
    expect(
      getRevenueFocusScopeLabel({
        evidenceLabel: null,
        periodLabel: '2026년 5월',
        compareBaseLabel: '기준',
      })
    ).toBe('2026년 5월 기준');
  });
});
