import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import OrderLookup from './OrderLookup';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { redirect } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { lookupOrderDetail } from '@/app/actions/order-lookup';
import type { OrderPublicInfo } from '@/app/actions/order-lookup';

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

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { locale } = await params;
  const { orderNo } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 사용자가 주문번호 없이 진입 → 마이페이지 주문 탭으로 (기본 활성 탭 = orders)
  if (user && !orderNo) {
    redirect({ href: '/mypage', locale });
  }

  let initialOrderDetail: OrderPublicInfo | null = null;
  let initialBuyerEmail: string | null = null;

  if (orderNo && user) {
    const result = await lookupOrderDetail(orderNo, user.email ?? '');
    if (result.success) {
      initialOrderDetail = result.order;
      initialBuyerEmail = user.email ?? null;
    }
  }

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center px-4 pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="w-full max-w-lg">
        <OrderLookup
          initialOrderDetail={initialOrderDetail}
          initialBuyerEmail={initialBuyerEmail}
        />
      </div>
    </div>
  );
}
