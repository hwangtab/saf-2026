'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import BackToListButton from '@/components/features/BackToListButton';

interface ArtworkDetailNavProps {
  artist: string;
  title: string;
}

function normalizeReturnTo(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\/+$/, '');
  return normalized === '/special/oh-yoon' ? normalized : undefined;
}

export default function ArtworkDetailNav({ artist, title }: ArtworkDetailNavProps) {
  const searchParams = useSearchParams();
  const normalizedReturnTo = normalizeReturnTo(searchParams.get('returnTo'));
  const listHref = normalizedReturnTo ?? '/artworks';
  const listLabel = normalizedReturnTo ? '오윤 특별전' : '출품작';

  return (
    <nav className="border-b sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
      <div className="container-max py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <BackToListButton fallbackHref={listHref} />

        <div className="flex items-center text-xs text-gray-400 gap-2 whitespace-nowrap overflow-x-auto pb-1 md:pb-0">
          <Link href="/" className="hover:text-primary transition-colors">
            홈
          </Link>
          <span>/</span>
          <Link href={listHref} className="hover:text-primary transition-colors">
            {listLabel}
          </Link>
          <span>/</span>
          <Link
            href={`/artworks/artist/${encodeURIComponent(artist)}`}
            className="hover:text-primary transition-colors"
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
