import { requireAdmin } from '@/lib/auth/guards';
import { getTrashLogs } from '@/app/actions/admin-logs';
import { TrashList } from './trash-list';
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    target_type?: string;
    state?: string;
  }>;
};

export default async function AdminTrashPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = 30;

  const targetType =
    params.target_type === 'artwork' || params.target_type === 'artist'
      ? params.target_type
      : 'all';
  const state = params.state === 'active' || params.state === 'expired' ? params.state : 'all';

  const { logs, total } = await getTrashLogs({
    page,
    limit,
    q: params.q,
    targetType,
    state,
  });
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = [
    params.q,
    targetType !== 'all' ? targetType : '',
    state !== 'all' ? state : '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>휴지통</AdminPageTitle>
        <AdminPageDescription>
          삭제된 항목은 30일 동안 보관됩니다. 보관기간 만료 후 배치 작업에서 영구 삭제됩니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <AdminCard className="overflow-hidden">
        <form>
          <input type="hidden" name="page" value="1" />
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">검색/필터</h2>
              <p className="text-xs text-slate-500">
                대상 타입과 만료 상태로 휴지통 항목을 확인합니다.
              </p>
            </div>
            <AdminBadge className="bg-white text-slate-700 ring-slate-200">
              적용된 필터 {activeFilterCount}개
            </AdminBadge>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              검색어
              <AdminInput
                name="q"
                defaultValue={params.q || ''}
                placeholder="요약, 대상 ID, 행위자"
                className="h-10"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              대상 타입
              <AdminSelect name="target_type" defaultValue={targetType} className="h-10">
                <option value="all">전체</option>
                <option value="artwork">작품</option>
                <option value="artist">작가</option>
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              보관 상태
              <AdminSelect name="state" defaultValue={state} className="h-10">
                <option value="all">전체</option>
                <option value="active">보관 중</option>
                <option value="expired">만료됨</option>
              </AdminSelect>
            </label>
            <div className="flex items-center justify-end gap-2 md:col-span-2 xl:col-span-1">
              <a
                href="/admin/trash"
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                초기화
              </a>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                필터 적용
              </button>
            </div>
          </div>
        </form>
      </AdminCard>

      <TrashList logs={logs} currentPage={page} totalPages={totalPages} total={total} />
    </div>
  );
}
