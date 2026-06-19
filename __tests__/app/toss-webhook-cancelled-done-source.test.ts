import fs from 'node:fs';
import path from 'node:path';

describe('Toss webhook cancelled-order DONE source contract', () => {
  const srcPath = path.join(process.cwd(), 'app/api/webhooks/toss/route.ts');

  it('schedules Toss cancel/refund instead of promoting an already-cancelled order on DONE webhooks', () => {
    const src = fs.readFileSync(srcPath, 'utf8');

    expect(src).toContain('handleDoneForAlreadyCancelledOrder');
    expect(src).toContain("existingOrder?.status === 'cancelled'");
    expect(src).toContain("existingOrder.status === 'cancelled'");
    expect(src).toContain('toss-webhook.cancelled-order-done-refund.notification');
  });
});
