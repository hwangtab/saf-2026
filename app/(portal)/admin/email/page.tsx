import { requireAdmin } from '@/lib/auth/guards';
import { getBroadcasts } from '@/app/actions/admin-broadcast';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { BroadcastComposer } from './_components/BroadcastComposer';
import { BroadcastHistory } from './_components/BroadcastHistory';

export default async function AdminEmailPage() {
  await requireAdmin();
  const broadcasts = await getBroadcasts();

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
    </div>
  );
}
