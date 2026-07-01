import fs from 'node:fs';
import path from 'node:path';

const releaseTargets = [
  'lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts',
  'lib/orders/status-transition.ts',
  'lib/commerce/refund-cancel/mark-order-refunded.ts',
  'lib/commerce/refund-cancel/cancel-awaiting-order.ts',
  'lib/commerce/refund-cancel/auto-refund-taken.ts',
  'lib/commerce/refund-cancel/toss-canceled-cascade.ts',
  'app/api/internal/reconcile-payments/route.ts',
  'app/api/internal/expire-stale-orders/route.ts',
];

const thinCallers = [
  'app/api/payments/toss/confirm/route.ts',
  'app/api/webhooks/toss/route.ts',
  'app/actions/admin-orders.ts',
  'app/actions/order-lookup.ts',
];

describe('reserved artwork release source contract', () => {
  it('routes cancellation/refund reservation release through releaseReservedArtworksIfUnowned', () => {
    for (const relativePath of releaseTargets) {
      const src = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

      expect(src).toContain('releaseReservedArtworksIfUnowned');
      expect(src).not.toContain(".update({ status: 'available'");
    }
  });

  it('keeps Toss confirm virtual-account reservation release inside the payment-lifecycle helper', () => {
    const routeSrc = fs.readFileSync(
      path.join(process.cwd(), 'app/api/payments/toss/confirm/route.ts'),
      'utf8'
    );

    expect(routeSrc).toContain('promoteTossConfirmVirtualAccount');
    expect(routeSrc).not.toContain('reserveUniqueArtworksOrRollback');
    expect(routeSrc).not.toContain('releaseReservedArtworksIfUnowned');
  });

  it('keeps thin route/action callers from manually marking reservations available', () => {
    for (const relativePath of thinCallers) {
      const src = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

      expect(src).not.toContain(".update({ status: 'available'");
    }
  });
});
