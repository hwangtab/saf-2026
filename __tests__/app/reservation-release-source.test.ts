import fs from 'node:fs';
import path from 'node:path';

const releaseTargets = [
  'app/api/payments/toss/confirm/route.ts',
  'app/api/webhooks/toss/route.ts',
  'app/api/internal/expire-stale-orders/route.ts',
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
});
