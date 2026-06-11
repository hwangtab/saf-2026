import { requireAdmin } from '@/lib/auth/guards';
import { getSmsLogs, getSmsSuppressionCount } from '@/app/actions/admin-sms';
import { getSmsBroadcasts } from '@/app/actions/admin-sms-broadcast';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { SmsLogList } from './_components/SmsLogList';
import { SmsBroadcastComposer } from './_components/SmsBroadcastComposer';
import { SmsBroadcastHistory } from './_components/SmsBroadcastHistory';
import { SmsSuppressionManager } from './_components/SmsSuppressionManager';

type Props = {
  searchParams: Promise<{
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
};

export default async function AdminSmsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const [initial, broadcasts, suppressionCount] = await Promise.all([
    getSmsLogs({
      type: params.type,
      status: params.status,
      from: params.from,
      to: params.to,
      q: params.q,
    }),
    getSmsBroadcasts(),
    getSmsSuppressionCount(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>문자/SMS 발송</AdminPageTitle>
        <AdminPageDescription>
          단체 문자를 작성·발송하고, 단체 발송 이력과 트랜잭션 발송 로그를 조회합니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">단체 문자 발송</h2>
        <SmsBroadcastComposer />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">단체 발송 이력</h2>
        <SmsBroadcastHistory initial={broadcasts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">수신거부 관리</h2>
        <SmsSuppressionManager initialCount={suppressionCount} />
      </section>

      <SmsLogList
        initial={initial}
        initialFilters={{
          type: params.type ?? '',
          status: params.status ?? '',
          from: params.from ?? '',
          to: params.to ?? '',
          q: params.q ?? '',
        }}
      />
    </div>
  );
}
