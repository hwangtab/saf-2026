import Link from 'next/link';
import { AdminCard } from '@/app/admin/_components/admin-ui';

const tabs = [
  { href: '/admin/content/news', label: '뉴스' },
  { href: '/admin/content/faq', label: 'FAQ' },
  { href: '/admin/content/testimonials', label: '추천사' },
  { href: '/admin/content/videos', label: '영상' },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <AdminCard className="p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md border border-[var(--admin-border-soft)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </AdminCard>
      {children}
    </div>
  );
}
