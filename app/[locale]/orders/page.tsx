import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import OrderLookup from './OrderLookup';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'orderLookup' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 로그인 회원 감지 · 주문번호(?orderNo=) 자동조회 · 마이페이지 리다이렉트는
  // OrderLookup(클라이언트)이 브라우저 세션 + window.location.search로 전담한다.
  // 서버 SSR 단계에서 처리하지 않는 이유(2026-05 검증):
  //   1) 이 페이지는 [locale]/layout.tsx의 force-static을 상속해 정적 생성됨 →
  //      빌드 타임에 auth 세션이 없어 로그인 회원도 게스트 폼을 보게 됨.
  //   2) force-dynamic으로 바꿔도 미들웨어(next-intl) rewrite가 ?orderNo= 쿼리를
  //      서버 searchParams에서 떨궈(ko·en 모두 확인됨) 자동조회가 불가능.
  // → 정적 셸만 렌더하고, 진실의 원천(브라우저 URL·세션)을 직접 읽는 클라이언트가 처리.
  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center px-4 pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="w-full max-w-lg">
        <OrderLookup />
      </div>
    </div>
  );
}
