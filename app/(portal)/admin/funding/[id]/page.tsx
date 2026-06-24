import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { listFundingBackers } from '@/app/actions/admin-funding';
import FundingDetailClient from './FundingDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminFundingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: project } = await db.from('funding_projects').select('*').eq('id', id).single();
  if (!project) notFound();
  const { data: tiers } = await db
    .from('reward_tiers')
    .select('*')
    .eq('project_id', id)
    .order('sort_order');
  const { pledges } = await listFundingBackers(id);
  return (
    <div className="p-6">
      <FundingDetailClient project={project} tiers={tiers ?? []} pledges={pledges} />
    </div>
  );
}
