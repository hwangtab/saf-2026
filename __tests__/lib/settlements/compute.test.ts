import {
  soldAtToKstMonth,
  kstMonthRange,
  computeMonthlySettlements,
  type SaleRowLite,
  type PaidRow,
} from '@/lib/settlements/compute';

describe('soldAtToKstMonth', () => {
  it('UTC 시각을 KST 달로 변환한다 (월말 경계)', () => {
    // 2026-05-31T15:30:00Z = KST 2026-06-01 00:30 → 6월
    expect(soldAtToKstMonth('2026-05-31T15:30:00Z')).toBe('2026-06');
    // 2026-06-30T14:00:00Z = KST 2026-06-30 23:00 → 6월
    expect(soldAtToKstMonth('2026-06-30T14:00:00Z')).toBe('2026-06');
  });
});

describe('kstMonthRange', () => {
  it('KST 월 경계를 +09:00 offset ISO로 만든다', () => {
    const { startIso, endIso } = kstMonthRange('2026-06');
    expect(startIso).toBe('2026-06-01T00:00:00+09:00');
    expect(endIso).toBe('2026-07-01T00:00:00+09:00');
  });
  it('12월은 다음 해 1월로 넘어간다', () => {
    expect(kstMonthRange('2026-12').endIso).toBe('2027-01-01T00:00:00+09:00');
  });
});

describe('computeMonthlySettlements', () => {
  const sales: SaleRowLite[] = [
    {
      sale_price: 1000000,
      quantity: 1,
      sold_at: '2026-06-10T02:00:00Z',
      artist_id: 'a1',
      artist_name: '김작가',
    },
    {
      sale_price: 500000,
      quantity: 2,
      sold_at: '2026-06-20T02:00:00Z',
      artist_id: 'a1',
      artist_name: '김작가',
    },
    {
      sale_price: 300000,
      quantity: 1,
      sold_at: '2026-06-15T02:00:00Z',
      artist_id: null,
      artist_name: null,
    },
  ];

  it('작가별 gross 합계와 50% share를 계산한다', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06']);
    const a1 = result.rows.find((r) => r.artistId === 'a1')!;
    expect(a1.gross).toBe(2000000); // 1,000,000 + 500,000×2
    expect(a1.share).toBe(1000000);
    expect(a1.soldCount).toBe(3);
    expect(a1.status).toBe('pending');
    expect(a1.payable).toBe(true);
  });

  it('artist_id null은 작가 미지정 버킷으로, payable=false', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06']);
    const none = result.rows.find((r) => r.artistId === null)!;
    expect(none.artistName).toBe('작가 미지정');
    expect(none.payable).toBe(false);
    expect(none.gross).toBe(300000);
  });

  it('지급 완료 행이 있으면 status=paid + 스냅샷 값을 쓴다', () => {
    const paid: PaidRow[] = [
      {
        artist_id: 'a1',
        period_month: '2026-06-01',
        gross_amount: 1800000,
        artist_share: 900000,
        paid_amount: 850000,
        paid_at: '2026-07-10T00:00:00Z',
        note: '수수료 차감',
      },
    ];
    const result = computeMonthlySettlements(sales, paid, '2026-06', ['2026-06']);
    const a1 = result.rows.find((r) => r.artistId === 'a1')!;
    expect(a1.status).toBe('paid');
    expect(a1.gross).toBe(1800000); // 스냅샷 우선(실시간 2,000,000 아님)
    expect(a1.share).toBe(900000);
    expect(a1.paidAmount).toBe(850000);
    expect(a1.note).toBe('수수료 차감');
  });

  it('totals와 availableMonths를 채운다', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06', '2026-05']);
    expect(result.month).toBe('2026-06');
    expect(result.availableMonths).toEqual(['2026-06', '2026-05']);
    expect(result.totals.gross).toBe(2300000);
    expect(result.totals.artistCount).toBe(2);
    expect(result.totals.paidCount).toBe(0);
  });
});
