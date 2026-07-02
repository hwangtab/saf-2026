import Link from 'next/link';
import clsx from 'clsx';

import { requireAdmin } from '@/lib/auth/guards';
import { getNewsletters } from '@/app/actions/admin-newsletter';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { NewsletterCreateButton } from './_components/NewsletterListActions';

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scheduled: '예약됨',
  sending: '발송 중',
  sent: '발송 완료',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-canvas-strong text-charcoal-muted',
  scheduled: 'bg-primary-surface text-primary-strong',
  sending: 'bg-gray-100 text-charcoal-deep',
  sent: 'bg-success-tint text-success-a11y',
};

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default async function AdminNewsletterListPage() {
  await requireAdmin();
  const newsletters = await getNewsletters();

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>뉴스레터</AdminPageTitle>
        <AdminPageDescription>
          월간 뉴스레터를 블록으로 조립해 고객·작가에게 발송합니다. 발송 완료된 호는 공개 웹
          아카이브(/newsletter)에 게시됩니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <NewsletterCreateButton />

      {newsletters.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-charcoal-muted">
          아직 뉴스레터가 없습니다. 새 뉴스레터를 만들어 보세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs text-charcoal-muted">
              <tr>
                <th className="px-4 py-3 font-medium">호수</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">예약 시각</th>
                <th className="px-4 py-3 font-medium">발송 시각</th>
                <th className="px-4 py-3 font-medium">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newsletters.map((n) => (
                <tr key={n.id} className="hover:bg-canvas-soft">
                  <td className="px-4 py-3 font-medium text-charcoal-deep">제{n.issue_no}호</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/newsletter/${n.id}`}
                      className="font-medium text-primary-strong hover:underline"
                    >
                      {n.title || '(제목 없음)'}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-charcoal-soft">{n.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_STYLES[n.status] ?? STATUS_STYLES.draft
                      )}
                    >
                      {STATUS_LABELS[n.status] ?? n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    {formatDateTime(n.scheduled_at)}
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDateTime(n.sent_at)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDateTime(n.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
