import { readFileSync } from 'node:fs';

describe('reconcile-payments missing payment row contract', () => {
  it('checks paid or awaiting_deposit orders missing a payment row', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain('missingPaymentOrders');
    expect(src).toContain(".in('status', ['paid', 'awaiting_deposit'])");
    expect(src).toContain('ensureTossPaymentRecord');
  });
});
