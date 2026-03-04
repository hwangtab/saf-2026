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
    if (key === 'status' || key === 'q') {
      nextParams.set(key, trimmed);
    }
  });
  if (!nextParams.has('status') && !nextParams.has('q')) {
    nextParams.set('status', 'pending');
  }
  nextParams.set('applicant', 'exhibitor');

  redirect(`/admin/users?${nextParams.toString()}`);
}
