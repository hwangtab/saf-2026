import { redirect } from 'next/navigation';

export default async function ContentIndexPage() {
  redirect('/admin/content/news');
}
