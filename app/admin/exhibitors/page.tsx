import { Suspense } from 'react';
import { getExhibitors } from '@/app/actions/admin-exhibitors';
import { ExhibitorList } from './exhibitor-list';

export const dynamic = 'force-dynamic';

export default async function AdminExhibitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: 'active' | 'pending' | 'suspended' }>;
}) {
  const params = await searchParams;
  const exhibitors = await getExhibitors({
    query: params.q,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">출품자 관리</h1>
          <p className="mt-2 text-sm text-gray-700">출품자 신청 승인 및 상태를 관리합니다.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">{/* Action buttons if needed */}</div>
      </div>

      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        <Suspense fallback={<div>Loading...</div>}>
          <ExhibitorList initialExhibitors={exhibitors} />
        </Suspense>
      </div>
    </div>
  );
}
