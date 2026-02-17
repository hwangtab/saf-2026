import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminExhibitorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    nextParams.set(key, trimmed);
  });
  nextParams.set('status', params.status || 'pending');
  nextParams.set('applicant', 'exhibitor');

  redirect(`/admin/users?${nextParams.toString()}`);
}
