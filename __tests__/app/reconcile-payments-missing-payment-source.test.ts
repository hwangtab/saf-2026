import { readFileSync } from 'node:fs';

describe('reconcile-payments missing payment row contract', () => {
  it('checks paid or awaiting_deposit orders missing a payment row', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain('missingPaymentOrders');
    expect(src).toContain(".in('status', ['paid', 'awaiting_deposit'])");
    expect(src).toContain('ensureTossPaymentRecord');
  });

  it('does not skip awaiting_deposit missing-payment orders after Toss has moved to DONE', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain("order.status === 'awaiting_deposit' && tossPayment.status === 'DONE'");
    expect(src).toContain('markOrderPaid({');
  });
});
