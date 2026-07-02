export type SaleRowLite = {
  sale_price: number;
  quantity: number;
  sold_at: string;
  artist_id: string | null;
  artist_name: string | null;
};

export type PaidRow = {
  artist_id: string;
  period_month: string; // 'YYYY-MM-DD' (월 1일)
  gross_amount: number;
  artist_share: number;
  paid_amount: number | null;
  paid_at: string;
  note: string | null;
};

export type SettlementRow = {
  artistId: string | null;
  artistName: string;
  soldCount: number;
  gross: number;
  share: number;
  status: 'paid' | 'pending';
  paidAmount: number | null;
  paidAt: string | null;
  note: string | null;
  payable: boolean;
};

export type MonthlySettlements = {
  month: string;
  availableMonths: string[];
  rows: SettlementRow[];
  totals: { gross: number; share: number; paidCount: number; artistCount: number };
};

const UNASSIGNED = '작가 미지정';

/** timestamptz ISO를 KST(Asia/Seoul) 'YYYY-MM'으로. */
export function soldAtToKstMonth(iso: string): string {
  // en-CA + timeZone은 'YYYY-MM-DD' → 앞 7자리가 'YYYY-MM'
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return formatted.slice(0, 7);
}

/** 'YYYY-MM' → KST 월 경계(+09:00 offset ISO). Postgres timestamptz 비교용. */
export function kstMonthRange(month: string): { startIso: string; endIso: string } {
  const [y, m] = month.split('-').map(Number);
  const startIso = `${month}-01T00:00:00+09:00`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endIso = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00+09:00`;
  return { startIso, endIso };
}

export function roundShare(gross: number): number {
  return Math.round(gross * 0.5);
}

export function computeMonthlySettlements(
  sales: SaleRowLite[],
  paid: PaidRow[],
  month: string,
  availableMonths: string[]
): MonthlySettlements {
  // 지급 완료 행을 artist_id로 인덱싱(해당 월 것만 넘어온다고 가정 — 서버가 필터).
  const paidByArtist = new Map<string, PaidRow>();
  for (const p of paid) paidByArtist.set(p.artist_id, p);

  type Agg = { artistId: string | null; artistName: string; gross: number; soldCount: number };
  const map = new Map<string, Agg>();
  for (const s of sales) {
    const key = s.artist_id || `unassigned`;
    const name = s.artist_id ? s.artist_name || UNASSIGNED : UNASSIGNED;
    const existing = map.get(key);
    const amount = s.sale_price * s.quantity;
    if (existing) {
      existing.gross += amount;
      existing.soldCount += s.quantity;
    } else {
      map.set(key, {
        artistId: s.artist_id,
        artistName: name,
        gross: amount,
        soldCount: s.quantity,
      });
    }
  }

  const rows: SettlementRow[] = Array.from(map.values()).map((agg) => {
    const paidRow = agg.artistId ? paidByArtist.get(agg.artistId) : undefined;
    if (paidRow) {
      return {
        artistId: agg.artistId,
        artistName: agg.artistName,
        soldCount: agg.soldCount,
        gross: paidRow.gross_amount, // 스냅샷 우선
        share: paidRow.artist_share,
        status: 'paid',
        paidAmount: paidRow.paid_amount,
        paidAt: paidRow.paid_at,
        note: paidRow.note,
        payable: agg.artistId != null,
      };
    }
    return {
      artistId: agg.artistId,
      artistName: agg.artistName,
      soldCount: agg.soldCount,
      gross: agg.gross,
      share: roundShare(agg.gross),
      status: 'pending',
      paidAmount: null,
      paidAt: null,
      note: null,
      payable: agg.artistId != null,
    };
  });

  rows.sort((a, b) => b.gross - a.gross);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.gross;
      acc.share += r.share;
      if (r.status === 'paid') acc.paidCount += 1;
      return acc;
    },
    { gross: 0, share: 0, paidCount: 0, artistCount: rows.length }
  );

  return { month, availableMonths, rows, totals };
}
