import { requireAdmin } from '@/lib/auth/guards';
import { getBroadcasts } from '@/app/actions/admin-broadcast';
import { getInboundMessages } from '@/app/actions/admin-email-inbound';
import { getEmailLogs } from '@/app/actions/admin-email-logs';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { BroadcastComposer } from './_components/BroadcastComposer';
import { BroadcastHistory } from './_components/BroadcastHistory';
import { InboundMessages } from './_components/InboundMessages';
import { EmailLogList } from './_components/EmailLogList';

export default async function AdminEmailPage() {
  await requireAdmin();
  const [broadcasts, inboundMessages, emailLogs] = await Promise.all([
    getBroadcasts(),
    getInboundMessages(),
    getEmailLogs({ status: 'failed' }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>이메일 발송</AdminPageTitle>
        <AdminPageDescription>
          받는 사람을 정하고 내용을 작성한 뒤, 오른쪽 요약에서 대상 수와 광고 여부를 확인하고
          발송합니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <BroadcastComposer />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">발송 이력</h2>
        <BroadcastHistory initial={broadcasts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">받은 회신</h2>
        <InboundMessages initial={inboundMessages} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">트랜잭션 이메일 로그</h2>
        <p className="text-xs text-gray-500">
          구매·작가 안내 이메일의 발송 결과입니다. 기본은 실패 건만 표시하며, 재발송 가능한 유형은
          바로 재발송할 수 있습니다.
        </p>
        <EmailLogList initial={emailLogs.logs} />
      </section>
    </div>
  );
}
