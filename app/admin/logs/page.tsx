import { requireAdmin } from '@/lib/auth/guards';
import { getAdminLogs } from '@/app/actions/admin-logs';
import { LogsList } from './logs-list';

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminLogsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = 50;

  const { logs, total } = await getAdminLogs(page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">활동 로그</h1>
        <p className="mt-2 text-sm text-slate-500">관리자 활동 기록을 확인합니다.</p>
      </div>
      <LogsList logs={logs} currentPage={page} totalPages={totalPages} total={total} />
    </div>
  );
}
