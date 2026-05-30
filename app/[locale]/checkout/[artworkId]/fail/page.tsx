import type { Metadata } from 'next';
import FailClient from './FailClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * 결제 실패/취소 랜딩.
 *
 * `code`/`message`/`orderId`는 server `searchParams`로 받지 않는다 — Next.js 16의
 * 미들웨어 rewrite가 default-locale(`/checkout/...`) 경로의 query를 server component에
 * 전달하지 못하는 회귀 때문(path params는 보존됨). FailClient가 브라우저 URL의
 * `window.location.search`에서 직접 읽어 pending 주문을 정리하고 안내를 표시한다.
 */
export default function FailPage() {
  return <FailClient />;
}
