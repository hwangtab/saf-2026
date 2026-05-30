import type { Metadata } from 'next';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * 결제 완료 랜딩.
 *
 * 결제 파라미터(paymentKey/orderId/amount/method/currency)는 server `searchParams`로
 * 받지 않는다 — Next.js 16의 미들웨어 rewrite가 default-locale(`/checkout/...`) 경로의
 * query를 server component에 전달하지 못하는 회귀가 있기 때문(path params는 보존됨).
 * 대신 SuccessClient가 브라우저 URL의 `window.location.search`에서 직접 읽어 Toss confirm을
 * 호출한다. 검증·피싱 방지는 confirm API와 verifyBankTransferLanding server action이 담당.
 */
export default function SuccessPage() {
  return <SuccessClient />;
}
