import { requireAdmin } from '@/lib/auth/guards';
import { getSmsLogs } from '@/app/actions/admin-sms';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { SmsLogList } from './_components/SmsLogList';

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
  const initial = await getSmsLogs({
    type: params.type,
    status: params.status,
    from: params.from,
    to: params.to,
    q: params.q,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>문자/SMS 발송 로그</AdminPageTitle>
        <AdminPageDescription>
          구매자 트랜잭션 SMS 발송 내역을 조회하고, 실패한 건을 재발송합니다.
        </AdminPageDescription>
      </AdminPageHeader>

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
