import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';

export default async function ContentIndexPage() {
  await requireAdmin();
  redirect('/admin/content/news');
}
