import Link from 'next/link';

const tabs = [
  { href: '/admin/content/news', label: '뉴스' },
  { href: '/admin/content/faq', label: 'FAQ' },
  { href: '/admin/content/testimonials', label: '추천사' },
  { href: '/admin/content/videos', label: '영상' },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
