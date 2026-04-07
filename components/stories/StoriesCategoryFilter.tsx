'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { StoryCategory } from '@/types';

const CATEGORIES: Array<{ key: StoryCategory | 'all'; label: string; labelEn: string }> = [
  { key: 'all', label: '전체', labelEn: 'All' },
  { key: 'artist-story', label: '작가를 만나다', labelEn: 'Artist Stories' },
  { key: 'buying-guide', label: '컬렉팅 시작하기', labelEn: 'Buying Guide' },
  { key: 'art-knowledge', label: '미술 산책', labelEn: 'Art Knowledge' },
];

export default function StoriesCategoryFilter({ locale }: { locale: 'ko' | 'en' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = searchParams.get('category') || 'all';

  const handleClick = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'all') {
      params.delete('category');
    } else {
      params.set('category', key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {CATEGORIES.map(({ key, label, labelEn }) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          className={clsx(
            'rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300',
            current === key
              ? 'bg-charcoal text-white shadow-md'
              : 'border border-gray-200 bg-white text-charcoal-muted hover:border-charcoal/30 hover:text-charcoal hover:shadow-sm'
          )}
        >
          {locale === 'en' ? labelEn : label}
        </button>
      ))}
    </div>
  );
}
