/**
 * 이벤트 결제 reconcile 결정 — 순수 함수 (서버/DB 의존성 없음, 단위 테스트 가능).
 *
 * 작품 reconcile-payments는 인라인 분기라 테스트가 어려웠던 점을 개선해, 분기 규칙을
 * 순수 함수로 분리한다. 크론 라우트는 이 결정을 따라 confirm RPC / cancelPayment를 호출한다.
 */

export type ReconcileAction = 'confirm' | 'refund' | 'skip';

/**
 * 등록 상태 + Toss 결제 상태 → 1차 행동.
 *
 * - Toss가 DONE이 아니면(미캡처/이미 환불=CANCELED 등) 건드리지 않음 → 자가 치유.
 * - `pending` + DONE: 좌석 확정 시도(confirm_event_registration). 매진이면 후속 환불.
 * - `expired` + DONE: confirm RPC는 pending만 처리(그 외 INVALID_STATE)하므로 곧장 환불.
 *   (`expired`는 이미 "확정 실패 + 환불 실패"로 판정된 캡처분 — 돈을 돌려줘야 함.)
 * - 그 외 상태(confirmed/cancelled/waitlist)는 무처리.
 */
export function planEventReconcile(status: string, tossStatus: string | null): ReconcileAction {
  if (tossStatus !== 'DONE') return 'skip';
  if (status === 'pending') return 'confirm';
  if (status === 'expired') return 'refund';
  return 'skip';
}

export type ConfirmOutcome = 'confirmed' | 'refund' | 'noop' | 'alert';

/**
 * confirm_event_registration RPC 반환 code → 후속 행동.
 * - CONFIRMED: 좌석 확정 완료 → 고객 확정 알림.
 * - ALREADY_CONFIRMED: 경합으로 confirm route가 먼저 처리 → 무처리(멱등).
 * - SOLD_OUT: 좌석 없음 → 환불.
 * - 그 외(NOT_FOUND/AMOUNT_MISMATCH/INVALID_STATE/undefined): 비정상 → 운영팀 알림(자동 처리 금지).
 */
export function interpretConfirmCode(code: string | undefined): ConfirmOutcome {
  switch (code) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'ALREADY_CONFIRMED':
      return 'noop';
    case 'SOLD_OUT':
      return 'refund';
    default:
      return 'alert';
  }
}
