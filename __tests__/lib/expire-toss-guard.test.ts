/**
 * promotePaidBeforeExpiry — 만료 취소 전 Toss DONE 가드 단위 테스트
 *
 * @jest-environment node
 */

import { promotePaidBeforeExpiry, type ExpiringOrder } from '@/lib/orders/expire-toss-guard';

jest.mock('@/lib/integrations/toss/confirm', () => ({ fetchPaymentByOrderId: jest.fn() }));
jest.mock('@/lib/integrations/toss/config', () => ({ resolveOrderProvider: () => 'domestic' }));
jest.mock('@/lib/commerce/payment-lifecycle/mark-order-paid', () => ({
  markOrderPaidWithOutcome: jest.fn(),
}));

const { fetchPaymentByOrderId } = require('@/lib/integrations/toss/confirm');
const { markOrderPaidWithOutcome } = require('@/lib/commerce/payment-lifecycle/mark-order-paid');

const supabase = {} as never;
const NOW = '2026-07-02T00:00:00.000Z';

function order(id: string, overrides: Partial<ExpiringOrder> = {}): ExpiringOrder {
  return {
    id,
    order_no: `ORD-${id}`,
    artwork_id: `art-${id}`,
    total_amount: 100000,
    metadata: {},
    ...overrides,
  } as ExpiringOrder;
}

beforeEach(() => jest.clearAllMocks());

it('Toss DONE 주문은 승격되고 취소 대상에서 제외된다', async () => {
  fetchPaymentByOrderId.mockResolvedValue({ status: 'DONE' });
  markOrderPaidWithOutcome.mockResolvedValue({ ok: true, salesLines: [], warnings: [] });

  const res = await promotePaidBeforeExpiry(supabase, [order('1')], 'pending_payment', NOW);

  expect(res.excludeIds.has('1')).toBe(true);
  expect(res.promoted).toBe(1);
  expect(res.needsManual).toEqual([]);
  expect(markOrderPaidWithOutcome).toHaveBeenCalledWith(
    expect.objectContaining({ sourceStatuses: ['pending_payment'] })
  );
});

it('미결제/대기(비-DONE) 주문은 제외되지 않아 정상 취소된다', async () => {
  fetchPaymentByOrderId.mockResolvedValue({ status: 'WAITING_FOR_DEPOSIT' });

  const res = await promotePaidBeforeExpiry(supabase, [order('2')], 'awaiting_deposit', NOW);

  expect(res.excludeIds.size).toBe(0);
  expect(res.promoted).toBe(0);
  expect(markOrderPaidWithOutcome).not.toHaveBeenCalled();
});

it('Toss 기록 없음(null)도 제외되지 않는다', async () => {
  fetchPaymentByOrderId.mockResolvedValue(null);

  const res = await promotePaidBeforeExpiry(supabase, [order('3')], 'pending_payment', NOW);

  expect(res.excludeIds.size).toBe(0);
  expect(res.promoted).toBe(0);
});

it('무통장(manual_bank_transfer) 주문은 Toss 조회 없이 취소 진행', async () => {
  const res = await promotePaidBeforeExpiry(
    supabase,
    [order('4', { metadata: { payment_provider: 'manual_bank_transfer' } })],
    'awaiting_deposit',
    NOW
  );

  expect(fetchPaymentByOrderId).not.toHaveBeenCalled();
  expect(res.excludeIds.size).toBe(0);
  expect(res.checked).toBe(0);
});

it('DONE인데 작품 소진(ARTWORK_TAKEN)이면 취소는 막고 수동확인으로 넘긴다', async () => {
  fetchPaymentByOrderId.mockResolvedValue({ status: 'DONE' });
  markOrderPaidWithOutcome.mockResolvedValue({ ok: false, code: 'ARTWORK_TAKEN', salesLines: [] });

  const res = await promotePaidBeforeExpiry(supabase, [order('5')], 'pending_payment', NOW);

  expect(res.excludeIds.has('5')).toBe(true); // 결제됐으므로 취소 금지
  expect(res.promoted).toBe(0);
  expect(res.needsManual).toHaveLength(1);
  expect(res.needsManual[0]).toContain('ARTWORK_TAKEN');
});

it('동시 웹훅 선승격(ORDER_STATE_MISMATCH)은 제외만 하고 수동확인 아님', async () => {
  fetchPaymentByOrderId.mockResolvedValue({ status: 'DONE' });
  markOrderPaidWithOutcome.mockResolvedValue({ ok: false, code: 'ORDER_STATE_MISMATCH' });

  const res = await promotePaidBeforeExpiry(supabase, [order('6')], 'pending_payment', NOW);

  expect(res.excludeIds.has('6')).toBe(true);
  expect(res.promoted).toBe(0);
  expect(res.needsManual).toEqual([]);
});

it('Toss 조회 에러 시 취소를 보류(제외)하되 수동확인 스팸은 만들지 않는다', async () => {
  fetchPaymentByOrderId.mockRejectedValue(new Error('network'));

  const res = await promotePaidBeforeExpiry(supabase, [order('7')], 'pending_payment', NOW);

  expect(res.excludeIds.has('7')).toBe(true);
  expect(res.needsManual).toEqual([]);
});
