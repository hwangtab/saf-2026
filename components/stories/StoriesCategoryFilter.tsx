'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Link } from '@/i18n/navigation';
import type { StoryCategory } from '@/types';

const CATEGORIES: Array<{ key: StoryCategory | 'all'; label: string; labelEn: string }> = [
  { key: 'all', label: '전체', labelEn: 'All' },
  { key: 'artist-story', label: '작가를 만나다', labelEn: 'Artist Stories' },
  { key: 'buying-guide', label: '컬렉팅 시작하기', labelEn: 'Buying Guide' },
  { key: 'art-knowledge', label: '미술 산책', labelEn: 'Art Knowledge' },
];

function getCategoryHref(key: string): string {
  if (key === 'all') return '/stories';
  return `/stories/category/${key}`;
}

export default function StoriesCategoryFilter({ locale }: { locale: 'ko' | 'en' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // /stories 페이지 내에서 query param 필터링도 유지
  const isStoriesListPage =
    pathname === '/stories' || pathname === '/en/stories' || pathname.endsWith('/stories');
  const current = searchParams.get('category') || 'all';

  const handleClick = (key: string) => {
    if (!isStoriesListPage) return; // 카테고리 전용 페이지에서는 client-side 필터 불필요
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
      {CATEGORIES.map(({ key, label, labelEn }) => {
        const isActive = isStoriesListPage ? current === key : false;
        const displayLabel = locale === 'en' ? labelEn : label;

        return (
          <Link
            key={key}
            href={getCategoryHref(key)}
            onClick={(e) => {
              if (isStoriesListPage) {
                e.preventDefault();
                handleClick(key);
              }
            }}
            className={clsx(
              'rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300',
              isActive
                ? 'bg-charcoal text-white shadow-md'
                : 'border border-gray-200 bg-white text-charcoal-muted hover:border-charcoal/30 hover:text-charcoal hover:shadow-sm'
            )}
          >
            {displayLabel}
          </Link>
        );
      })}
    </div>
  );
}
