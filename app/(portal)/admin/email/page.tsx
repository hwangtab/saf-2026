import { requireAdmin } from '@/lib/auth/guards';
import { getBroadcasts } from '@/app/actions/admin-broadcast';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { BroadcastForm } from './_components/BroadcastForm';
import { BroadcastHistory } from './_components/BroadcastHistory';

export default async function AdminEmailPage() {
  await requireAdmin();
  const broadcasts = await getBroadcasts();

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>이메일 발송</AdminPageTitle>
        <AdminPageDescription>
          채널별 단체 이메일을 작성하고 발송 이력을 관리합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <BroadcastForm />
      <section>
        <h2 className="mb-3 text-sm font-semibold text-charcoal-deep">발송 이력</h2>
        <BroadcastHistory broadcasts={broadcasts} />
      </section>
    </div>
  );
}
