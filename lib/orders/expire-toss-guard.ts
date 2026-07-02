import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { fetchPaymentByOrderId } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { isManualBankTransferOrder } from '@/lib/orders/manual-bank-transfer';
import {
  markOrderPaidWithOutcome,
  type MarkOrderPaidOrder,
} from '@/lib/commerce/payment-lifecycle/mark-order-paid';

type AdminClient = SupabaseClient<Database>;

// 취소-시점 Toss 가드 경계: 회당 Toss 조회 상한과 동시성.
// 실측 만료 건수는 소수지만 버스트 대비 latency·무음 절단을 막는다.
const MAX_TOSS_CHECKS_PER_RUN = 60;
const TOSS_CHECK_CONCURRENCY = 5;

export type ExpiringOrder = MarkOrderPaidOrder & { order_no: string | null };

export type ExpiryTossGuardResult = {
  /** Toss가 DONE이라 취소하면 안 되는 주문 ID(이행 성공 + 이행 실패-수동확인 모두 포함). */
  excludeIds: Set<string>;
  /** markOrderPaid로 정상 이행(paid 승격)된 건수. */
  promoted: number;
  /** 정상 이행된 주문 ID — 호출측이 구매자 확인 알림을 보낼 대상. */
  promotedIds: string[];
  /** 결제됐으나 이행 실패(작품 소진 등) — 관리자 수동 확인(환불 등) 필요. */
  needsManual: string[];
  checked: number;
  skippedOverCap: number;
};

/**
 * 만료 대상 주문을 취소하기 전에 Toss 결제 상태를 확인해, 이미 DONE(고객 결제 완료)인 주문을
 * 취소 대신 이행(paid 승격)한다. reconcile-payments의 DONE 승격 경로를 그대로 재사용.
 *
 * 안전 원칙:
 * - Toss가 DONE이면 **어떤 경우에도 취소하지 않는다**(excludeIds). 이행 성공이면 승격, 이행이
 *   깨끗하게 끝나지 않으면(작품 소진 등) 취소만 막고 관리자 수동 확인으로 넘긴다.
 * - Toss 기록 없음/미결제/조회 실패는 기존대로 취소(fail-safe: 과잉 이행 없음).
 *   단 조회 "에러"는 취소를 보류(과잉 취소 방지) — 다음 실행에서 재확인되어 자가 치유.
 * - 무통장(manual_bank_transfer)은 Toss 기록이 없으므로 조회 자체를 건너뛴다.
 */
export async function promotePaidBeforeExpiry(
  supabase: AdminClient,
  orders: ExpiringOrder[],
  sourceStatus: 'pending_payment' | 'awaiting_deposit',
  now: string
): Promise<ExpiryTossGuardResult> {
  const excludeIds = new Set<string>();
  const needsManual: string[] = [];
  const promotedIds: string[] = [];
  let promoted = 0;

  const checkable = orders.filter((o) => !!o.order_no && !isManualBankTransferOrder(o.metadata));
  const capped = checkable.slice(0, MAX_TOSS_CHECKS_PER_RUN);
  const skippedOverCap = checkable.length - capped.length;

  for (let i = 0; i < capped.length; i += TOSS_CHECK_CONCURRENCY) {
    const chunk = capped.slice(i, i + TOSS_CHECK_CONCURRENCY);
    await Promise.all(
      chunk.map(async (order) => {
        const orderNo = order.order_no as string;
        try {
          const provider = resolveOrderProvider(order.metadata);
          const tossPayment = await fetchPaymentByOrderId(orderNo, provider);
          if (!tossPayment || tossPayment.status !== 'DONE') return; // 미결제/대기 → 취소 진행

          // Toss DONE 확정 — 이 순간부터 절대 취소하지 않는다.
          excludeIds.add(order.id);

          const outcome = await markOrderPaidWithOutcome({
            supabase,
            order,
            tossPayment,
            provider,
            now,
            sourceStatuses: [sourceStatus],
            idempotencyKey: `expire-guard-${orderNo}`,
            errors: [],
          });

          if (outcome.ok) {
            promoted++;
            promotedIds.push(order.id);
            console.error(
              `[expire-stale-orders] PROMOTED: ${orderNo} — Toss DONE, ${sourceStatus} → paid (취소 대신 이행)`
            );
            return;
          }
          if (outcome.code === 'ORDER_STATE_MISMATCH') {
            // 동시 웹훅이 먼저 승격 — 이미 paid. 취소 제외로 충분(정상).
            return;
          }
          // 결제됐으나 이행이 깨끗하게 끝나지 않음(작품 소진·기록 실패 등) → 수동 확인 필요.
          needsManual.push(`${orderNo}: ${outcome.code}`);
        } catch (err) {
          // Toss 조회 실패 → 취소를 보류(과잉취소 방지). 다음 실행에서 재확인되어 자가 치유되며,
          // 조회 장애 중 알림 스팸을 피하려 needsManual에는 넣지 않고 경고 로그만 남긴다.
          excludeIds.add(order.id);
          console.warn(
            `[expire-stale-orders] Toss 조회 실패로 취소 보류: ${orderNo} — ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      })
    );
  }

  return { excludeIds, promoted, promotedIds, needsManual, checked: capped.length, skippedOverCap };
}
