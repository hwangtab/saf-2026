import { readFileSync } from 'node:fs';

describe('reconcile-payments missing-payment backfill mode', () => {
  it('keeps the cron window unchanged for normal scheduled runs', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain('28 * 60 * 1000');
    expect(src).toContain('5 * 60 * 1000');
  });

  it('adds an explicit bounded backfill mode for old paid/awaiting_deposit rows missing payments', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain("scope === 'missing-payments-backfill'");
    expect(src).toContain('parseBackfillLookbackDays');
    expect(src).toContain('parseBackfillLimit');
    expect(src).toContain('.limit(backfillLimit)');
    expect(src).toContain('idempotencyKey: `backfill-missing-payment-${order.order_no}`');
  });
});
