import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/auth/guards';
import { getNewsletter } from '@/app/actions/admin-newsletter';
import { NewsletterEditor } from './_components/NewsletterEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminNewsletterEditPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const newsletter = await getNewsletter(id);
  if (!newsletter) notFound();
  return <NewsletterEditor initial={newsletter} />;
}
