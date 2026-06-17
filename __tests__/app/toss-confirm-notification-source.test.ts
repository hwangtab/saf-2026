import fs from 'node:fs';
import path from 'node:path';

describe('toss confirm notification settlement', () => {
  const srcPath = path.join(process.cwd(), 'app/api/payments/toss/confirm/route.ts');
  const webhookSrcPath = path.join(process.cwd(), 'app/api/webhooks/toss/route.ts');

  it('settles payment-confirmed and virtual-account notification groups with labels', () => {
    const src = fs.readFileSync(srcPath, 'utf8');

    expect(src).toContain("runAllSettled('tossConfirm.paymentConfirmed.notifications'");
    expect(src).toContain("runAllSettled('tossConfirm.virtualAccountIssued.notifications'");
  });

  it('settles high-risk Toss webhook notification groups with labels', () => {
    const src = fs.readFileSync(webhookSrcPath, 'utf8');

    expect(src).toContain("runAllSettled('tossWebhook.depositPaid.notifications'");
    expect(src).toContain("runAllSettled('tossWebhook.statusChangedDone.notifications'");
    expect(src).toContain("runAllSettled('tossWebhook.canceled.notifications'");
  });
});
