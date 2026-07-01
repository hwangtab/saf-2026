import fs from 'node:fs';
import path from 'node:path';

describe('Toss webhook cancelled-order DONE source contract', () => {
  const routeSrcPath = path.join(process.cwd(), 'app/api/webhooks/toss/route.ts');
  const helperSrcPath = path.join(
    process.cwd(),
    'lib/commerce/refund-cancel/cancelled-order-done.ts'
  );
  const depositCallbackDonePromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts'
  );
  const statusChangedDonePromotionSrcPath = path.join(
    process.cwd(),
    'lib/commerce/payment-lifecycle/status-changed-done-promotion.ts'
  );

  it('schedules Toss cancel/refund instead of promoting an already-cancelled order on DONE webhooks', () => {
    const routeSrc = fs.readFileSync(routeSrcPath, 'utf8');
    const helperSrc = fs.readFileSync(helperSrcPath, 'utf8');
    const depositCallbackDonePromotionSrc = fs.readFileSync(
      depositCallbackDonePromotionSrcPath,
      'utf8'
    );
    const statusChangedDonePromotionSrc = fs.readFileSync(
      statusChangedDonePromotionSrcPath,
      'utf8'
    );

    expect(routeSrc).not.toContain('function handleDoneForAlreadyCancelledOrder');
    expect(routeSrc).toContain('handleDepositCallbackDonePromotion({');
    expect(routeSrc).toContain('handleStatusChangedDonePromotion({');
    expect(depositCallbackDonePromotionSrc).toContain("order.status === 'cancelled'");
    expect(depositCallbackDonePromotionSrc).toContain('handleCancelledOrderDoneRefund({');
    expect(statusChangedDonePromotionSrc).toContain("order.status === 'cancelled'");
    expect(statusChangedDonePromotionSrc).toContain('handleCancelledOrderDoneRefund({');
    expect(helperSrc).toContain('toss-webhook.cancelled-order-done-refund.notification');
    expect(helperSrc).toContain('auto-refund-cancelled-');
  });
});
