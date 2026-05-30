/**
 * 회귀 가드: 입금대기 주문의 자동취소 보류 기능.
 *
 * expire-stale-orders cron은 created_at + 24시간 지난 awaiting_deposit 주문을 자동 취소한다.
 * 관리자가 "취소 연장"으로 보류(deposit_auto_cancel_paused=true)한 주문은 cron이 만료 대상에서
 * 제외해야 한다. 누가 이 필터를 제거하면 보류가 조용히 무력화되어 — 사용자가 보호하려던 주문이
 * 그대로 자동취소된다(조용한 실패). 이 가드가 그 회귀를 잡는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('deposit auto-cancel pause', () => {
  it('expire-stale-orders cron excludes paused orders from auto-cancel', () => {
    const src = read('app/api/internal/expire-stale-orders/route.ts');
    // awaiting_deposit 만료 조회에 deposit_auto_cancel_paused=false 필터가 있어야 함
    expect(src).toMatch(/\.eq\(\s*['"]deposit_auto_cancel_paused['"]\s*,\s*false\s*\)/);
  });

  it('setDepositAutoCancelPaused action exists, is admin-guarded, and only toggles in awaiting_deposit', () => {
    const src = read('app/actions/admin-orders.ts');
    expect(src).toMatch(/export async function setDepositAutoCancelPaused/);
    // requireAdmin 가드 + awaiting_deposit 상태 제한
    expect(src).toMatch(/setDepositAutoCancelPaused[\s\S]*?requireAdmin\(\)/);
    expect(src).toMatch(/setDepositAutoCancelPaused[\s\S]*?awaiting_deposit/);
  });
});
