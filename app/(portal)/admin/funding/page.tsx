import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-base';

export const dynamic = 'force-dynamic';

export default async function AdminFundingListPage() {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: projects } = await db
    .from('funding_projects')
    .select('id, slug, title, goal_amount, status, end_at, created_at')
    .order('created_at', { ascending: false });
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal-deep">펀딩 프로젝트</h1>
        <Link href="/admin/funding/new" className={buttonVariants({ variant: 'primary' })}>
          새 프로젝트
        </Link>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-charcoal-muted">
            <th className="py-2">제목</th>
            <th>목표</th>
            <th>상태</th>
            <th>마감</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(projects ?? []).map((p) => (
            <tr key={p.id} className="border-b border-gallery-divider">
              <td className="py-3 font-medium text-charcoal">{p.title}</td>
              <td>{p.goal_amount.toLocaleString('ko-KR')}원</td>
              <td>{p.status}</td>
              <td>{p.end_at ? new Date(p.end_at).toLocaleDateString('ko-KR') : '-'}</td>
              <td>
                <Link href={`/admin/funding/${p.id}`} className="text-primary-strong">
                  관리
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
