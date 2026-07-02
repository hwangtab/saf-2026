/**
 * 무통장(수기 계좌이체) 주문 판정 — metadata.payment_provider === 'manual_bank_transfer'.
 *
 * 무통장 주문은 Toss 결제 기록이 없으므로(오프라인 입금) Toss 상태 조회·자동 보정 대상에서 제외해야 한다.
 * reconcile-payments와 expire-stale-orders 양쪽에서 공유.
 */
export function isManualBankTransferOrder(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).payment_provider === 'manual_bank_transfer';
}
