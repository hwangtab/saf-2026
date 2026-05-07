'use client';

import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // 활성 판정: pathname이 /stories/category/{key}로 끝나면 그 카테고리, 아니면 'all'.
  // 이전엔 /stories?category=foo query param도 지원했으나 server static 전환 위해
  // /stories/category/foo 정적 라우트로만 작동 — 양쪽 모두 SSG라 CDN HIT.
  const categoryMatch = pathname.match(/\/stories\/category\/([^/?#]+)/);
  const current = categoryMatch?.[1] ?? 'all';

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {CATEGORIES.map(({ key, label, labelEn }) => {
        const isActive = current === key;
        const displayLabel = locale === 'en' ? labelEn : label;

        return (
          <Link
            key={key}
            href={getCategoryHref(key)}
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
