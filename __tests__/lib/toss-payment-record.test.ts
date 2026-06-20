import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';

const tossDonePayment: TossConfirmResponse = {
  paymentKey: 'pay-key',
  orderId: 'SAF-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '카드',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-06-20T12:00:00+09:00',
  requestedAt: '2026-06-20T11:59:00+09:00',
  card: {
    number: '123456******7890',
    approveNo: 'A12345',
    installmentPlanMonths: 0,
    isInterestFree: false,
    useCardPoint: false,
    cardType: '신용',
    ownerType: '개인',
    acquireStatus: 'READY',
  },
};

type PaymentRecordMockOptions = {
  existingPayment?: { id: string } | null;
  findError?: string;
  insertError?: string;
};

function makePaymentRecordClient(options: PaymentRecordMockOptions = {}) {
  let mode: 'find' | 'insert' = 'find';
  const client: {
    insertedPayment: Record<string, unknown> | null;
    from: jest.Mock;
  } = {
    insertedPayment: null,
    from: jest.fn((table: string) => {
      if (table !== 'payments') throw new Error(`unexpected table ${table}`);
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        insert: jest.fn((payload: Record<string, unknown>) => {
          mode = 'insert';
          client.insertedPayment = payload;
          return builder;
        }),
        maybeSingle: jest.fn(async () => {
          if (mode === 'find') {
            if (options.findError) {
              return { data: null, error: { message: options.findError } };
            }
            return { data: options.existingPayment ?? null, error: null };
          }

          if (options.insertError) {
            return { data: null, error: { message: options.insertError } };
          }
          return { data: { id: 'payment-1' }, error: null };
        }),
      };
      return builder;
    }),
  };
  return client;
}

describe('ensureTossPaymentRecord', () => {
  it('inserts a sanitized payment row when no payment exists', async () => {
    const supabase = makePaymentRecordClient({ existingPayment: null });

    const result = await ensureTossPaymentRecord({
      supabase,
      orderId: 'order-1',
      tossPayment: tossDonePayment,
      idempotencyKey: 'confirm-SAF-001',
    });

    expect(result).toEqual({ ok: true, paymentId: 'payment-1', created: true });
    expect(supabase.insertedPayment).toEqual(
      expect.objectContaining({
        order_id: 'order-1',
        payment_key: 'pay-key',
        toss_order_id: 'SAF-001',
        method: '카드',
        amount: 100000,
        currency: 'KRW',
        status: 'DONE',
        approved_at: '2026-06-20T12:00:00+09:00',
        idempotency_key: 'confirm-SAF-001',
      })
    );
    expect(supabase.insertedPayment?.confirm_response).toEqual(
      expect.not.objectContaining({
        card: expect.objectContaining({
          number: expect.any(String),
          approveNo: expect.any(String),
        }),
      })
    );
    expect(supabase.insertedPayment?.method_detail).toEqual(
      expect.not.objectContaining({ number: expect.any(String), approveNo: expect.any(String) })
    );
  });

  it('returns the existing payment without inserting another row', async () => {
    const supabase = makePaymentRecordClient({ existingPayment: { id: 'existing-payment' } });

    const result = await ensureTossPaymentRecord({
      supabase,
      orderId: 'order-1',
      tossPayment: tossDonePayment,
      idempotencyKey: 'confirm-SAF-001',
    });

    expect(result).toEqual({ ok: true, paymentId: 'existing-payment', created: false });
    expect(supabase.insertedPayment).toBeNull();
  });

  it('returns ok false when the payment row cannot be stored', async () => {
    const supabase = makePaymentRecordClient({
      existingPayment: null,
      insertError: 'db down',
    });

    await expect(
      ensureTossPaymentRecord({
        supabase,
        orderId: 'order-1',
        tossPayment: tossDonePayment,
        idempotencyKey: 'confirm-SAF-001',
      })
    ).resolves.toEqual({ ok: false, error: 'db down' });
  });
});
