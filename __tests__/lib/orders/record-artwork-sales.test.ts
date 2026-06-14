/**
 * recordOrderArtworkSales 단위 테스트
 *
 * order_items 기준 artwork_sales 멱등 기록 헬퍼.
 *
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { recordOrderArtworkSales, type ArtworkSaleLine } from '@/lib/orders/record-artwork-sales';
import type { Database } from '@/types/supabase';

type MockResult = { data: unknown; error: unknown };

/**
 * artwork_sales 테이블만 다루는 체이너 mock.
 * - select(...).eq(...).is(...).limit(...).maybeSingle() → 멱등 체크 결과
 * - insert(rows) → insert mock 호출 + 결과
 */
function buildSupabaseMock(opts: { idempotencyResult?: MockResult; insertResult?: MockResult }): {
  supabase: SupabaseClient<Database>;
  insertMock: jest.Mock;
  maybeSingleMock: jest.Mock;
} {
  const idempotencyResult = opts.idempotencyResult ?? { data: null, error: null };
  const insertResult = opts.insertResult ?? { error: null, data: null };

  const maybeSingleMock = jest.fn(async () => idempotencyResult);
  const insertMock = jest.fn(async () => insertResult);

  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: maybeSingleMock,
  };

  const from = jest.fn(() => ({
    select: jest.fn(() => selectChain),
    insert: insertMock,
  }));

  return {
    supabase: { from } as unknown as SupabaseClient<Database>,
    insertMock,
    maybeSingleMock,
  };
}

const baseParams = {
  orderId: 'order-1',
  orderNo: 'SAF-20260614-0001',
  source: 'toss' as const,
  sourceDetail: 'toss_widget',
  buyerName: '구매자',
  buyerPhone: '010-0000-0000',
  soldAt: '2026-06-14T00:00:00.000Z',
};

describe('recordOrderArtworkSales', () => {
  it('빈 lineItems → no_line_items, INSERT 미호출', async () => {
    const { supabase, insertMock, maybeSingleMock } = buildSupabaseMock({});

    const result = await recordOrderArtworkSales(supabase, { ...baseParams, lineItems: [] });

    expect(result).toEqual({ inserted: false, reason: 'no_line_items' });
    expect(insertMock).not.toHaveBeenCalled();
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('이미 active 매출 존재 → already_recorded, INSERT 미호출', async () => {
    const { supabase, insertMock } = buildSupabaseMock({
      idempotencyResult: { data: { id: 'existing-sale' }, error: null },
    });

    const lineItems: ArtworkSaleLine[] = [{ artwork_id: 'a1', quantity: 1, unit_price: 100000 }];
    const result = await recordOrderArtworkSales(supabase, { ...baseParams, lineItems });

    expect(result).toEqual({ inserted: false, reason: 'already_recorded' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('lineItems 2건 정상 → 2행 INSERT, 각 행 sale_price === unit_price*quantity', async () => {
    const { supabase, insertMock } = buildSupabaseMock({});

    const lineItems: ArtworkSaleLine[] = [
      { artwork_id: 'a1', quantity: 2, unit_price: 100000 },
      { artwork_id: 'a2', quantity: 1, unit_price: 50000 },
    ];
    const result = await recordOrderArtworkSales(supabase, { ...baseParams, lineItems });

    expect(result).toEqual({ inserted: true, rows: 2 });
    expect(insertMock).toHaveBeenCalledTimes(1);

    const insertedRows = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({
      artwork_id: 'a1',
      quantity: 2,
      sale_price: 200000,
      source: 'toss',
      source_detail: 'toss_widget',
      order_id: 'order-1',
      external_order_id: 'SAF-20260614-0001',
      buyer_name: '구매자',
      buyer_phone: '010-0000-0000',
      sold_at: '2026-06-14T00:00:00.000Z',
    });
    expect(insertedRows[1]).toMatchObject({ artwork_id: 'a2', quantity: 1, sale_price: 50000 });
  });

  it('INSERT 에러 → error reason + 메시지', async () => {
    const { supabase } = buildSupabaseMock({
      insertResult: { error: { message: 'insert boom' }, data: null },
    });

    const lineItems: ArtworkSaleLine[] = [{ artwork_id: 'a1', quantity: 1, unit_price: 100000 }];
    const result = await recordOrderArtworkSales(supabase, { ...baseParams, lineItems });

    expect(result).toEqual({ inserted: false, reason: 'error', error: 'insert boom' });
  });
});
