import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import OrderLookup from './OrderLookup';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
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
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { orderNo } = await searchParams;

  let initialOrderDetail: OrderPublicInfo | null = null;
  let initialBuyerEmail: string | null = null;

  // 로그인 사용자 + orderNo 있으면 직접 조회 (마이페이지 "주문 상세 보기" 링크 흐름)
  if (orderNo) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const result = await lookupOrderDetail(orderNo, user.email);
      if (result.success) {
        initialOrderDetail = result.order;
        initialBuyerEmail = user.email;
      }
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
