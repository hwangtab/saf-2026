import type { BuyerEmailType } from '@/lib/notify';

/**
 * 관리자 이메일 로그에서 재발송 가능한 트랜잭션 이메일 유형.
 * getOrderNotificationInfo만으로 완전히 재구성 가능한(주문 데이터 기반) 유형만 허용 —
 * 계좌정보 필요(virtual_account/bank_transfer)·종료 주문(refunded/auto_cancelled)은 제외.
 *
 * ⚠️ 서버(resendEmailLog)와 클라이언트(EmailLogList 재발송 버튼)가 이 단일 출처를 공유해야
 * 버튼 노출과 서버 허용이 어긋나지 않는다. ('use server' 파일에는 상수 export가 불가하므로 여기 둔다.)
 */
export const RESENDABLE_EMAIL_TYPES = [
  'payment_confirmed',
  'deposit_confirmed',
  'shipped',
  'delivered',
] as const satisfies readonly BuyerEmailType[];

const RESENDABLE_SET: ReadonlySet<string> = new Set(RESENDABLE_EMAIL_TYPES);

export function isResendableEmailType(type: string): boolean {
  return RESENDABLE_SET.has(type);
}
