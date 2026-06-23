/** @jest-environment node */
import { POST } from '@/app/api/payments/funding/toss/confirm/route';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
jest.mock('@/lib/integrations/toss/confirm', () => ({ confirmPayment: jest.fn() }));
jest.mock('@/lib/integrations/toss/cancel', () => ({ cancelPayment: jest.fn() }));
jest.mock('@/lib/notify', () => ({ notifyEmail: jest.fn() }));
jest.mock('@/lib/server/after-response', () => ({ runAllSettled: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// 테스트 환경에는 request scope가 없어 after()가 throw하므로, 콜백을 즉시 실행해 무력화
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: (cb: unknown) => (typeof cb === 'function' ? (cb as () => unknown)() : cb),
}));

const { createSupabaseAdminClient } = require('@/lib/auth/server');
const { confirmPayment } = require('@/lib/integrations/toss/confirm');

function req(body: unknown) {
  return new Request('http://t/confirm', { method: 'POST', body: JSON.stringify(body) }) as any;
}

beforeEach(() => jest.clearAllMocks());

it('rejects when pledge not found', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: { message: 'x' } }) }) }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 30000 }));
  expect(res.status).toBe(404);
});

it('returns alreadyPaid when pledge already paid', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: { id: 'p1', total_amount: 30000, status: 'paid', order_no: 'FND-1' },
            error: null,
          }),
        }),
      }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 30000 }));
  const json = await res.json();
  expect(json.alreadyPaid).toBe(true);
});

it('rejects amount mismatch with 400', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: { id: 'p1', total_amount: 30000, status: 'pending_payment', order_no: 'FND-1' },
            error: null,
          }),
        }),
      }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 999 }));
  expect(res.status).toBe(400);
});
