import fs from 'node:fs';
import path from 'node:path';

describe('toss confirm notification settlement', () => {
  const confirmSuccessNotificationsSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts'
  );
  const confirmPaidPromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.ts'
  );
  const confirmVirtualAccountPromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts'
  );
  const canceledCascadeSrcPath = path.join(
    process.cwd(),
    'lib/commerce/refund-cancel/toss-canceled-cascade.ts'
  );
  const depositCallbackDonePromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts'
  );
  const statusChangedDonePromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/status-changed-done-promotion.ts'
  );

  it('settles payment-confirmed and virtual-account notification groups with labels', () => {
    const src = fs.readFileSync(confirmSuccessNotificationsSrcPath, 'utf8');

    expect(src).toContain("runAllSettled('tossConfirm.paymentConfirmed.notifications'");
    expect(src).toContain("runAllSettled('tossConfirm.virtualAccountIssued.notifications'");
  });

  it('settles virtual-account reservation and race-cancel groups with labels', () => {
    const src = fs.readFileSync(confirmVirtualAccountPromotionSrcPath, 'utf8');

    expect(src).toContain(
      "runAllSettled('toss-confirm.virtual-account-reservation-failed.notifications'"
    );
    expect(src).toContain("runAllSettled('toss-confirm.virtual-account-race-cancel.notification'");
    expect(src).toContain("runAllSettled('tossConfirm.orderStatusSyncFailed.notifications'");
  });

  it('settles paid-promotion mismatch and cancelled-order refund groups with labels', () => {
    const src = fs.readFileSync(confirmPaidPromotionSrcPath, 'utf8');

    expect(src).toContain("runAllSettled('toss-confirm.cancelled-order-refund.notification'");
    expect(src).toContain("runAllSettled('tossConfirm.orderStatusSyncFailed.notifications'");
  });

  it('settles high-risk Toss webhook notification groups with labels', () => {
    const canceledCascadeSrc = fs.readFileSync(canceledCascadeSrcPath, 'utf8');
    const depositCallbackDonePromotionSrc = fs.readFileSync(
      depositCallbackDonePromotionSrcPath,
      'utf8'
    );
    const statusChangedDonePromotionSrc = fs.readFileSync(
      statusChangedDonePromotionSrcPath,
      'utf8'
    );

    expect(depositCallbackDonePromotionSrc).toContain(
      "runAllSettled('tossWebhook.depositPaid.notifications'"
    );
    expect(statusChangedDonePromotionSrc).toContain(
      "runAllSettled('tossWebhook.statusChangedDone.notifications'"
    );
    expect(canceledCascadeSrc).toContain("runAllSettled('tossWebhook.canceled.notifications'");
  });
});
