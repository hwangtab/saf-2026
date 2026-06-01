import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { getExhibitionPurchaseAnalytics } from '@/app/actions/admin-buyers';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { ExhibitionPurchaseAnalyticsView } from './buyer-list';

export const dynamic = 'force-dynamic';

export default async function AdminBuyersPage() {
  await requireAdmin();
  const analytics = await getExhibitionPurchaseAnalytics();

  return (
    <div className="space-y-6">
      <AdminPageHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-2">
          <AdminPageTitle>전시 구매 분석</AdminPageTitle>
          <AdminPageDescription>
            씨앗페2026 오프라인 전시 구매 흐름, 구매 경로, 배송 상태, 상위 구매자를 확인합니다.
          </AdminPageDescription>
        </div>
        <Link
          href="/admin/users?role=user"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-white px-4 text-sm font-medium text-charcoal-deep shadow-sm transition hover:bg-charcoal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
        >
          통합 고객 관리에서 보기
        </Link>
      </AdminPageHeader>

      <ExhibitionPurchaseAnalyticsView analytics={analytics} />
    </div>
  );
}
