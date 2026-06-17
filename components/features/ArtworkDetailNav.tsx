'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BackToListButton from '@/components/features/BackToListButton';

interface ArtworkDetailNavProps {
  artist: string;
  title: string;
}

// 오윤·박생광 특별전 큐레이션은 /artworks/artist/<이름>에서 dispatch 렌더된다.
// 작품 상세에서 returnTo로 이 경로가 오면 "특별전으로 돌아가기" 링크를 복원한다.
const SPECIAL_RETURN_TO = new Set(['/artworks/artist/오윤', '/artworks/artist/박생광']);

function normalizeReturnTo(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\/+$/, '');
  let decoded = normalized;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {
    decoded = normalized;
  }
  return SPECIAL_RETURN_TO.has(decoded) ? normalized : undefined;
}

export default function ArtworkDetailNav({ artist, title }: ArtworkDetailNavProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tBreadcrumbs = useTranslations('breadcrumbs');
  const t = useTranslations('artworkDetailNav');
  const normalizedReturnTo = normalizeReturnTo(searchParams.get('returnTo'));
  const listHref = normalizedReturnTo ?? '/artworks';
  const listLabel = normalizedReturnTo ? t('specialExhibition') : t('artworks');

  // 목록에서 replaceState로 URL 동기화된 history state 때문에 Next.js 기본
  // scroll-to-top이 누락되는 경우가 있음. 상세 페이지 진입/다른 작품 이동 시
  // 스크롤을 최상단으로 강제 초기화.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <nav className="border-b sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
      <div className="container-max flex items-center justify-between gap-3 py-2 md:gap-4 md:py-4">
        <BackToListButton fallbackHref={listHref} />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto whitespace-nowrap text-[11px] text-charcoal-soft md:gap-2 md:text-xs">
          <Link href="/" className="hidden transition-colors hover:text-primary-strong sm:inline">
            {tBreadcrumbs('home')}
          </Link>
          <span className="hidden sm:inline">/</span>
          <Link href={listHref} className="transition-colors hover:text-primary-strong">
            {listLabel}
          </Link>
          <span>/</span>
          <Link
            href={`/artworks/artist/${encodeURIComponent(artist)}`}
            className="transition-colors hover:text-primary-strong"
          >
            {artist}
          </Link>
          <span className="hidden sm:inline">/</span>
          <span className="hidden sm:inline text-gray-600 font-medium truncate max-w-[150px]">
            {title}
          </span>
        </div>
      </div>
    </nav>
  );
}
